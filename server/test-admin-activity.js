require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');

async function testAdminActivity() {
  try {
    console.log('🧪 Test de la page d\'administration des activités...\n');

    // 1. Connexion MongoDB
    console.log('1️⃣ Connexion MongoDB...');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connecté avec succès');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error.message);
      return;
    }

    // 2. Statistiques globales
    console.log('\n2️⃣ Statistiques globales...');
    const [totalUsers, activeLivreurs, attributedOrders, deliveredOrders] = await Promise.all([
      User.countDocuments({ role: { $in: ['livreur', 'closeur'] } }),
      User.countDocuments({ role: 'livreur', isActive: true }),
      Order.countDocuments({ status: 'attribué' }),
      Order.countDocuments({ status: 'livré' })
    ]);

    console.log(`   Total utilisateurs (livreurs + closeurs): ${totalUsers}`);
    console.log(`   Livreurs actifs: ${activeLivreurs}`);
    console.log(`   Commandes attribuées: ${attributedOrders}`);
    console.log(`   Commandes livrées: ${deliveredOrders}`);

    // 3. Liste des utilisateurs avec statistiques
    console.log('\n3️⃣ Liste des utilisateurs avec statistiques...');
    const users = await User.find({ role: { $in: ['livreur', 'closeur'] } }).select('-password').lean();
    
    console.log(`   ${users.length} utilisateurs trouvés`);
    
    for (const user of users) {
      const orderFilter = {};
      
      if (user.role === 'livreur') {
        orderFilter.livreurId = user._id;
      } else if (user.role === 'closeur' && user.boutique) {
        orderFilter.boutique = user.boutique;
      }

      const [totalOrders, deliveredOrders, pendingOrders, attributedOrders] = await Promise.all([
        Order.countDocuments(orderFilter),
        Order.countDocuments({ ...orderFilter, status: 'livré' }),
        Order.countDocuments({ ...orderFilter, status: 'en_attente' }),
        Order.countDocuments({ ...orderFilter, status: 'attribué' })
      ]);

      console.log(`   ${user.prenom} ${user.nom} (${user.role}):`);
      console.log(`     - Total: ${totalOrders} | Livrées: ${deliveredOrders} | En attente: ${pendingOrders} | Attribuées: ${attributedOrders}`);
    }

    // 4. Activités récentes
    console.log('\n4️⃣ Activités récentes...');
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
      },
      { $sort: { createdAt: -1 } },
      { $limit: 10 }
    ];

    const activities = await Order.aggregate(pipeline);
    console.log(`   ${activities.length} activités récentes trouvées`);
    
    activities.forEach((activity, index) => {
      console.log(`   ${index + 1}. ${activity.user?.prenom} ${activity.user?.nom} (${activity.user?.role}) - ${activity.action} - ${activity.numeroCommande}`);
    });

    // 5. Test des filtres
    console.log('\n5️⃣ Test des filtres...');
    
    // Filtre par type d'utilisateur
    const livreurs = users.filter(u => u.role === 'livreur');
    const closeurs = users.filter(u => u.role === 'closeur');
    console.log(`   Livreurs: ${livreurs.length}`);
    console.log(`   Closeurs: ${closeurs.length}`);

    // Filtre par date (7 derniers jours)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentOrders = await Order.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    console.log(`   Commandes des 7 derniers jours: ${recentOrders}`);

    // Filtre par statut
    const statusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('   Répartition par statut:');
    statusCounts.forEach(stat => {
      console.log(`     - ${stat._id}: ${stat.count}`);
    });

    // 6. Test des statistiques par utilisateur
    console.log('\n6️⃣ Test des statistiques par utilisateur...');
    for (const user of users.slice(0, 3)) { // Test avec les 3 premiers utilisateurs
      const orderFilter = {};
      
      if (user.role === 'livreur') {
        orderFilter.livreurId = user._id;
      } else if (user.role === 'closeur' && user.boutique) {
        orderFilter.boutique = user.boutique;
      }

      const [totalOrders, deliveredOrders, pendingOrders, attributedOrders] = await Promise.all([
        Order.countDocuments(orderFilter),
        Order.countDocuments({ ...orderFilter, status: 'livré' }),
        Order.countDocuments({ ...orderFilter, status: 'en_attente' }),
        Order.countDocuments({ ...orderFilter, status: 'attribué' })
      ]);

      console.log(`   ${user.prenom} ${user.nom}:`);
      console.log(`     - Total: ${totalOrders}`);
      console.log(`     - Livrées: ${deliveredOrders}`);
      console.log(`     - En attente: ${pendingOrders}`);
      console.log(`     - Attribuées: ${attributedOrders}`);
    }

    // 7. Vérification de la cohérence des données
    console.log('\n7️⃣ Vérification de la cohérence des données...');
    
    const totalOrdersInDB = await Order.countDocuments();
    const ordersWithLivreur = await Order.countDocuments({ livreurId: { $exists: true, $ne: null } });
    const ordersWithBoutique = await Order.countDocuments({ boutique: { $exists: true, $ne: null } });
    
    console.log(`   Total commandes en base: ${totalOrdersInDB}`);
    console.log(`   Commandes avec livreur: ${ordersWithLivreur}`);
    console.log(`   Commandes avec boutique: ${ordersWithBoutique}`);

    // 8. Recommandations
    console.log('\n8️⃣ Recommandations...');
    
    if (users.length === 0) {
      console.log('⚠️ Aucun utilisateur trouvé');
      console.log('💡 Créez des utilisateurs livreurs et closeurs pour tester');
    } else {
      console.log('✅ Utilisateurs trouvés, la page d\'administration peut fonctionner');
    }

    if (activities.length === 0) {
      console.log('⚠️ Aucune activité récente trouvée');
      console.log('💡 Créez des commandes pour voir les activités');
    } else {
      console.log('✅ Activités trouvées, la surveillance fonctionne');
    }

    if (activeLivreurs === 0) {
      console.log('⚠️ Aucun livreur actif');
      console.log('💡 Activez des livreurs pour les voir dans les statistiques');
    }

    console.log('\n🎉 Test de la page d\'administration terminé !');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
    console.error('Stack:', error.stack);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('\n🔌 Déconnecté de MongoDB');
    } catch (error) {
      console.log('⚠️ Erreur lors de la déconnexion MongoDB');
    }
  }
}

// Exécuter le test
if (require.main === module) {
  testAdminActivity();
}

module.exports = testAdminActivity;
