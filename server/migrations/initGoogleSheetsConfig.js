require('dotenv').config();
const mongoose = require('mongoose');
const GoogleSheetsConfig = require('../models/GoogleSheetsConfig');

async function initGoogleSheetsConfig() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connecté à MongoDB');

    // Vérifier s'il existe déjà des configurations
    const existingConfigs = await GoogleSheetsConfig.countDocuments();
    
    if (existingConfigs === 0) {
      // Créer une configuration par défaut basée sur les variables d'environnement
      const defaultConfig = new GoogleSheetsConfig({
        name: 'Configuration par défaut',
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "128tqEErdDvs7cWwtSbRl69aRj2cHaBFlebPBDjHmDQ",
        sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Feuille 1',
        description: 'Configuration initiale basée sur les variables d\'environnement',
        isActive: true,
        createdBy: null // Sera mis à jour lors de la première utilisation
      });

      await defaultConfig.save();
      console.log('Configuration Google Sheets par défaut créée avec succès');
      console.log('ID du spreadsheet:', defaultConfig.spreadsheetId);
      console.log('Nom de la feuille:', defaultConfig.sheetName);
    } else {
      console.log(`${existingConfigs} configuration(s) existante(s) trouvée(s)`);
    }

    // Afficher toutes les configurations
    const allConfigs = await GoogleSheetsConfig.find();
    console.log('\nConfigurations disponibles:');
    allConfigs.forEach(config => {
      console.log(`- ${config.name} (${config.isActive ? 'ACTIVE' : 'inactive'})`);
      console.log(`  Spreadsheet ID: ${config.spreadsheetId}`);
      console.log(`  Feuille: ${config.sheetName}`);
      console.log(`  Description: ${config.description || 'Aucune'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
  }
}

// Exécuter la migration si le script est appelé directement
if (require.main === module) {
  initGoogleSheetsConfig();
}

module.exports = initGoogleSheetsConfig;
