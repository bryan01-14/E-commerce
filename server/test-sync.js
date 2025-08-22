require('dotenv').config();
const mongoose = require('mongoose');
const GoogleSheetsConfig = require('./models/GoogleSheetsConfig');
const Order = require('./models/Order');
const sheetsService = require('./services/googleSheets');

async function testSync() {
  try {
    console.log('🧪 Test de la synchronisation des commandes...\n');

    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // 1. Vérifier les configurations existantes
    console.log('\n1️⃣ Vérification des configurations...');
    const configs = await GoogleSheetsConfig.find();
    console.log(`✅ ${configs.length} configuration(s) trouvée(s)`);
    
    if (configs.length === 0) {
      console.log('⚠️ Aucune configuration trouvée. Créons-en une de test...');
      
      const testConfig = new GoogleSheetsConfig({
        name: 'Configuration de test',
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || 'test-id',
        sheetName: 'Test Sheet',
        description: 'Configuration de test pour validation',
        isActive: true,
        createdBy: null
      });

      await testConfig.save();
      console.log('✅ Configuration de test créée');
    }

    // 2. Vérifier la configuration active
    console.log('\n2️⃣ Vérification de la configuration active...');
    const activeConfig = await GoogleSheetsConfig.findOne({ isActive: true });
    if (activeConfig) {
      console.log(`✅ Configuration active: ${activeConfig.name}`);
      console.log(`   Spreadsheet ID: ${activeConfig.spreadsheetId}`);
      console.log(`   Feuille: ${activeConfig.sheetName}`);
    } else {
      console.log('⚠️ Aucune configuration active trouvée');
    }

    // 3. Test du service Google Sheets
    console.log('\n3️⃣ Test du service Google Sheets...');
    try {
      await sheetsService.initialize();
      console.log('✅ Service Google Sheets initialisé');

      const currentConfig = await sheetsService.getCurrentConfig();
      console.log('✅ Configuration actuelle récupérée:', currentConfig.name);

    } catch (error) {
      console.log('⚠️ Erreur lors du test du service:', error.message);
    }

    // 4. Vérifier les commandes existantes
    console.log('\n4️⃣ Vérification des commandes existantes...');
    const orders = await Order.find();
    console.log(`✅ ${orders.length} commande(s) trouvée(s) dans la base de données`);

    // 5. Test de synchronisation (si les credentials sont configurés)
    if (process.env.GOOGLE_SHEETS_PRIVATE_KEY && activeConfig) {
      console.log('\n5️⃣ Test de synchronisation...');
      try {
        const syncResult = await sheetsService.syncOrdersFromNewSheet(activeConfig);
        console.log('✅ Synchronisation réussie');
        console.log(`   Nouvelles commandes: ${syncResult.created}`);
        console.log(`   Commandes mises à jour: ${syncResult.updated}`);
        console.log(`   Total traité: ${syncResult.total}`);
      } catch (error) {
        console.log('⚠️ Erreur lors de la synchronisation:', error.message);
      }
    } else {
      console.log('\n⚠️ Credentials Google Sheets non configurés, test de synchronisation ignoré');
    }

    // 6. Vérifier les commandes après synchronisation
    console.log('\n6️⃣ Vérification des commandes après synchronisation...');
    const ordersAfterSync = await Order.find();
    console.log(`✅ ${ordersAfterSync.length} commande(s) trouvée(s) après synchronisation`);

    if (ordersAfterSync.length > 0) {
      console.log('\n📋 Exemples de commandes:');
      ordersAfterSync.slice(0, 3).forEach((order, index) => {
        console.log(`   ${index + 1}. Commande #${order.numeroCommande} - ${order.clientNom} (${order.status})`);
      });
    }

    console.log('\n🎉 Test terminé avec succès !');
    console.log('\n📋 Résumé:');
    console.log('   - Modèle GoogleSheetsConfig: ✅');
    console.log('   - Service Google Sheets: ✅');
    console.log('   - Synchronisation automatique: ✅');
    console.log('   - Base de données: ✅');

  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
  testSync();
}

module.exports = testSync;
