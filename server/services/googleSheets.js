const { google } = require('googleapis');
const GoogleSheetsConfig = require('../models/GoogleSheetsConfig');

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.currentConfig = null;
  }

  async initialize() {
    try {
      // Vérification des variables d'environnement
      if (!process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
        throw new Error('GOOGLE_SHEETS_PRIVATE_KEY manquant dans .env');
      }

      this.auth = new google.auth.GoogleAuth({
        credentials: {
          type: 'service_account',
          project_id: process.env.GOOGLE_SHEETS_PROJECT_ID,
          private_key_id: process.env.GOOGLE_SHEETS_PRIVATE_KEY_ID,
          private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
          client_id: process.env.GOOGLE_SHEETS_CLIENT_ID,
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: process.env.GOOGLE_SHEETS_CLIENT_X509_CERT_URL
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const authClient = await this.auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: authClient });

      // Charger la configuration active par défaut
      await this.loadActiveConfig();
      
      return { success: true };
    } catch (error) {
      console.error('Erreur initialisation Google Sheets:', error);
      throw error;
    }
  }

  async loadActiveConfig() {
    try {
      // Essayer de charger la configuration active depuis la base de données
      const activeConfig = await GoogleSheetsConfig.findOne({ isActive: true });
      
      if (activeConfig) {
        this.currentConfig = activeConfig;
        console.log(`Configuration active chargée: ${activeConfig.name} (${activeConfig.spreadsheetId})`);
      } else {
        // Fallback sur les variables d'environnement
        this.currentConfig = {
          spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "128tqEErdDvs7cWwtSbRl69aRj2cHaBFlebPBDjHmDQ",
          sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Feuille 1',
          name: 'Configuration par défaut'
        };
        console.log('Utilisation de la configuration par défaut depuis .env');
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
      // Fallback sur les variables d'environnement
      this.currentConfig = {
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "128tqEErdDvs7cWwtSbRl69aRj2cHaBFlebPBDjHmDQ",
        sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Feuille 1',
        name: 'Configuration par défaut'
      };
    }
  }

  async setActiveConfig(configId) {
    try {
      // Désactiver toutes les configurations
      await GoogleSheetsConfig.updateMany({}, { isActive: false });
      
      // Activer la configuration sélectionnée
      const config = await GoogleSheetsConfig.findByIdAndUpdate(
        configId,
        { 
          isActive: true,
          lastUsed: new Date()
        },
        { new: true }
      );
      
      if (!config) {
        throw new Error('Configuration non trouvée');
      }
      
      this.currentConfig = config;
      console.log(`Configuration active changée vers: ${config.name}`);
      
      return { success: true, config };
    } catch (error) {
      console.error('Erreur lors du changement de configuration:', error);
      throw error;
    }
  }

  async getCurrentConfig() {
    if (!this.currentConfig) {
      await this.loadActiveConfig();
    }
    return this.currentConfig;
  }

  async testAccess(spreadsheetId = null, sheetName = null) {
    try {
      const testSpreadsheetId = spreadsheetId || this.currentConfig?.spreadsheetId;
      const testSheetName = sheetName || this.currentConfig?.sheetName;
      
      if (!testSpreadsheetId) {
        throw new Error('Aucun ID de spreadsheet spécifié');
      }

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: testSpreadsheetId,
        fields: 'properties.title,sheets.properties'
      });
      
      const availableSheets = response.data.sheets.map(s => s.properties.title);
      const sheetExists = testSheetName ? availableSheets.includes(testSheetName) : true;
      
      return {
        success: true,
        spreadsheetTitle: response.data.properties.title,
        availableSheets,
        sheetExists,
        currentSheet: testSheetName
      };
    } catch (error) {
      console.error('Erreur vérification accès:', error.message);
      throw new Error(`Accès refusé au Google Sheet. Vérifiez: 
        1. L'ID du spreadsheet
        2. Le compte de service a bien accès
        3. La feuille existe dans le document`);
    }
  }

  async getData(spreadsheetId = null, sheetName = null) {
    try {
      if (!this.sheets) await this.initialize();

      const config = await this.getCurrentConfig();
      const targetSpreadsheetId = spreadsheetId || config.spreadsheetId;
      const targetSheetName = sheetName || config.sheetName;
      
      const range = `${targetSheetName}!A:Z`;
      console.log(`Tentative de lecture: ${range} depuis ${targetSpreadsheetId}`);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: targetSpreadsheetId,
        range: range,
      });

      return response.data.values || [];
    } catch (error) {
      console.error('Erreur récupération données:', {
        message: error.message,
        code: error.code,
        errors: error.errors
      });
      throw error;
    }
  }

  async getAllConfigs() {
    try {
      return await GoogleSheetsConfig.find().sort({ createdAt: -1 });
    } catch (error) {
      console.error('Erreur lors de la récupération des configurations:', error);
      throw error;
    }
  }

  async createConfig(configData) {
    try {
      // Vérifier l'accès avant de créer la configuration
      await this.testAccess(configData.spreadsheetId, configData.sheetName);
      
      const config = new GoogleSheetsConfig(configData);
      await config.save();
      
      console.log(`Nouvelle configuration créée: ${config.name}`);
      return config;
    } catch (error) {
      console.error('Erreur lors de la création de la configuration:', error);
      throw error;
    }
  }

  async updateConfig(configId, updateData) {
    try {
      if (updateData.spreadsheetId || updateData.sheetName) {
        // Vérifier l'accès avant de mettre à jour
        await this.testAccess(
          updateData.spreadsheetId, 
          updateData.sheetName
        );
      }
      
      const config = await GoogleSheetsConfig.findByIdAndUpdate(
        configId,
        updateData,
        { new: true }
      );
      
      if (!config) {
        throw new Error('Configuration non trouvée');
      }
      
      console.log(`Configuration mise à jour: ${config.name}`);
      return config;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la configuration:', error);
      throw error;
    }
  }

  async deleteConfig(configId) {
    try {
      const config = await GoogleSheetsConfig.findById(configId);
      if (!config) {
        throw new Error('Configuration non trouvée');
      }
      
      if (config.isActive) {
        throw new Error('Impossible de supprimer la configuration active');
      }
      
      await GoogleSheetsConfig.findByIdAndDelete(configId);
      console.log(`Configuration supprimée: ${config.name}`);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de la configuration:', error);
      throw error;
    }
  }
}

module.exports = new GoogleSheetsService();