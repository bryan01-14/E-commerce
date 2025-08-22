require('dotenv').config();
const mongoose = require('mongoose');
const GoogleSheetsConfig = require('./models/GoogleSheetsConfig');
const sheetsService = require('./services/googleSheets');

async function validateSheetNames() {
  try {
    console.log('🔍 Validation des noms de feuilles Google Sheets...\n');

    // 1. Connexion MongoDB
    console.log('1️⃣ Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');

    // 2. Récupérer toutes les configurations
    console.log('\n2️⃣ Récupération des configurations...');
    const configs = await GoogleSheetsConfig.find();
    console.log(`📋 ${configs.length} configuration(s) trouvée(s)`);

    if (configs.length === 0) {
      console.log('⚠️ Aucune configuration trouvée');
      console.log('💡 Lancez d\'abord: npm run auto:fix:sync');
      return;
    }

    // 3. Valider chaque configuration
    console.log('\n3️⃣ Validation des noms de feuilles...');
    let hasIssues = false;

    for (const config of configs) {
      console.log(`\n📋 Configuration: ${config.name}`);
      console.log(`   Spreadsheet ID: ${config.spreadsheetId}`);
      console.log(`   Nom de feuille: "${config.sheetName}"`);
      
      // Vérifier si le nom de feuille est problématique
      const issues = [];
      if (config.sheetName.includes(' ')) {
        issues.push('Contient des espaces (nécessite des guillemets)');
      }
      if (config.sheetName.includes('\'') || config.sheetName.includes('"')) {
        issues.push('Contient des guillemets (peut causer des erreurs)');
      }
      if (/^[0-9]/.test(config.sheetName)) {
        issues.push('Commence par un chiffre (nécessite des guillemets)');
      }
      if (/[^\w\s]/.test(config.sheetName)) {
        issues.push('Contient des caractères spéciaux');
      }

      if (issues.length > 0) {
        hasIssues = true;
        console.log(`   ⚠️ Problèmes détectés:`);
        issues.forEach(issue => console.log(`      - ${issue}`));
        
        // Suggérer un nom corrigé
        const correctedName = suggestCorrectedName(config.sheetName);
        console.log(`   💡 Nom suggéré: "${correctedName}"`);
        
        // Demander confirmation pour la correction
        if (process.argv.includes('--auto-fix')) {
          console.log(`   🔧 Correction automatique...`);
          try {
            await GoogleSheetsConfig.findByIdAndUpdate(config._id, {
              sheetName: correctedName
            });
            console.log(`   ✅ Nom corrigé vers: "${correctedName}"`);
          } catch (error) {
            console.log(`   ❌ Erreur lors de la correction: ${error.message}`);
          }
        }
      } else {
        console.log(`   ✅ Nom de feuille valide`);
      }
    }

    // 4. Test de connexion et validation
    console.log('\n4️⃣ Test de connexion Google Sheets...');
    try {
      await sheetsService.initialize();
      console.log('✅ Service Google Sheets initialisé');
      
      // Tester la configuration active
      const activeConfig = configs.find(c => c.isActive);
      if (activeConfig) {
        console.log(`\n🔍 Test de la configuration active: ${activeConfig.name}`);
        
        try {
          const testResult = await sheetsService.testAccess(
            activeConfig.spreadsheetId, 
            activeConfig.sheetName
          );
          
          if (testResult.success) {
            console.log('✅ Configuration active valide');
            console.log(`   Spreadsheet: ${testResult.spreadsheetTitle}`);
            console.log(`   Feuilles disponibles: ${testResult.availableSheets.join(', ')}`);
          }
        } catch (testError) {
          console.log('❌ Erreur lors du test:', testError.message);
        }
      }
      
    } catch (error) {
      console.log('❌ Erreur lors de l\'initialisation:', error.message);
    }

    // 5. Résumé et recommandations
    console.log('\n📋 Résumé de la validation:');
    if (hasIssues) {
      console.log('   ⚠️ Problèmes détectés dans les noms de feuilles');
      console.log('\n💡 Recommandations:');
      console.log('   1. Corrigez les noms de feuilles problématiques');
      console.log('   2. Utilisez des noms simples sans espaces ni caractères spéciaux');
      console.log('   3. Exemples de noms valides: "Feuille1", "Commandes", "Sheet1"');
      console.log('   4. Relancez ce script avec --auto-fix pour corriger automatiquement');
    } else {
      console.log('   ✅ Tous les noms de feuilles sont valides');
    }

    console.log('\n🎉 Validation terminée !');

  } catch (error) {
    console.error('\n❌ Erreur lors de la validation:', error);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('\n🔌 Déconnecté de MongoDB');
    } catch (error) {
      console.log('⚠️ Erreur lors de la déconnexion MongoDB');
    }
  }
}

function suggestCorrectedName(originalName) {
  if (!originalName) return 'Sheet1';
  
  // Remplacer les espaces par des underscores
  let corrected = originalName.replace(/\s+/g, '_');
  
  // Remplacer les caractères spéciaux
  corrected = corrected.replace(/[^\w_]/g, '');
  
  // S'assurer que ça ne commence pas par un chiffre
  if (/^[0-9]/.test(corrected)) {
    corrected = 'Sheet_' + corrected;
  }
  
  // S'assurer que le nom n'est pas vide
  if (!corrected || corrected.length === 0) {
    corrected = 'Sheet1';
  }
  
  return corrected;
}

// Exécuter la validation
if (require.main === module) {
  validateSheetNames();
}

module.exports = validateSheetNames;
