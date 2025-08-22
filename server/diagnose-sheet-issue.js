require('dotenv').config();
const mongoose = require('mongoose');
const sheetsService = require('./services/googleSheets');

async function diagnoseSheetIssue() {
  try {
    console.log('🔍 Diagnostic spécifique des problèmes de feuilles Google Sheets...\n');

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

    // 4. Test d'accès au spreadsheet
    console.log('\n4️⃣ Test d\'accès au spreadsheet...');
    try {
      const accessResult = await sheetsService.testAccess(config.spreadsheetId, config.sheetName);
      console.log('✅ Accès au spreadsheet réussi');
      console.log(`   Titre: ${accessResult.spreadsheetTitle}`);
      console.log(`   Feuilles disponibles: ${accessResult.availableSheets.join(', ')}`);
      
      // Vérifier si la feuille configurée existe
      if (accessResult.sheetExists) {
        console.log(`✅ La feuille "${config.sheetName}" existe dans le spreadsheet`);
      } else {
        console.log(`❌ La feuille "${config.sheetName}" N'EXISTE PAS dans le spreadsheet`);
        console.log(`💡 Feuilles disponibles: ${accessResult.availableSheets.join(', ')}`);
        
        // Suggérer des corrections
        const similarSheets = accessResult.availableSheets.filter(name => 
          name.toLowerCase().includes(config.sheetName.toLowerCase()) ||
          config.sheetName.toLowerCase().includes(name.toLowerCase())
        );
        
        if (similarSheets.length > 0) {
          console.log(`💡 Feuilles similaires trouvées: ${similarSheets.join(', ')}`);
        }
        
        // Suggérer la correction
        if (accessResult.availableSheets.length > 0) {
          console.log(`💡 Utilisez une de ces feuilles: ${accessResult.availableSheets.join(', ')}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur lors du test d\'accès:', error.message);
      
      if (error.message.includes('n\'existe pas')) {
        console.log('\n🚨 PROBLÈME IDENTIFIÉ: La feuille configurée n\'existe pas !');
        console.log('💡 Solutions:');
        console.log('   1. Vérifiez le nom exact de la feuille dans Google Sheets');
        console.log('   2. Mettez à jour la configuration avec le bon nom');
        console.log('   3. Ou créez une nouvelle feuille avec le nom configuré');
      }
      return;
    }

    // 5. Test de lecture de la feuille
    console.log('\n5️⃣ Test de lecture de la feuille...');
    try {
      const data = await sheetsService.getData(config.spreadsheetId, config.sheetName);
      console.log(`✅ Lecture de la feuille réussie: ${data.length} lignes`);
      
      if (data.length > 0) {
        console.log('   Première ligne (en-têtes):', data[0]);
        if (data.length > 1) {
          console.log('   Deuxième ligne (données):', data[1]);
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la lecture:', error.message);
      
      if (error.message.includes('Unable to parse range')) {
        console.log('\n🚨 PROBLÈME IDENTIFIÉ: Erreur de parsing du range !');
        console.log('💡 Solutions:');
        console.log('   1. Vérifiez que le nom de la feuille est correct');
        console.log('   2. Évitez les caractères spéciaux dans le nom');
        console.log('   3. Utilisez des noms simples');
      }
      return;
    }

    // 6. Test de synchronisation
    console.log('\n6️⃣ Test de synchronisation...');
    try {
      const syncResult = await sheetsService.forceSyncOrders();
      console.log('✅ Synchronisation réussie');
      console.log(`   Nouvelles commandes: ${syncResult.created}`);
      console.log(`   Commandes mises à jour: ${syncResult.updated}`);
      console.log(`   Total traité: ${syncResult.total}`);
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error.message);
      return;
    }

    // 7. Résumé et recommandations
    console.log('\n📋 Résumé du diagnostic:');
    console.log('   - MongoDB: ✅');
    console.log('   - Service Google Sheets: ✅');
    console.log('   - Configuration active: ✅');
    console.log('   - Accès au spreadsheet: ✅');
    console.log('   - Lecture de la feuille: ✅');
    console.log('   - Synchronisation: ✅');

    console.log('\n🎉 Tous les tests sont passés avec succès !');
    console.log('💡 Votre configuration Google Sheets fonctionne parfaitement.');

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

// Exécuter le diagnostic
if (require.main === module) {
  diagnoseSheetIssue();
}

module.exports = diagnoseSheetIssue;
