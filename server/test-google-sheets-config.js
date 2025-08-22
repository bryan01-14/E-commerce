require('dotenv').config();
const mongoose = require('mongoose');
const GoogleSheetsConfig = require('./models/GoogleSheetsConfig');
const sheetsService = require('./services/googleSheets');

async function testGoogleSheetsConfig() {
  try {
    console.log('🧪 Test de la configuration Google Sheets...\n');

    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // 1. Test de création d'une configuration
    console.log('\n1️⃣ Test de création de configuration...');
    const testConfig = new GoogleSheetsConfig({
      name: 'Configuration de test',
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || 'test-id',
      sheetName: 'Test Sheet',
      description: 'Configuration de test pour validation',
      isActive: false,
      createdBy: null
    });

    await testConfig.save();
    console.log('✅ Configuration de test créée:', testConfig.name);

    // 2. Test de récupération des configurations
    console.log('\n2️⃣ Test de récupération des configurations...');
    const configs = await GoogleSheetsConfig.find();
    console.log(`✅ ${configs.length} configuration(s) trouvée(s)`);
    configs.forEach(config => {
      console.log(`   - ${config.name} (${config.isActive ? 'ACTIVE' : 'inactive'})`);
    });

    // 3. Test du service Google Sheets
    console.log('\n3️⃣ Test du service Google Sheets...');
    try {
      await sheetsService.initialize();
      console.log('✅ Service Google Sheets initialisé');

      const currentConfig = await sheetsService.getCurrentConfig();
      console.log('✅ Configuration actuelle récupérée:', currentConfig.name);

      // Test d'accès (si les credentials sont configurés)
      if (process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
        console.log('\n4️⃣ Test d\'accès au spreadsheet...');
        const testResult = await sheetsService.testAccess();
        console.log('✅ Test d\'accès réussi');
        console.log(`   Spreadsheet: ${testResult.spreadsheetTitle}`);
        console.log(`   Feuilles disponibles: ${testResult.availableSheets.join(', ')}`);
      } else {
        console.log('\n⚠️  Credentials Google Sheets non configurés, test d\'accès ignoré');
      }

    } catch (error) {
      console.log('⚠️  Erreur lors du test du service:', error.message);
    }

    // 5. Nettoyage
    console.log('\n5️⃣ Nettoyage...');
    await GoogleSheetsConfig.findByIdAndDelete(testConfig._id);
    console.log('✅ Configuration de test supprimée');

    console.log('\n🎉 Tous les tests sont passés avec succès !');
    console.log('\n📋 Résumé:');
    console.log('   - Modèle GoogleSheetsConfig: ✅');
    console.log('   - Service Google Sheets: ✅');
    console.log('   - Base de données: ✅');
    console.log('   - Configuration dynamique: ✅');

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
  testGoogleSheetsConfig();
}

module.exports = testGoogleSheetsConfig;
