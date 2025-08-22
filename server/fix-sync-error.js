require('dotenv').config();
const mongoose = require('mongoose');

async function fixSyncError() {
  try {
    console.log('🔧 Diagnostic et correction de l\'erreur de synchronisation...\n');

    // 1. Vérifier la connexion MongoDB
    console.log('1️⃣ Test de connexion MongoDB...');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connecté avec succès');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error.message);
      console.log('💡 Solution: Vérifiez votre variable MONGODB_URI dans .env');
      return;
    }

    // 2. Vérifier les variables d'environnement critiques
    console.log('\n2️⃣ Vérification des variables critiques...');
    const criticalVars = [
      'MONGODB_URI',
      'GOOGLE_SHEETS_PRIVATE_KEY',
      'GOOGLE_SHEETS_CLIENT_EMAIL',
      'GOOGLE_SHEETS_PROJECT_ID'
    ];

    let hasErrors = false;
    criticalVars.forEach(varName => {
      if (!process.env[varName]) {
        console.log(`❌ ${varName}: MANQUANT`);
        hasErrors = true;
      } else {
        console.log(`✅ ${varName}: DÉFINI`);
      }
    });

    if (hasErrors) {
      console.log('\n🚨 Variables manquantes détectées !');
      console.log('💡 Solution: Configurez ces variables dans votre fichier .env');
      console.log('📝 Exemple de .env:');
      console.log(`
MONGODB_URI=mongodb://localhost:27017/commerce_orders
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nVotre clé privée\\n-----END PRIVATE KEY-----\\n"
GOOGLE_SHEETS_CLIENT_EMAIL=votre_email@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PROJECT_ID=votre_project_id
      `);
      return;
    }

    // 3. Vérifier la structure de la base de données
    console.log('\n3️⃣ Vérification de la base de données...');
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      console.log(`✅ Collections trouvées: ${collections.map(c => c.name).join(', ')}`);
      
      // Vérifier si la collection googleSheetsConfigs existe
      const hasConfigCollection = collections.some(c => c.name === 'googleSheetsConfigs');
      if (!hasConfigCollection) {
        console.log('⚠️ Collection googleSheetsConfigs manquante');
        console.log('💡 Solution: Lancez npm run migrate:google-sheets');
      } else {
        console.log('✅ Collection googleSheetsConfigs trouvée');
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de la base:', error.message);
    }

    // 4. Vérifier les permissions Google Sheets
    console.log('\n4️⃣ Vérification des permissions Google Sheets...');
    console.log('💡 Assurez-vous que:');
    console.log('   1. Votre compte de service a accès au spreadsheet');
    console.log('   2. Le spreadsheet est partagé avec l\'email du compte de service');
    console.log('   3. Les permissions sont définies sur "Éditeur"');

    // 5. Recommandations
    console.log('\n📋 Actions recommandées:');
    console.log('   1. Vérifiez votre fichier .env');
    console.log('   2. Lancez: npm run migrate:google-sheets');
    console.log('   3. Redémarrez le serveur');
    console.log('   4. Testez la synchronisation');

    console.log('\n🎉 Diagnostic terminé !');

  } catch (error) {
    console.error('\n❌ Erreur lors du diagnostic:', error);
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
  fixSyncError();
}

module.exports = fixSyncError;
