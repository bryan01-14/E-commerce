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
  try {
    const { livreurId, sheetOrders } = req.body;

    // Validation des champs obligatoires
    const validOrders = sheetOrders.filter(order => 
      order.numeroCommande && 
      order.clientNom &&
      order.adresseLivraison
    );

    if (validOrders.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune commande valide à traiter'
      });
    }

    // Traitement
    const results = await Promise.all(validOrders.map(async (order) => {
      const orderData = {
        ...order,
        livreurId,
        status: 'attribué',
        dateAttribution: new Date()
      };

      const existing = await Order.findOne({
        $or: [
          { numeroCommande: order.numeroCommande },
          { googleSheetsId: order.googleSheetsId }
        ]
      });

      if (existing) {
        await Order.updateOne({ _id: existing._id }, orderData);
        return { action: 'updated' };
      } else {
        await Order.create(orderData);
        return { action: 'created' };
      }
    }));

    const createdCount = results.filter(r => r.action === 'created').length;
    const updatedCount = results.filter(r => r.action === 'updated').length;

    return res.json({
      success: true,
      message: `${createdCount} commande(s) traitées avec succès`,
      createdCount,
      updatedCount
    });

  } catch (error) {
    console.error('Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur de traitement'
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