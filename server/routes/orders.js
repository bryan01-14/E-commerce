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

// =====================
// Routes attendues par le Dashboard
// =====================

// GET /api/orders - Liste paginée des commandes récentes
router.get('/', authenticate, requireRole(['admin', 'closeur', 'livreur']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'dateCommande',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Filtrage selon rôle
    const filter = {};
    if (req.user.role === 'livreur') {
      filter.livreurId = req.user._id;
    } else if (req.user.role === 'closeur' && req.user.boutique) {
      filter.boutique = req.user.boutique;
    }

    const sortOptions = { [sortBy]: sortDirection };

    const docs = await Order.find(filter)
      .sort(sortOptions)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Adapter le format attendu par le front (compatibilité)
    const orders = docs.map((o) => {
      const firstProduct = Array.isArray(o.produits) && o.produits.length > 0 ? o.produits[0] : null;
      const statutMap = {
        'livré': 'Livré',
        'en_attente': 'En attente',
        'attribué': 'Attribué',
        'annulé': 'Non Livré'
      };
      return {
        _id: o._id,
        numeroCommande: o.numeroCommande,
        nomClient: o.clientNom,
        telephone: o.clientTelephone,
        produit: firstProduct ? firstProduct.nom : '',
        quantite: firstProduct ? firstProduct.quantite : 0,
        prix: firstProduct ? firstProduct.prix : 0,
        dateCommande: o.dateCommande,
        statut: statutMap[o.status] || o.status,
        boutique: o.boutique
      };
    });

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Erreur liste commandes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/orders/stats/overview - Statistiques pour le dashboard
router.get('/stats/overview', authenticate, requireRole(['admin', 'closeur', 'livreur']), async (req, res) => {
  try {
    const match = {};
    if (req.user.role === 'livreur') {
      match.livreurId = req.user._id;
    } else if (req.user.role === 'closeur' && req.user.boutique) {
      match.boutique = req.user.boutique;
    }

    const [byStatus, totals] = await Promise.all([
      Order.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: match },
        { $unwind: { path: '$produits', preserveNullAndEmptyArrays: true } },
        { $group: { _id: null, total: { $sum: 1 }, totalValue: { $sum: { $multiply: [ { $ifNull: ['$produits.prix', 0] }, { $ifNull: ['$produits.quantite', 0] } ] } } } }
      ])
    ]);

    const statutLabel = (s) => ({
      'livré': 'Livré',
      'en_attente': 'En attente',
      'attribué': 'Attribué',
      'annulé': 'Non Livré'
    }[s] || s);

    const statsByStatus = byStatus.map(s => ({ _id: statutLabel(s._id), count: s.count }));
    const total = totals[0]?.total || 0;
    const totalValue = totals[0]?.totalValue || 0;

    res.json({
      total,
      totalValue,
      statsByStatus
    });
  } catch (error) {
    console.error('Erreur stats overview:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// =====================
// Mise à jour du statut d'une commande (livreur/admin/closeur)
// =====================
router.put('/:id/status', authenticate, requireRole(['admin', 'closeur', 'livreur']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de commande invalide' });
    }

    const allowedStatuses = ['en_cours', 'livré', 'annulé', 'attribué'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Contrôle d'accès: un livreur ne peut mettre à jour que ses propres commandes
    if (req.user.role === 'livreur' && order.livreurId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    order.status = status;
    if (status !== 'en_attente') {
      order.dateAttribution = order.dateAttribution || new Date();
      if (!order.livreurId && req.user.role === 'livreur') {
        order.livreurId = req.user._id;
      }
    }
    await order.save();

    // Notifier via Socket.IO si disponible
    const io = req.app.get('io');
    if (io) {
      io.emit('orderUpdated', order.toObject());
      if (status === 'livré') {
        io.emit('order-delivered', { order: order.toObject() });
      }
    }

    res.json({ message: 'Statut mis à jour', order });
  } catch (error) {
    console.error('Erreur mise à jour statut:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});