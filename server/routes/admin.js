const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/admin/users - Liste des utilisateurs avec statistiques
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userType, dateRange } = req.query;
    
    // Filtres de base
    const userFilter = {};
    if (userType && userType !== 'all') {
      userFilter.role = userType;
    }

    // Récupérer les utilisateurs
    const users = await User.find(userFilter).select('-password').lean();

    // Calculer les statistiques pour chaque utilisateur
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // Filtrer par date si spécifié
        const dateFilter = {};
        if (dateRange && dateRange !== 'all') {
          const days = parseInt(dateRange.replace('days', ''));
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          dateFilter.createdAt = { $gte: startDate };
        }

        let count = 0;
        let statsType = '';

        if (user.role === 'livreur') {
          // Pour les livreurs: compter les commandes livrées
          count = await Order.countDocuments({
            ...dateFilter,
            livreurId: user._id,
            status: 'livré'
          });
          statsType = 'livraisons';
        } else if (user.role === 'closeur' && user.boutique) {
          // Pour les closeurs: compter les commandes attribuées de leur boutique
          count = await Order.countDocuments({
            ...dateFilter,
            boutique: user.boutique,
            status: 'attribué'
          });
          statsType = 'attributions';
        }

        return {
          ...user,
          stats: {
            count: count || 0,
            type: statsType
          }
        };
      })
    );

    res.json({
      success: true,
      users: usersWithStats
    });
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des utilisateurs' 
    });
  }
});

// GET /api/admin/stats - Statistiques globales
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const { dateRange } = req.query;
    
    // Filtres de date
    const dateFilter = {};
    if (dateRange && dateRange !== 'all') {
      const days = parseInt(dateRange.replace('days', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter.createdAt = { $gte: startDate };
    }

    // Statistiques des utilisateurs
    const [totalUsers, livreurs, closeurs] = await Promise.all([
      User.countDocuments({ role: { $in: ['livreur', 'closeur'] } }),
      User.countDocuments({ role: 'livreur' }),
      User.countDocuments({ role: 'closeur' })
    ]);

    // Statistiques des commandes
    const [livraisons, attributions] = await Promise.all([
      Order.countDocuments({ ...dateFilter, status: 'livré' }),
      Order.countDocuments({ ...dateFilter, status: 'attribué' })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        livreurs,
        closeurs,
        livraisons,
        attributions
      }
    });
  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des statistiques' 
    });
  }
});

// GET /api/admin/activities - Activités récentes
router.get('/activities', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userType, dateRange, status } = req.query;
    
    // Construire le pipeline d'agrégation
    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'livreurId',
          foreignField: '_id',
          as: 'livreur'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'closeurId',
          foreignField: '_id',
          as: 'closeur'
        }
      },
      {
        $addFields: {
          user: {
            $cond: {
              if: { $gt: [{ $size: '$livreur' }, 0] },
              then: { $arrayElemAt: ['$livreur', 0] },
              else: { $arrayElemAt: ['$closeur', 0] }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          numeroCommande: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          'user._id': 1,
          'user.prenom': 1,
          'user.nom': 1,
          'user.role': 1,
          action: {
            $cond: {
              if: { $eq: ['$status', 'livré'] },
              then: 'Commande livrée',
              else: {
                $cond: {
                  if: { $eq: ['$status', 'attribué'] },
                  then: 'Commande attribuée',
                  else: {
                    $cond: {
                      if: { $eq: ['$status', 'annulé'] },
                      then: 'Commande annulée',
                      else: 'Commande créée'
                    }
                  }
                }
              }
            }
          }
        }
      }
    ];

    // Ajouter les filtres
    const matchStage = {};

    if (userType && userType !== 'all') {
      matchStage['user.role'] = userType;
    }

    if (status && status !== 'all') {
      matchStage.status = status;
    }

    if (dateRange && dateRange !== 'all') {
      const days = parseInt(dateRange.replace('days', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      matchStage.createdAt = { $gte: startDate };
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.unshift({ $match: matchStage });
    }

    // Ajouter le tri et la limite
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $limit: 100 }
    );

    const activities = await Order.aggregate(pipeline);

    res.json({
      success: true,
      activities
    });
  } catch (error) {
    console.error('Erreur récupération activités:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des activités' 
    });
  }
});

// Autres routes restent inchangées...
module.exports = router;