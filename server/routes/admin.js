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
        const orderFilter = {};
        
        // Filtrer par rôle
        if (user.role === 'livreur') {
          orderFilter.livreurId = user._id;
        } else if (user.role === 'closeur' && user.boutique) {
          orderFilter.boutique = user.boutique;
        }

        // Filtrer par date si spécifié
        if (dateRange && dateRange !== 'all') {
          const days = parseInt(dateRange.replace('days', ''));
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          orderFilter.createdAt = { $gte: startDate };
        }

        // Calculer les statistiques
        const [totalOrders, deliveredOrders, pendingOrders, attributedOrders] = await Promise.all([
          Order.countDocuments(orderFilter),
          Order.countDocuments({ ...orderFilter, status: 'livré' }),
          Order.countDocuments({ ...orderFilter, status: 'en_attente' }),
          Order.countDocuments({ ...orderFilter, status: 'attribué' })
        ]);

        return {
          ...user,
          stats: {
            totalOrders,
            deliveredOrders,
            pendingOrders,
            attributedOrders
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
    const [totalUsers, activeLivreurs] = await Promise.all([
      User.countDocuments({ role: { $in: ['livreur', 'closeur'] } }),
      User.countDocuments({ role: 'livreur', isActive: true })
    ]);

    // Statistiques des commandes
    const [attributedOrders, deliveredOrders] = await Promise.all([
      Order.countDocuments({ ...dateFilter, status: 'attribué' }),
      Order.countDocuments({ ...dateFilter, status: 'livré' })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeLivreurs,
        attributedOrders,
        deliveredOrders
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

// GET /api/admin/user/:id/activities - Activités d'un utilisateur spécifique
router.get('/user/:id/activities', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID utilisateur invalide' 
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Utilisateur non trouvé' 
      });
    }

    // Construire le filtre selon le rôle
    const orderFilter = {};
    if (user.role === 'livreur') {
      orderFilter.livreurId = user._id;
    } else if (user.role === 'closeur' && user.boutique) {
      orderFilter.boutique = user.boutique;
    }

    const activities = await Order.find(orderFilter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      activities: activities.map(order => ({
        _id: order._id,
        numeroCommande: order.numeroCommande,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        action: order.status === 'livré' ? 'Commande livrée' : 
                order.status === 'attribué' ? 'Commande attribuée' :
                order.status === 'annulé' ? 'Commande annulée' : 'Commande créée'
      }))
    });
  } catch (error) {
    console.error('Erreur récupération activités utilisateur:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des activités' 
    });
  }
});

// GET /api/admin/user/:id/stats - Statistiques d'un utilisateur spécifique
router.get('/user/:id/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID utilisateur invalide' 
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Utilisateur non trouvé' 
      });
    }

    // Filtres de base
    const orderFilter = {};
    if (user.role === 'livreur') {
      orderFilter.livreurId = user._id;
    } else if (user.role === 'closeur' && user.boutique) {
      orderFilter.boutique = user.boutique;
    }

    // Filtres de date
    if (dateRange && dateRange !== 'all') {
      const days = parseInt(dateRange.replace('days', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      orderFilter.createdAt = { $gte: startDate };
    }

    // Calculer les statistiques
    const [totalOrders, deliveredOrders, pendingOrders, attributedOrders] = await Promise.all([
      Order.countDocuments(orderFilter),
      Order.countDocuments({ ...orderFilter, status: 'livré' }),
      Order.countDocuments({ ...orderFilter, status: 'en_attente' }),
      Order.countDocuments({ ...orderFilter, status: 'attribué' })
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        deliveredOrders,
        pendingOrders,
        attributedOrders
      }
    });
  } catch (error) {
    console.error('Erreur récupération statistiques utilisateur:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des statistiques' 
    });
  }
});

module.exports = router;
