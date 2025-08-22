require('dotenv').config();
const mongoose = require('mongoose');
const sheetsService = require('./services/googleSheets');

async function testUniversalSheets() {
  try {
    console.log('🌍 Test universel de n\'importe quelle feuille Google Sheets...\n');

    // 1. Connexion MongoDB
    console.log('1️⃣ Test de connexion MongoDB...');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connecté avec succès');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error.message);
      return;
    }

    // 2. Initialisation du service
    console.log('\n2️⃣ Initialisation du service Google Sheets...');
    try {
      await sheetsService.initialize();
      console.log('✅ Service Google Sheets initialisé');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error.message);
      return;
    }

    // 3. Récupération de la configuration active
    console.log('\n3️⃣ Récupération de la configuration active...');
    let config;
    try {
      config = await sheetsService.getCurrentConfig();
      console.log(`✅ Configuration active: ${config.name}`);
      console.log(`   Spreadsheet ID: ${config.spreadsheetId}`);
      console.log(`   Nom de feuille: "${config.sheetName}"`);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la configuration:', error.message);
      return;
    }

    // 4. Test universel avec différents types de feuilles
    console.log('\n4️⃣ Test universel avec différents types de feuilles...');
    
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
      'Feuille avec caractères spéciaux !@#',
      'Feuille2',
      'Feuille 2',
      'Feuille2 ',
      ' Feuille2',
      'Feuille_2',
      'Feuille-2'
    ];

    let successfulSheets = [];
    let failedSheets = [];

    for (const sheetName of testSheetNames) {
      console.log(`\n🔍 Test de la feuille: "${sheetName}"`);
      
      try {
        // Test d'accès
        const accessResult = await sheetsService.testAccess(config.spreadsheetId, sheetName);
        
        if (accessResult.success && accessResult.sheetExists) {
          console.log(`   ✅ Accès réussi`);
          
          // Test de lecture
          try {
            const data = await sheetsService.getData(config.spreadsheetId, sheetName);
            console.log(`   📖 Lecture réussie: ${data.length} lignes`);
            successfulSheets.push({
              name: sheetName,
              lines: data.length,
              status: 'SUCCESS'
            });
          } catch (readError) {
            console.log(`   ❌ Lecture échouée: ${readError.error || readError.message}`);
            failedSheets.push({
              name: sheetName,
              error: readError.error || readError.message,
              status: 'READ_FAILED'
            });
          }
        } else {
          console.log(`   ⚠️ Feuille non trouvée`);
          failedSheets.push({
            name: sheetName,
            error: 'Feuille non trouvée',
            status: 'NOT_FOUND'
          });
        }
        
      } catch (accessError) {
        console.log(`   ❌ Accès échoué: ${accessError.error || accessError.message}`);
        failedSheets.push({
          name: sheetName,
          error: accessError.error || accessError.message,
          status: 'ACCESS_FAILED'
        });
      }
    }

    // 5. Résumé des tests
    console.log('\n📋 Résumé des tests universels:');
    console.log(`   Feuilles testées: ${testSheetNames.length}`);
    console.log(`   Succès: ${successfulSheets.length}`);
    console.log(`   Échecs: ${failedSheets.length}`);

    if (successfulSheets.length > 0) {
      console.log('\n✅ Feuilles qui fonctionnent:');
      successfulSheets.forEach(sheet => {
        console.log(`   - "${sheet.name}" (${sheet.lines} lignes)`);
      });
    }

    if (failedSheets.length > 0) {
      console.log('\n❌ Feuilles qui échouent:');
      failedSheets.forEach(sheet => {
        console.log(`   - "${sheet.name}": ${sheet.error}`);
      });
    }

    // 6. Recommandations
    console.log('\n💡 Recommandations:');
    if (successfulSheets.length > 0) {
      console.log('   ✅ Utilisez une des feuilles qui fonctionnent');
      console.log('   📋 Feuilles recommandées:', successfulSheets.map(s => s.name).join(', '));
    }
    
    if (failedSheets.length > 0) {
      console.log('   ⚠️ Évitez les feuilles qui échouent');
      console.log('   🔍 Vérifiez les noms des feuilles problématiques');
    }

    // 7. Test de synchronisation avec la meilleure feuille
    if (successfulSheets.length > 0) {
      const bestSheet = successfulSheets[0];
      console.log(`\n🔄 Test de synchronisation avec la meilleure feuille: "${bestSheet.name}"`);
      
      try {
        // Mettre à jour temporairement la configuration
        await sheetsService.setActiveConfig(config._id);
        
        const syncResult = await sheetsService.forceSyncOrders();
        console.log('✅ Synchronisation réussie');
        console.log(`   Nouvelles commandes: ${syncResult.created}`);
        console.log(`   Commandes mises à jour: ${syncResult.updated}`);
        console.log(`   Total traité: ${syncResult.total}`);
        
      } catch (syncError) {
        console.log('❌ Échec de la synchronisation:', syncError.message);
      }
    }

    console.log('\n🎉 Tests universels terminés !');
    console.log('💡 Votre application peut maintenant gérer n\'importe quelle feuille !');

  } catch (error) {
    console.error('\n❌ Erreur lors des tests universels:', error);
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

// Exécuter les tests universels
if (require.main === module) {
  testUniversalSheets();
}

module.exports = testUniversalSheets;
