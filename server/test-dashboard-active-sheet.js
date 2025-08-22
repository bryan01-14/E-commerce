require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');
const GoogleSheetsConfig = require('./models/GoogleSheetsConfig');

async function testDashboardActiveSheet() {
  try {
    console.log('🧪 Test du Dashboard avec configuration active...\n');

    // 1. Connexion MongoDB
    console.log('1️⃣ Connexion MongoDB...');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connecté avec succès');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error.message);
      return;
    }

    // 2. Récupération de la configuration active
    console.log('\n2️⃣ Récupération de la configuration active...');
    const activeConfig = await GoogleSheetsConfig.findOne({ isActive: true });
    
    if (activeConfig) {
      console.log(`✅ Configuration active: ${activeConfig.name}`);
      console.log(`   Spreadsheet ID: ${activeConfig.spreadsheetId}`);
      console.log(`   Nom de feuille: "${activeConfig.sheetName}"`);
    } else {
      console.log('⚠️ Aucune configuration active trouvée');
    }

    // 3. Statistiques globales (toutes les commandes)
    console.log('\n3️⃣ Statistiques globales (toutes les commandes)...');
    const globalStats = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const globalTotal = globalStats.reduce((sum, stat) => sum + stat.count, 0);
    console.log(`   Total global: ${globalTotal} commandes`);
    globalStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} commandes`);
    });

    // 4. Statistiques de la configuration active
    console.log('\n4️⃣ Statistiques de la configuration active...');
    if (activeConfig) {
      const activeStats = await Order.aggregate([
        { $match: { activeSheetConfig: activeConfig._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      
      const activeTotal = activeStats.reduce((sum, stat) => sum + stat.count, 0);
      console.log(`   Total configuration active: ${activeTotal} commandes`);
      
      if (activeStats.length > 0) {
        activeStats.forEach(stat => {
          console.log(`   ${stat._id}: ${stat.count} commandes`);
        });
      } else {
        console.log('   Aucune commande trouvée pour cette configuration');
      }
      
      // Calculer le pourcentage
      const percentage = globalTotal > 0 ? ((activeTotal / globalTotal) * 100).toFixed(1) : 0;
      console.log(`   Pourcentage: ${percentage}% des commandes totales`);
      
    } else {
      console.log('   Impossible de calculer les statistiques sans configuration active');
    }

    // 5. Commandes récentes de la configuration active
    console.log('\n5️⃣ Commandes récentes de la configuration active...');
    if (activeConfig) {
      const recentOrders = await Order.find({ activeSheetConfig: activeConfig._id })
        .sort({ dateCommande: -1 })
        .limit(5)
        .lean();
      
      console.log(`   ${recentOrders.length} commandes récentes trouvées`);
      
      recentOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.numeroCommande} - ${order.clientNom} - ${order.status}`);
      });
    } else {
      console.log('   Impossible de récupérer les commandes récentes sans configuration active');
    }

    // 6. Vérification de la cohérence des données
    console.log('\n6️⃣ Vérification de la cohérence des données...');
    
    // Compter les commandes avec activeSheetConfig
    const ordersWithConfig = await Order.countDocuments({ activeSheetConfig: { $exists: true, $ne: null } });
    console.log(`   Commandes avec configuration: ${ordersWithConfig}`);
    
    // Compter les commandes sans activeSheetConfig
    const ordersWithoutConfig = await Order.countDocuments({ 
      $or: [
        { activeSheetConfig: { $exists: false } },
        { activeSheetConfig: null }
      ]
    });
    console.log(`   Commandes sans configuration: ${ordersWithoutConfig}`);
    
    // Vérifier la cohérence
    const totalInDB = await Order.countDocuments();
    const calculatedTotal = ordersWithConfig + ordersWithoutConfig;
    
    if (totalInDB === calculatedTotal) {
      console.log('✅ Cohérence des données vérifiée');
    } else {
      console.log('❌ Incohérence détectée dans les données');
      console.log(`   Total en base: ${totalInDB}`);
      console.log(`   Total calculé: ${calculatedTotal}`);
    }

    // 7. Recommandations
    console.log('\n7️⃣ Recommandations...');
    
    if (activeConfig) {
      if (ordersWithConfig === 0) {
        console.log('⚠️ Aucune commande liée à la configuration active');
        console.log('💡 Synchronisez les données de la configuration active');
      } else if (ordersWithoutConfig > 0) {
        console.log('⚠️ Des commandes existent sans configuration active');
        console.log('💡 Considérez migrer les anciennes commandes vers la configuration active');
      } else {
        console.log('✅ Toutes les commandes sont liées à la configuration active');
      }
    } else {
      console.log('⚠️ Aucune configuration active');
      console.log('💡 Activez une configuration Google Sheets pour filtrer les données');
    }

    console.log('\n🎉 Test du Dashboard terminé !');

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
  testDashboardActiveSheet();
}

module.exports = testDashboardActiveSheet;
