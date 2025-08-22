require('dotenv').config();
const mongoose = require('mongoose');
const GoogleSheetsConfig = require('./models/GoogleSheetsConfig');

async function autoFixSync() {
  try {
    console.log('🔧 Correction automatique de l\'erreur de synchronisation...\n');

    // 1. Connexion MongoDB
    console.log('1️⃣ Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');

    // 2. Vérifier et créer la collection si nécessaire
    console.log('\n2️⃣ Vérification de la structure de la base...');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    if (!collections.some(c => c.name === 'googleSheetsConfigs')) {
      console.log('⚠️ Collection googleSheetsConfigs manquante, création...');
      
      // Créer la collection en insérant un document
      await db.createCollection('googleSheetsConfigs');
      console.log('✅ Collection googleSheetsConfigs créée');
    } else {
      console.log('✅ Collection googleSheetsConfigs existe');
    }

    // 3. Vérifier les configurations existantes
    console.log('\n3️⃣ Vérification des configurations...');
    let configs = await GoogleSheetsConfig.find();
    console.log(`📋 ${configs.length} configuration(s) trouvée(s)`);

    // 4. Créer une configuration par défaut si aucune n'existe
    if (configs.length === 0) {
      console.log('⚠️ Aucune configuration trouvée, création d\'une configuration par défaut...');
      
      const defaultConfig = new GoogleSheetsConfig({
        name: 'Configuration par défaut',
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "128tqEErdDvs7cWwtSbRl69aRj2cHaBFlebPBDjHmDQ",
        sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Feuille 1',
        description: 'Configuration créée automatiquement lors de la correction',
        isActive: true,
        createdBy: null
      });

      await defaultConfig.save();
      console.log('✅ Configuration par défaut créée');
      configs = [defaultConfig];
    }

    // 5. S'assurer qu'il y a une configuration active
    const activeConfig = configs.find(c => c.isActive);
    if (!activeConfig) {
      console.log('⚠️ Aucune configuration active, activation de la première...');
      
      if (configs.length > 0) {
        await GoogleSheetsConfig.findByIdAndUpdate(configs[0]._id, { isActive: true });
        console.log('✅ Configuration activée:', configs[0].name);
      }
    } else {
      console.log('✅ Configuration active trouvée:', activeConfig.name);
    }

    // 6. Vérifier les variables d'environnement
    console.log('\n4️⃣ Vérification des variables d\'environnement...');
    const requiredVars = [
      'GOOGLE_SHEETS_PRIVATE_KEY',
      'GOOGLE_SHEETS_CLIENT_EMAIL',
      'GOOGLE_SHEETS_PROJECT_ID'
    ];

    let missingVars = [];
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
        console.log(`❌ ${varName}: MANQUANT`);
      } else {
        console.log(`✅ ${varName}: DÉFINI`);
      }
    });

    if (missingVars.length > 0) {
      console.log('\n🚨 Variables manquantes détectées !');
      console.log('💡 Ajoutez ces variables à votre fichier .env:');
      missingVars.forEach(varName => {
        switch (varName) {
          case 'GOOGLE_SHEETS_PRIVATE_KEY':
            console.log(`${varName}="-----BEGIN PRIVATE KEY-----\\nVotre clé privée\\n-----END PRIVATE KEY-----\\n"`);
            break;
          case 'GOOGLE_SHEETS_CLIENT_EMAIL':
            console.log(`${varName}=votre_email@project.iam.gserviceaccount.com`);
            break;
          case 'GOOGLE_SHEETS_PROJECT_ID':
            console.log(`${varName}=votre_project_id`);
            break;
          default:
            console.log(`${varName}=votre_valeur`);
        }
      });
    } else {
      console.log('✅ Toutes les variables requises sont définies');
    }

    // 7. Résumé et recommandations
    console.log('\n📋 Résumé de la correction:');
    console.log('   - Base de données: ✅');
    console.log('   - Collection googleSheetsConfigs: ✅');
    console.log('   - Configuration active: ✅');
    console.log('   - Variables d\'environnement: ' + (missingVars.length === 0 ? '✅' : '⚠️'));

    if (missingVars.length === 0) {
      console.log('\n🎉 Tous les problèmes ont été corrigés !');
      console.log('💡 Prochaines étapes:');
      console.log('   1. Redémarrez votre serveur');
      console.log('   2. Testez la synchronisation via l\'interface');
    } else {
      console.log('\n⚠️ Certains problèmes persistent');
      console.log('💡 Configurez les variables manquantes puis redémarrez le serveur');
    }

  } catch (error) {
    console.error('\n❌ Erreur lors de la correction automatique:', error);
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

// Exécuter la correction automatique
if (require.main === module) {
  autoFixSync();
}

module.exports = autoFixSync;
