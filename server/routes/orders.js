const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { google } = require('googleapis');
const Order = require('../models/Order');
const User = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');

// Configuration Google Sheets
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_CREDENTIALS_PATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

// Helper function to get sheet data
async function getDataFromGoogleSheets() {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Feuille1!A:J'
  });
  return response.data.values;
}

// Get orders statistics
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalValue: { $sum: "$prix" },
          statsByStatus: { $push: "$statut" }
        }
      },
      {
        $project: {
          total: 1,
          totalValue: 1,
          statsByStatus: {
            $reduce: {
              input: "$statsByStatus",
              initialValue: [],
              in: {
                $concatArrays: [
                  "$$value",
                  [{
                    _id: "$$this",
                    count: {
                      $sum: {
                        $cond: [{ $eq: ["$$this", "$statsByStatus"] }, 1, 0]
                      }
                    }
                  }]
                ]
              }
            }
          }
        }
      }
    ]);

    res.json(stats[0] || { total: 0, totalValue: 0, statsByStatus: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get orders with pagination and sorting
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      limit = 5, 
      page = 1, 
      sortBy = 'dateCommande', 
      sortOrder = 'desc',
      status
    } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
    };

    const orders = await Order.find(filter, null, options)
      .populate('livreurId', 'nom prenom telephone');

    const count = await Order.countDocuments(filter);

    res.json({
      success: true,
      orders,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status
router.put('/:id/status', authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    // Validate status
    const validStatuses = ['attribué', 'livré', 'annulé'];
    if (!validStatuses.includes(status)) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Statut invalide' });
    }

    // Get order
    const order = await Order.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Authorization check
    if (req.user.role === 'livreur' && order.livreurId.toString() !== userId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Update order
    order.status = status;
    if (status === 'livré') order.dateLivraison = new Date();
    await order.save({ session });

    await session.commitTransaction();
    res.json({ success: true, order });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

// Assign orders from Google Sheets
router.post('/assign-from-sheets', authenticate, requireRole(['admin', 'closeur']), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { livreurId, sheetOrders } = req.body;

    // Validate input
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

    // Process orders
    const results = [];
    const commandesIds = [];

    for (const orderData of sheetOrders) {
      try {
        // Validate required fields
        if (!orderData.numeroCommande || !orderData.googleSheetsId) {
          throw new Error('Données de commande incomplètes');
        }

        // Prepare order document
        const orderDoc = {
          ...orderData,
          livreurId: livreur._id,
          status: 'attribué',
          dateAttribution: new Date()
        };

        // Upsert order
        const existing = await Order.findOneAndUpdate(
          { numeroCommande: orderData.numeroCommande },
          orderDoc,
          { 
            upsert: true, 
            new: true, 
            session,
            setDefaultsOnInsert: true 
          }
        );

        results.push(existing ? 'updated' : 'created');
        commandesIds.push(orderData.googleSheetsId);
      } catch (error) {
        console.error(`Erreur commande ${orderData.numeroCommande || 'inconnue'}:`, error);
        results.push('error');
      }
    }

    // Update Google Sheets
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: process.env.SHEET_ID,
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
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;