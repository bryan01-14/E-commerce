require('dotenv').config();
const mongoose = require('mongoose');
const GoogleSheetsConfig = require('./models/GoogleSheetsConfig');
const Order = require('./models/Order');
const sheetsService = require('./services/googleSheets');

async function diagnoseSync() {
  try {
    console.log('🔍 Diagnostic de la synchronisation Google Sheets...\n');

    // 1. Vérifier la connexion MongoDB
    console.log('1️⃣ Test de connexion MongoDB...');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connecté avec succès');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error.message);
      return;
    }

    // 2. Vérifier les variables d'environnement
    console.log('\n2️⃣ Vérification des variables d\'environnement...');
    const requiredVars = [
      'MONGODB_URI',
      'GOOGLE_SHEETS_PRIVATE_KEY',
      'GOOGLE_SHEETS_CLIENT_EMAIL',
      'GOOGLE_SHEETS_PROJECT_ID'
    ];

    const missingVars = [];
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
        console.log(`❌ ${varName}: MANQUANT`);
      } else {
        console.log(`✅ ${varName}: DÉFINI`);
      }
    });

    if (missingVars.length > 0) {
      console.log(`\n⚠️ Variables manquantes: ${missingVars.join(', ')}`);
      console.log('   Configurez ces variables dans votre fichier .env');
    }

    // 3. Vérifier les configurations Google Sheets
    console.log('\n3️⃣ Vérification des configurations Google Sheets...');
    try {
      const configs = await GoogleSheetsConfig.find();
      console.log(`✅ ${configs.length} configuration(s) trouvée(s)`);
      
      if (configs.length === 0) {
        console.log('⚠️ Aucune configuration trouvée');
      } else {
        configs.forEach((config, index) => {
          console.log(`   ${index + 1}. ${config.name} (${config.isActive ? 'ACTIVE' : 'inactive'})`);
          console.log(`      Spreadsheet ID: ${config.spreadsheetId}`);
          console.log(`      Feuille: ${config.sheetName}`);
        });
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des configurations:', error.message);
    }

    // 4. Vérifier la configuration active
    console.log('\n4️⃣ Vérification de la configuration active...');
    try {
      const activeConfig = await GoogleSheetsConfig.findOne({ isActive: true });
      if (activeConfig) {
        console.log(`✅ Configuration active: ${activeConfig.name}`);
        console.log(`   Spreadsheet ID: ${activeConfig.spreadsheetId}`);
        console.log(`   Feuille: ${activeConfig.sheetName}`);
      } else {
        console.log('⚠️ Aucune configuration active trouvée');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de la configuration active:', error.message);
    }

    // 5. Test du service Google Sheets
    console.log('\n5️⃣ Test du service Google Sheets...');
    try {
      await sheetsService.initialize();
      console.log('✅ Service Google Sheets initialisé');
      
      const currentConfig = await sheetsService.getCurrentConfig();
      console.log(`✅ Configuration actuelle récupérée: ${currentConfig.name}`);
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du service:', error.message);
      console.error('   Stack:', error.stack);
    }

    // 6. Vérifier les commandes existantes
    console.log('\n6️⃣ Vérification des commandes existantes...');
    try {
      const orders = await Order.find();
      console.log(`✅ ${orders.length} commande(s) trouvée(s) dans la base de données`);
      
      if (orders.length > 0) {
        console.log('   Exemples:');
        orders.slice(0, 3).forEach((order, index) => {
          console.log(`      ${index + 1}. Commande #${order.numeroCommande} - ${order.clientNom}`);
        });
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des commandes:', error.message);
    }

    // 7. Test de synchronisation (si possible)
    console.log('\n7️⃣ Test de synchronisation...');
    try {
      if (process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
        const syncResult = await sheetsService.forceSyncOrders();
        console.log('✅ Synchronisation réussie');
        console.log(`   Nouvelles commandes: ${syncResult.created}`);
        console.log(`   Commandes mises à jour: ${syncResult.updated}`);
        console.log(`   Total traité: ${syncResult.total}`);
      } else {
        console.log('⚠️ Credentials Google Sheets non configurés, test de synchronisation ignoré');
      }
    } catch (error) {
      console.error('❌ Erreur lors du test de synchronisation:', error.message);
      console.error('   Stack:', error.stack);
    }

    // 8. Résumé et recommandations
    console.log('\n📋 Résumé du diagnostic:');
    console.log('   - MongoDB: ✅');
    console.log('   - Variables d\'environnement: ' + (missingVars.length === 0 ? '✅' : '⚠️'));
    console.log('   - Configurations: ' + (configs?.length > 0 ? '✅' : '⚠️'));
    console.log('   - Configuration active: ' + (activeConfig ? '✅' : '⚠️'));
    console.log('   - Service Google Sheets: ' + (sheetsService.isInitialized ? '✅' : '⚠️'));
    console.log('   - Commandes: ✅');

    if (missingVars.length > 0) {
      console.log('\n🚨 Actions recommandées:');
      console.log('   1. Configurez les variables manquantes dans votre fichier .env');
      console.log('   2. Redémarrez le serveur');
      console.log('   3. Relancez ce diagnostic');
    }

    console.log('\n🎉 Diagnostic terminé !');

  } catch (error) {
    console.error('\n❌ Erreur lors du diagnostic:', error);
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

// Exécuter le diagnostic si le script est appelé directement
if (require.main === module) {
  diagnoseSync();
}

module.exports = diagnoseSync;
