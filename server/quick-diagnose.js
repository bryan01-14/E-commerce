require('dotenv').config();
const mongoose = require('mongoose');
const sheetsService = require('./services/googleSheets');

async function quickDiagnose() {
  try {
    console.log('🔍 Diagnostic rapide des problèmes de test d\'accès...\n');

    // 1. Vérification des variables d'environnement
    console.log('1️⃣ Vérification des variables d\'environnement...');
    const requiredVars = [
      'MONGODB_URI',
      'GOOGLE_SHEETS_PRIVATE_KEY',
      'GOOGLE_SHEETS_CLIENT_EMAIL',
      'GOOGLE_SHEETS_PROJECT_ID'
    ];
    
    let hasErrors = false;
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        console.log(`❌ ${varName}: MANQUANT`);
        hasErrors = true;
      } else {
        console.log(`✅ ${varName}: DÉFINI`);
      }
    });
    
    if (hasErrors) {
      console.log('\n🚨 Variables manquantes détectées !');
      console.log('💡 Configurez ces variables dans votre fichier .env');
      return;
    }

    // 2. Test de connexion MongoDB
    console.log('\n2️⃣ Test de connexion MongoDB...');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connecté avec succès');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error.message);
      return;
    }

    // 3. Test d'initialisation du service
    console.log('\n3️⃣ Test d\'initialisation du service Google Sheets...');
    try {
      await sheetsService.initialize();
      console.log('✅ Service Google Sheets initialisé');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error.message);
      console.log('\n💡 Solutions possibles:');
      console.log('   1. Vérifiez que GOOGLE_SHEETS_PRIVATE_KEY est correct');
      console.log('   2. Vérifiez que GOOGLE_SHEETS_PROJECT_ID est correct');
      console.log('   3. Vérifiez que le compte de service est activé');
      return;
    }

    // 4. Test de récupération de la configuration
    console.log('\n4️⃣ Test de récupération de la configuration...');
    let config;
    try {
      config = await sheetsService.getCurrentConfig();
      console.log(`✅ Configuration active: ${config.name}`);
      console.log(`   Spreadsheet ID: ${config.spreadsheetId}`);
      console.log(`   Nom de feuille: "${config.sheetName}"`);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la configuration:', error.message);
      console.log('💡 Lancez d\'abord: npm run migrate:google-sheets');
      return;
    }

    // 5. Test d'accès au spreadsheet
    console.log('\n5️⃣ Test d\'accès au spreadsheet...');
    try {
      const accessResult = await sheetsService.testAccess(config.spreadsheetId, config.sheetName);
      console.log('✅ Test d\'accès réussi');
      console.log(`   Titre: ${accessResult.spreadsheetTitle}`);
      console.log(`   Feuilles disponibles: ${accessResult.availableSheets.join(', ')}`);
      console.log(`   Feuille configurée existe: ${accessResult.sheetExists ? 'OUI' : 'NON'}`);
      
      if (!accessResult.sheetExists) {
        console.log('\n⚠️ ATTENTION: La feuille configurée n\'existe pas !');
        console.log(`   Feuille configurée: "${config.sheetName}"`);
        console.log(`   Feuilles disponibles: ${accessResult.availableSheets.join(', ')}`);
        
        if (accessResult.availableSheets.length > 0) {
          console.log('\n💡 Solutions:');
          console.log('   1. Utilisez une des feuilles disponibles');
          console.log('   2. Ou créez une nouvelle feuille avec le nom configuré');
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur lors du test d\'accès:', error.message);
      
      if (error.message.includes('Accès refusé')) {
        console.log('\n🚨 PROBLÈME IDENTIFIÉ: Accès refusé au Google Sheet !');
        console.log('\n💡 SOLUTIONS ÉTAPE PAR ÉTAPE:');
        console.log('\n   1. Vérifiez l\'email du compte de service:');
        console.log(`      ${process.env.GOOGLE_SHEETS_CLIENT_EMAIL}`);
        
        console.log('\n   2. Allez dans votre Google Sheet et:');
        console.log('      - Cliquez sur "Partager" (en haut à droite)');
        console.log('      - Ajoutez cet email:');
        console.log(`      ${process.env.GOOGLE_SHEETS_CLIENT_EMAIL}`);
        console.log('      - Donnez les permissions "Éditeur"');
        console.log('      - Décochez "Notifier les personnes"');
        console.log('      - Cliquez sur "Partager"');
        
        console.log('\n   3. Vérifiez que l\'email apparaît dans la liste');
        console.log('\n   4. Relancez ce script après avoir partagé');
      } else if (error.message.includes('n\'existe pas')) {
        console.log('\n🚨 PROBLÈME IDENTIFIÉ: La feuille configurée n\'existe pas !');
        console.log('💡 Solutions:');
        console.log('   1. Vérifiez le nom exact de la feuille dans Google Sheets');
        console.log('   2. Mettez à jour la configuration avec le bon nom');
        console.log('   3. Ou créez une nouvelle feuille avec le nom configuré');
      }
      return;
    }

    // 6. Test de lecture de la feuille
    console.log('\n6️⃣ Test de lecture de la feuille...');
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
      return;
    }

    // 7. Résumé et recommandations
    console.log('\n📋 Résumé du diagnostic rapide:');
    console.log('   - Variables d\'environnement: ✅');
    console.log('   - MongoDB: ✅');
    console.log('   - Service Google Sheets: ✅');
    console.log('   - Configuration active: ✅');
    console.log('   - Accès au spreadsheet: ✅');
    console.log('   - Lecture de la feuille: ✅');

    console.log('\n🎉 Tous les tests sont passés avec succès !');
    console.log('💡 Votre configuration Google Sheets fonctionne parfaitement.');
    console.log('\n💡 Si vous rencontrez encore des erreurs 500:');
    console.log('   1. Redémarrez votre serveur');
    console.log('   2. Vérifiez les logs du serveur');
    console.log('   3. Utilisez: npm run diagnose:sheet pour plus de détails');

  } catch (error) {
    console.error('\n❌ Erreur lors du diagnostic rapide:', error);
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

// Exécuter le diagnostic rapide
if (require.main === module) {
  quickDiagnose();
}

module.exports = quickDiagnose;
