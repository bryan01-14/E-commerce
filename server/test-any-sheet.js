require('dotenv').config();
const mongoose = require('mongoose');
const sheetsService = require('./services/googleSheets');

async function testAnySheet() {
  try {
    console.log('🧪 Test de n\'importe quel nom de feuille Google Sheets...\n');

    // 1. Connexion MongoDB
    console.log('1️⃣ Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');

    // 2. Initialisation du service
    console.log('\n2️⃣ Initialisation du service Google Sheets...');
    await sheetsService.initialize();
    console.log('✅ Service initialisé');

    // 3. Récupération de la configuration active
    console.log('\n3️⃣ Récupération de la configuration active...');
    const config = await sheetsService.getCurrentConfig();
    if (!config) {
      throw new Error('Aucune configuration active trouvée');
    }
    console.log(`📋 Configuration active: ${config.name}`);
    console.log(`   Spreadsheet ID: ${config.spreadsheetId}`);

    // 4. Test avec différents noms de feuilles
    console.log('\n4️⃣ Test avec différents noms de feuilles...');
    
    const testSheetNames = [
      'Feuille 1',
      'Feuille 2', 
      'Feuille-3',
      '1_Commande',
      'Commandes',
      'Sheet1',
      'Feuille avec espaces',
      'Feuille-avec-tirets',
      'Feuille_avec_underscores',
      'Feuille avec caractères spéciaux !@#'
    ];

    for (const sheetName of testSheetNames) {
      console.log(`\n🔍 Test de la feuille: "${sheetName}"`);
      
      try {
        // Test d'accès
        const accessResult = await sheetsService.testAccess(config.spreadsheetId, sheetName);
        console.log(`   ✅ Accès réussi`);
        
        // Test de lecture
        const data = await sheetsService.getData(config.spreadsheetId, sheetName);
        console.log(`   📖 Lecture réussie: ${data.length} lignes`);
        
      } catch (error) {
        console.log(`   ❌ Échec: ${error.message}`);
        
        // Diagnostic détaillé
        if (error.message.includes('Unable to parse range')) {
          console.log(`      🔍 Diagnostic: Problème de parsing du range`);
          console.log(`      📝 Range testé: '${sheetName}'!A:Z`);
          console.log(`      💡 Solution: Vérifiez le nom de la feuille dans Google Sheets`);
        } else if (error.message.includes('Accès refusé')) {
          console.log(`      🔍 Diagnostic: Problème de permissions`);
          console.log(`      💡 Solution: Vérifiez les permissions du compte de service`);
        } else if (error.message.includes('Impossible de lire')) {
          console.log(`      🔍 Diagnostic: Problème de lecture`);
          console.log(`      💡 Solution: Vérifiez que la feuille existe et contient des données`);
        }
      }
    }

    // 5. Test de synchronisation avec la configuration active
    console.log('\n5️⃣ Test de synchronisation avec la configuration active...');
    try {
      const syncResult = await sheetsService.forceSyncOrders();
      console.log('✅ Synchronisation réussie');
      console.log(`   Nouvelles commandes: ${syncResult.created}`);
      console.log(`   Commandes mises à jour: ${syncResult.updated}`);
      console.log(`   Total traité: ${syncResult.total}`);
    } catch (error) {
      console.log('❌ Échec de la synchronisation:', error.message);
    }

    // 6. Résumé et recommandations
    console.log('\n📋 Résumé des tests:');
    console.log('   - Service Google Sheets: ✅');
    console.log('   - Configuration active: ✅');
    console.log('   - Tests de feuilles: Terminés');
    console.log('   - Synchronisation: Testée');

    console.log('\n💡 Recommandations:');
    console.log('   1. Utilisez des noms de feuilles simples sans caractères spéciaux');
    console.log('   2. Évitez les espaces au début et à la fin des noms');
    console.log('   3. Testez toujours l\'accès avant de synchroniser');
    console.log('   4. Vérifiez les permissions du compte de service');

    console.log('\n🎉 Tests terminés !');

  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error);
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

// Exécuter les tests
if (require.main === module) {
  testAnySheet();
}

module.exports = testAnySheet;
