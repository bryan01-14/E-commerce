const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');

// Synchronisation depuis Google Sheets
router.get('/google-sheets/data', authenticate, requireRole(['admin', 'closeur']), async (req, res) => {
  try {
    // Implémentez ici votre logique de récupération depuis Google Sheets
    const sheetData = await getDataFromGoogleSheets(); // À remplacer par votre implémentation
    
    res.json({
      success: true,
      data: sheetData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur de synchronisation',
      details: error.message
    });
  }
});

// Attribution des commandes (création en base)
// Attribution des commandes
router.post('/assign-from-sheets', authenticate, requireRole(['admin', 'closeur']), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { livreurId, sheetOrders } = req.body;

    // Validation
    if (!mongoose.Types.ObjectId.isValid(livreurId)) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'ID livreur invalide' });
    }

    const livreur = await User.findById(livreurId).session(session);
    if (!livreur || livreur.role !== 'livreur') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Livreur non valide' });
    }

    if (!Array.isArray(sheetOrders) || sheetOrders.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Aucune commande à traiter' });
    }

    // Traitement des commandes
    const results = [];
    const commandesIds = [];

    for (const orderData of sheetOrders) {
      try {
        // Validation des données
        if (!orderData.numeroCommande || !orderData.googleSheetsId) {
          throw new Error('Données de commande incomplètes');
        }

        // Création/MAJ en base
        const orderDoc = {
          ...orderData,
          livreurId: livreur._id,
          status: 'attribué',
          dateAttribution: new Date()
        };

        const existing = await Order.findOneAndUpdate(
          { numeroCommande: orderData.numeroCommande },
          orderDoc,
          { upsert: true, new: true, session }
        );

        results.push(existing ? 'updated' : 'created');
        commandesIds.push(orderData.googleSheetsId);
      } catch (error) {
        console.error(`Erreur commande ${orderData.numeroCommande || 'inconnue'}:`, error);
        results.push('error');
      }
    }

    // Mise à jour Google Sheets
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.SHEET_ID;
      
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          valueInputOption: 'USER_ENTERED',
          data: commandesIds.map(id => ({
            range: `Feuille1!K${id}:K${id}`,
            values: [['Attribué']]
          }))
        }
      });
    } catch (error) {
      console.error('Erreur mise à jour Google Sheets:', error);
      await session.abortTransaction();
      return res.status(500).json({ error: 'Erreur mise à jour Google Sheets' });
    }

    await session.commitTransaction();
    
    const createdCount = results.filter(r => r === 'created').length;
    const updatedCount = results.filter(r => r === 'updated').length;
    
    res.json({
      success: true,
      message: `${createdCount} commande(s) créée(s), ${updatedCount} mise(s) à jour`,
      updatedInSheet: commandesIds.length
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Erreur globale:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
});

// Ajoutez cette nouvelle route pour mettre à jour le statut d'une commande
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, livreurId } = req.body;

    // Validation du statut
    const validStatuses = ['attribué', 'livré', 'annulé'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    // Vérifier que le livreur ne peut modifier que ses propres commandes
    if (req.user.role === 'livreur' && req.user._id.toString() !== livreurId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const updateData = { 
      status,
      ...(status === 'livré' && { dateLivraison: new Date() })
    };

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('livreurId', 'nom prenom telephone');

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    res.json({ 
      success: true, 
      order: updatedOrder 
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
// Route pour les statistiques
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalValue: { $sum: "$prix" }
        }
      },
      {
        $lookup: {
          from: "orders",
          pipeline: [
            { $group: { _id: "$statut", count: { $sum: 1 } } }
          ],
          as: "statsByStatus"
        }
      }
    ]);

    res.json(stats[0] || { total: 0, totalValue: 0, statsByStatus: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route pour les commandes récentes
router.get('/orders', async (req, res) => {
  try {
    const { limit = 5, sortBy = 'dateCommande', sortOrder = 'desc' } = req.query;
    
    const orders = await Order.find()
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit));

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtenir les commandes attribuées
router.get('/assigned', authenticate, requireRole(['admin', 'closeur', 'livreur']), async (req, res) => {
  try {
    const filter = { status: 'attribué' };
    
    // Filtre par livreur si l'utilisateur est un livreur
    if (req.user.role === 'livreur') {
      filter.livreurId = req.user._id;
    }
    // Filtre par boutique si l'utilisateur est un closeur
    else if (req.user.role === 'closeur' && req.user.boutique) {
      filter.boutique = req.user.boutique;
    }

    const orders = await Order.find(filter)
      .populate('livreurId', 'nom prenom telephone')
      .sort({ dateAttribution: -1 })
      .limit(100);

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur'
    });
  }
});

module.exports = router;