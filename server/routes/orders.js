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
router.post('/assign-from-sheets', authenticate, requireRole(['admin', 'closeur']), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('Données reçues:', JSON.stringify(req.body, null, 2));

    const { livreurId, sheetOrders } = req.body;

    // Validation renforcée
    if (!mongoose.Types.ObjectId.isValid(livreurId)) {
      throw new Error('ID livreur invalide');
    }

    if (!Array.isArray(sheetOrders)) {
      throw new Error('sheetOrders doit être un tableau');
    }

    // Vérification du livreur avec session
    const livreur = await User.findById(livreurId).session(session);
    if (!livreur || livreur.role !== 'livreur') {
      throw new Error('Livreur non valide');
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];

    // Traitement transactionnel
    for (const orderData of sheetOrders) {
      try {
        // Validation des champs obligatoires
        if (!orderData.numeroCommande) {
          throw new Error('Numéro de commande manquant');
        }

        const filter = {
          $or: [
            { numeroCommande: orderData.numeroCommande },
            { googleSheetsId: orderData.googleSheetsId }
          ]
        };

        const update = {
          $set: {
            ...orderData,
            livreurId: livreur._id,
            status: 'attribué',
            dateAttribution: new Date(),
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        };

        const options = { 
          upsert: true,
          new: true,
          session
        };

        const result = await Order.findOneAndUpdate(filter, update, options);

        if (result.$isNewRecord) {
          createdCount++;
        } else {
          updatedCount++;
        }

      } catch (error) {
        console.error('Erreur commande:', orderData.numeroCommande, error);
        errors.push({
          order: orderData.numeroCommande,
          error: error.message
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `${createdCount} créée(s), ${updatedCount} mise(s) à jour`,
      createdCount,
      updatedCount,
      errorCount: errors.length,
      errors
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Erreur globale:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
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