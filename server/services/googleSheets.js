const { google } = require('googleapis');
const GoogleSheetsConfig = require('../models/GoogleSheetsConfig');
const Order = require('../models/Order');

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.currentConfig = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Éviter la double initialisation
      if (this.isInitialized && this.sheets) {
        return { success: true };
      }

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
      this.isInitialized = true;

      // Charger la configuration active par défaut
      await this.loadActiveConfig();
      
      return { success: true };
    } catch (error) {
      console.error('Erreur initialisation Google Sheets:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async loadActiveConfig() {
    try {
      console.log('📋 Chargement de la configuration active...');
      
      // Essayer de charger la configuration active depuis la base de données
      const activeConfig = await GoogleSheetsConfig.findOne({ isActive: true });
      
      if (activeConfig) {
        this.currentConfig = activeConfig;
        console.log(`✅ Configuration active chargée: ${activeConfig.name} (${activeConfig.spreadsheetId})`);
        return activeConfig;
      } else {
        console.log('⚠️ Aucune configuration active trouvée en base, utilisation du fallback...');
        
        // Fallback sur les variables d'environnement
        const fallbackConfig = {
          spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "128tqEErdDvs7cWwtSbRl69aRj2cHaBFlebPBDjHmDQ",
          sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Feuille 1',
          name: 'Configuration par défaut (fallback)'
        };
        
        this.currentConfig = fallbackConfig;
        console.log(`✅ Configuration de fallback utilisée: ${fallbackConfig.name} (${fallbackConfig.spreadsheetId})`);
        return fallbackConfig;
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la configuration:', error);
      
      // Fallback sur les variables d'environnement en cas d'erreur
      const fallbackConfig = {
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "128tqEErdDvs7cWwtSbRl69aRj2cHaBFlebPBDjHmDQ",
        sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Feuille 1',
        name: 'Configuration par défaut (erreur fallback)'
      };
      
      this.currentConfig = fallbackConfig;
      console.log(`✅ Configuration de fallback utilisée après erreur: ${fallbackConfig.name} (${fallbackConfig.spreadsheetId})`);
      return fallbackConfig;
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
      
      // Synchroniser automatiquement les commandes de la nouvelle feuille
      await this.syncOrdersFromNewSheet(config);
      
      return { success: true, config };
    } catch (error) {
      console.error('Erreur lors du changement de configuration:', error);
      throw error;
    }
  }

  async syncOrdersFromNewSheet(config) {
    try {
      console.log(`🔄 Synchronisation des commandes depuis la nouvelle feuille: ${config.sheetName}`);
      
      // Récupérer les données de la nouvelle feuille
      const sheetData = await this.getData(config.spreadsheetId, config.sheetName);
      
      if (!sheetData || sheetData.length < 2) {
        console.log('⚠️ Aucune donnée trouvée dans la nouvelle feuille');
        return { success: false, message: 'Aucune donnée trouvée' };
      }

      // Transformer les données en commandes
      const [headers, ...rows] = sheetData;
      const orders = this.transformSheetDataToOrders(rows, headers, config);
      
      // Synchroniser avec la base de données
      const syncResults = await this.syncOrdersToDatabase(orders, config);
      
      console.log(`✅ Synchronisation terminée: ${syncResults.created} créées, ${syncResults.updated} mises à jour`);
      
      return {
        success: true,
        created: syncResults.created,
        updated: syncResults.updated,
        total: orders.length
      };
      
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      throw error;
    }
  }

  transformSheetDataToOrders(rows, headers, config) {
    return rows.map((row, index) => {
      const orderData = {};
      
      headers.forEach((header, colIndex) => {
        const value = row[colIndex] || '';
        
        // Mapping des colonnes selon votre structure
        switch (header.toLowerCase()) {
          case 'n° commande':
          case 'numero commande':
          case 'id':
            orderData.numeroCommande = value;
            break;
          case 'date':
          case 'date commande':
            orderData.dateCommande = new Date(value);
            break;
          case 'client':
          case 'nom client':
            orderData.clientNom = value;
            break;
          case 'téléphone':
          case 'telephone':
            orderData.clientTelephone = value;
            break;
          case 'adresse':
          case 'adresse livraison':
            orderData.adresseLivraison = value;
            break;
          case 'produit':
            orderData.produits = [{ nom: value, quantite: 1, prix: 0 }];
            break;
          case 'quantité':
          case 'qte':
            if (orderData.produits && orderData.produits[0]) {
              orderData.produits[0].quantite = parseInt(value) || 1;
            }
            break;
          case 'prix':
            if (orderData.produits && orderData.produits[0]) {
              orderData.produits[0].prix = parseFloat(value) || 0;
            }
            break;
          case 'boutique':
            orderData.boutique = value;
            break;
          case 'statut':
            orderData.status = value.toLowerCase() === 'en attente' ? 'en_attente' : 'en_attente';
            break;
        }
      });

      // Ajouter des valeurs par défaut
      orderData.googleSheetsId = `${config.spreadsheetId}_${config.sheetName}_${index}`;
      orderData.status = orderData.status || 'en_attente';
      orderData.boutique = orderData.boutique || 'Boutique principale';
      
      return orderData;
    }).filter(order => order.numeroCommande && order.clientNom); // Filtrer les lignes valides
  }

  async syncOrdersToDatabase(orders, config) {
    let created = 0;
    let updated = 0;

    for (const orderData of orders) {
      try {
        // Vérifier si la commande existe déjà
        const existingOrder = await Order.findOne({
          $or: [
            { numeroCommande: orderData.numeroCommande },
            { googleSheetsId: orderData.googleSheetsId }
          ]
        });

        if (existingOrder) {
          // Mettre à jour la commande existante
          await Order.findByIdAndUpdate(existingOrder._id, {
            ...orderData,
            updatedAt: new Date()
          });
          updated++;
        } else {
          // Créer une nouvelle commande
          await Order.create(orderData);
          created++;
        }
      } catch (error) {
        console.error(`Erreur lors de la synchronisation de la commande ${orderData.numeroCommande}:`, error);
      }
    }

    return { created, updated };
  }

  async getCurrentConfig() {
    if (!this.currentConfig) {
      await this.loadActiveConfig();
    }
    return this.currentConfig;
  }

  async testAccess(spreadsheetId = null, sheetName = null) {
    try {
      // S'assurer que le service est initialisé
      if (!this.isInitialized || !this.sheets) {
        await this.initialize();
      }

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
      // S'assurer que le service est initialisé
      if (!this.isInitialized || !this.sheets) {
        await this.initialize();
      }

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

  // Méthode pour forcer la synchronisation manuelle
  async forceSyncOrders() {
    try {
      console.log('🔄 Début de la synchronisation manuelle...');
      
      // S'assurer que le service est initialisé
      if (!this.isInitialized || !this.sheets) {
        console.log('⚠️ Service non initialisé, initialisation en cours...');
        await this.initialize();
      }
      
      // Récupérer la configuration active
      console.log('📋 Récupération de la configuration active...');
      const config = await this.getCurrentConfig();
      
      if (!config) {
        throw new Error('Aucune configuration active trouvée');
      }
      
      console.log(`✅ Configuration active trouvée: ${config.name} (${config.spreadsheetId})`);
      
      // Vérifier que la configuration a les données nécessaires
      if (!config.spreadsheetId || !config.sheetName) {
        throw new Error('Configuration incomplète: spreadsheetId ou sheetName manquant');
      }
      
      // Tester l'accès avant la synchronisation
      console.log('🔍 Test d\'accès au spreadsheet...');
      await this.testAccess(config.spreadsheetId, config.sheetName);
      console.log('✅ Accès au spreadsheet confirmé');
      
      // Lancer la synchronisation
      console.log('🔄 Lancement de la synchronisation...');
      const result = await this.syncOrdersFromNewSheet(config);
      
      console.log('✅ Synchronisation manuelle terminée avec succès');
      return result;
      
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation forcée:', {
        message: error.message,
        stack: error.stack,
        config: this.currentConfig ? {
          name: this.currentConfig.name,
          spreadsheetId: this.currentConfig.spreadsheetId,
          sheetName: this.currentConfig.sheetName
        } : 'Aucune configuration'
      });
      
      // Retourner une erreur structurée
      throw new Error(`Échec de la synchronisation: ${error.message}`);
    }
  }
}

module.exports = new GoogleSheetsService();