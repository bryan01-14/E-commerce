require('dotenv').config();
const mongoose = require('mongoose');
const sheetsService = require('./services/googleSheets');

async function checkPermissions() {
  try {
    console.log('🔐 Vérification des permissions Google Sheets...\n');

    // 1. Affichage des informations du compte de service
    console.log('1️⃣ Informations du compte de service...');
    console.log(`   Client Email: ${process.env.GOOGLE_SHEETS_CLIENT_EMAIL || 'NON DÉFINI'}`);
    console.log(`   Project ID: ${process.env.GOOGLE_SHEETS_PROJECT_ID || 'NON DÉFINI'}`);
    console.log(`   Private Key: ${process.env.GOOGLE_SHEETS_PRIVATE_KEY ? 'DÉFINI' : 'NON DÉFINI'}`);
    
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
      console.log('❌ GOOGLE_SHEETS_CLIENT_EMAIL manquant dans .env');
      return;
    }

    // 2. Connexion MongoDB
    console.log('\n2️⃣ Test de connexion MongoDB...');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connecté avec succès');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error.message);
      return;
    }

    // 3. Initialisation du service
    console.log('\n3️⃣ Initialisation du service Google Sheets...');
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

    // 4. Récupération de la configuration active
    console.log('\n4️⃣ Récupération de la configuration active...');
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

    // 5. Test d'accès au spreadsheet
    console.log('\n5️⃣ Test d\'accès au spreadsheet...');
    try {
      const accessResult = await sheetsService.testAccess(config.spreadsheetId, config.sheetName);
      console.log('✅ Accès au spreadsheet réussi');
      console.log(`   Titre: ${accessResult.spreadsheetTitle}`);
      console.log(`   Feuilles disponibles: ${accessResult.availableSheets.join(', ')}`);
      console.log(`   Feuille configurée existe: ${accessResult.sheetExists ? 'OUI' : 'NON'}`);
      
      if (!accessResult.sheetExists) {
        console.log('\n⚠️ ATTENTION: La feuille configurée n\'existe pas !');
        console.log(`   Feuille configurée: "${config.sheetName}"`);
        console.log(`   Feuilles disponibles: ${accessResult.availableSheets.join(', ')}`);
        
        // Suggérer des corrections
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
        
        console.log('\n   5. Si le problème persiste, vérifiez que:');
        console.log('      - Le compte de service est activé dans Google Cloud Console');
        console.log('      - L\'API Google Sheets est activée');
        console.log('      - Les permissions sont bien "Éditeur" (pas "Lecteur")');
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

    // 7. Test de synchronisation
    console.log('\n7️⃣ Test de synchronisation...');
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

    // 8. Résumé et recommandations
    console.log('\n📋 Résumé de la vérification des permissions:');
    console.log('   - MongoDB: ✅');
    console.log('   - Service Google Sheets: ✅');
    console.log('   - Configuration active: ✅');
    console.log('   - Accès au spreadsheet: ✅');
    console.log('   - Lecture de la feuille: ✅');
    console.log('   - Synchronisation: ✅');

    console.log('\n🎉 Tous les tests sont passés avec succès !');
    console.log('💡 Votre configuration Google Sheets fonctionne parfaitement.');

  } catch (error) {
    console.error('\n❌ Erreur lors de la vérification:', error);
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

// Exécuter la vérification
if (require.main === module) {
  checkPermissions();
}

module.exports = checkPermissions;
