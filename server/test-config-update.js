require('dotenv').config();
const mongoose = require('mongoose');
const GoogleSheetsConfig = require('./models/GoogleSheetsConfig');

async function testConfigUpdate() {
  try {
    console.log('🧪 Test de mise à jour de la configuration active...\n');

    // 1. Connexion MongoDB
    console.log('1️⃣ Connexion MongoDB...');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connecté avec succès');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error.message);
      return;
    }

    // 2. Récupération de toutes les configurations
    console.log('\n2️⃣ Récupération de toutes les configurations...');
    const allConfigs = await GoogleSheetsConfig.find().sort({ createdAt: -1 });
    console.log(`✅ ${allConfigs.length} configurations trouvées`);

    if (allConfigs.length === 0) {
      console.log('⚠️ Aucune configuration trouvée. Créez d\'abord des configurations.');
      return;
    }

    // 3. Affichage de la configuration actuellement active
    console.log('\n3️⃣ Configuration actuellement active...');
    const activeConfig = await GoogleSheetsConfig.findOne({ isActive: true });
    
    if (activeConfig) {
      console.log(`✅ Configuration active: ${activeConfig.name}`);
      console.log(`   Spreadsheet ID: ${activeConfig.spreadsheetId}`);
      console.log(`   Nom de feuille: "${activeConfig.sheetName}"`);
      console.log(`   isActive: ${activeConfig.isActive}`);
    } else {
      console.log('⚠️ Aucune configuration active trouvée');
    }

    // 4. Test de changement de configuration active
    console.log('\n4️⃣ Test de changement de configuration active...');
    
    if (allConfigs.length >= 2) {
      // Trouver une configuration non active
      const inactiveConfig = allConfigs.find(config => !config.isActive);
      
      if (inactiveConfig) {
        console.log(`🔄 Activation de la configuration: ${inactiveConfig.name}`);
        
        // Désactiver toutes les configurations
        await GoogleSheetsConfig.updateMany({}, { isActive: false });
        console.log('✅ Toutes les configurations désactivées');
        
        // Activer la nouvelle configuration
        const updatedConfig = await GoogleSheetsConfig.findByIdAndUpdate(
          inactiveConfig._id,
          { isActive: true, lastUsed: new Date() },
          { new: true }
        );
        console.log(`✅ Configuration activée: ${updatedConfig.name}`);
        console.log(`   isActive: ${updatedConfig.isActive}`);
        
        // Vérifier qu'il n'y a qu'une seule configuration active
        const activeConfigs = await GoogleSheetsConfig.find({ isActive: true });
        console.log(`✅ Nombre de configurations actives: ${activeConfigs.length}`);
        
        if (activeConfigs.length === 1) {
          console.log('✅ Test réussi : Une seule configuration active');
        } else {
          console.log('❌ Test échoué : Plusieurs configurations actives');
        }
        
      } else {
        console.log('⚠️ Toutes les configurations sont déjà actives');
      }
    } else {
      console.log('⚠️ Pas assez de configurations pour tester le changement');
    }

    // 5. Affichage final de toutes les configurations
    console.log('\n5️⃣ État final de toutes les configurations...');
    const finalConfigs = await GoogleSheetsConfig.find().sort({ createdAt: -1 });
    
    finalConfigs.forEach((config, index) => {
      console.log(`${index + 1}. ${config.name}`);
      console.log(`   Spreadsheet ID: ${config.spreadsheetId}`);
      console.log(`   Nom de feuille: "${config.sheetName}"`);
      console.log(`   isActive: ${config.isActive}`);
      console.log(`   Créée le: ${config.createdAt.toLocaleDateString('fr-FR')}`);
      console.log('');
    });

    console.log('🎉 Test de mise à jour de configuration terminé !');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
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

// Exécuter le test
if (require.main === module) {
  testConfigUpdate();
}

module.exports = testConfigUpdate;
