const { google } = require('googleapis');
const GoogleSheetsConfig = require('../models/GoogleSheetsConfig');
const Order = require('../models/Order');

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.currentConfig = null;
    this.isInitialized = false;
    this.initializationPromise = null; // Pour éviter les initialisations multiples
  }

  async initialize() {
    try {
      // Éviter la double initialisation
      if (this.isInitialized && this.sheets) {
        console.log('✅ Service déjà initialisé');
        return { success: true };
      }

      // Si une initialisation est en cours, attendre
      if (this.initializationPromise) {
        console.log('⏳ Initialisation en cours, attente...');
        return await this.initializationPromise;
      }

      // Créer une nouvelle promesse d'initialisation
      this.initializationPromise = this._performInitialization();
      const result = await this.initializationPromise;
      this.initializationPromise = null;
      return result;

    } catch (error) {
      this.initializationPromise = null;
      console.error('❌ Erreur lors de l\'initialisation:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async _performInitialization() {
    try {
      console.log('🔄 Initialisation du service Google Sheets...');

      // Vérification des variables d'environnement
      const requiredVars = [
        'GOOGLE_SHEETS_PRIVATE_KEY',
        'GOOGLE_SHEETS_CLIENT_EMAIL',
        'GOOGLE_SHEETS_PROJECT_ID'
      ];

      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      if (missingVars.length > 0) {
        throw new Error(`Variables d'environnement manquantes: ${missingVars.join(', ')}`);
      }

      // Création de l'authentification
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

      console.log('✅ Service Google Sheets initialisé avec succès');

      // Charger la configuration active par défaut
      await this.loadActiveConfig();
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async loadActiveConfig() {
    try {
      console.log('📋 Chargement de la configuration active...');
      
      // Essayer de charger la configuration active depuis la base de données
      let activeConfig = null;
      try {
        activeConfig = await GoogleSheetsConfig.findOne({ isActive: true });
      } catch (dbError) {
        console.log('⚠️ Erreur base de données, utilisation du fallback:', dbError.message);
      }
      
      if (activeConfig) {
        this.currentConfig = activeConfig;
        console.log(`✅ Configuration active chargée: ${activeConfig.name} (${activeConfig.spreadsheetId})`);
        return activeConfig;
      } else {
        console.log('⚠️ Aucune configuration active trouvée en base, utilisation du fallback...');
        
        // Fallback sur les variables d'environnement
        const fallbackConfig = {
          spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "1QnulUnO9SfUfRUstTD1YKsNQIR18dd-JJ-qqPU0OmNU",
          sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Feuille2',
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
      console.log(`🔄 Activation de la configuration: ${configId}`);
      
      // Désactiver toutes les configurations
      await GoogleSheetsConfig.updateMany({}, { isActive: false });
      
      // Activer la configuration sélectionnée
      const config = await GoogleSheetsConfig.findByIdAndUpdate(
        configId,
        { isActive: true, lastUsed: new Date() },
        { new: true }
      );
      
      if (!config) {
        throw new Error('Configuration non trouvée');
      }
      
      console.log(`✅ Configuration activée: ${config.name}`);
      console.log(`   Spreadsheet ID: ${config.spreadsheetId}`);
      console.log(`   Nom de feuille: "${config.sheetName}"`);
      
      // Vérifier automatiquement l'accès à la nouvelle feuille
      console.log('🔍 Vérification automatique de l\'accès à la nouvelle feuille...');
      try {
        const accessResult = await this.testAccess(config.spreadsheetId, config.sheetName);
        console.log('✅ Accès à la nouvelle feuille vérifié avec succès');
        console.log(`   Titre du spreadsheet: ${accessResult.spreadsheetTitle}`);
        console.log(`   Feuilles disponibles: ${accessResult.availableSheets.join(', ')}`);
        console.log(`   Feuille configurée existe: ${accessResult.sheetExists ? 'OUI' : 'NON'}`);
        
        if (!accessResult.sheetExists) {
          console.log('⚠️ ATTENTION: La feuille configurée n\'existe pas !');
          console.log(`   Feuille configurée: "${config.sheetName}"`);
          console.log(`   Feuilles disponibles: ${accessResult.availableSheets.join(', ')}`);
          
          // Suggérer des corrections automatiques
          if (accessResult.availableSheets.length > 0) {
            console.log('💡 Suggestion: Utilisez une des feuilles disponibles');
            console.log('   Feuilles suggérées:', accessResult.availableSheets.join(', '));
          }
        }
        
        // Synchroniser automatiquement TOUTES les données de la nouvelle feuille
        console.log('🔄 Synchronisation complète des données de la nouvelle feuille...');
        console.log('📊 Récupération de toutes les données pour mise à jour du total...');
        
        // 1. Récupérer toutes les données de la nouvelle feuille
        const allData = await this.getData(config.spreadsheetId, config.sheetName);
        console.log(`📋 Données récupérées: ${allData.length} lignes au total`);
        
        // 2. Synchroniser complètement avec la base de données
        const syncResult = await this.syncOrdersFromNewSheet(config);
        console.log('✅ Synchronisation complète réussie');
        console.log(`   Nouvelles commandes: ${syncResult.created}`);
        console.log(`   Commandes mises à jour: ${syncResult.updated}`);
        console.log(`   Total traité: ${syncResult.total}`);
        
        // 3. Vérifier le total final des commandes
        const Order = require('../models/Order');
        const totalOrders = await Order.countDocuments();
        const activeOrders = await Order.countDocuments({ status: { $ne: 'livré' } });
        const deliveredOrders = await Order.countDocuments({ status: 'livré' });
        
        console.log('📊 Statistiques finales après changement de feuille:');
        console.log(`   Total des commandes: ${totalOrders}`);
        console.log(`   Commandes actives: ${activeOrders}`);
        console.log(`   Commandes livrées: ${deliveredOrders}`);
        
        return {
          success: true,
          config,
          accessResult,
          syncResult,
          totalStats: {
            total: totalOrders,
            active: activeOrders,
            delivered: deliveredOrders
          },
          message: 'Configuration activée et total des commandes mis à jour avec succès'
        };
        
      } catch (accessError) {
        console.error('❌ Erreur lors de la vérification de l\'accès:', accessError.message);
        
        // Retourner des informations détaillées pour l'interface
        return {
          success: false,
          config,
          error: accessError.message,
          message: 'Configuration activée mais erreur d\'accès à la feuille',
          suggestions: [
            'Vérifiez que le nom de la feuille est correct',
            'Vérifiez que la feuille existe dans le spreadsheet',
            'Vérifiez les permissions du compte de service'
          ]
        };
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'activation de la configuration:', error);
      throw error;
    }
  }

  async syncOrdersFromNewSheet(config) {
    try {
      console.log(`🔄 Synchronisation complète depuis la nouvelle feuille: "${config.sheetName}"`);
      
      // 1. Récupérer toutes les données de la nouvelle feuille
      const sheetData = await this.getData(config.spreadsheetId, config.sheetName);
      console.log(`📋 Données récupérées de la feuille: ${sheetData.length} lignes`);
      
      if (sheetData.length === 0) {
        console.log('⚠️ Aucune donnée trouvée dans la feuille');
        return {
          created: 0,
          updated: 0,
          total: 0,
          message: 'Aucune donnée à synchroniser'
        };
      }
      
      // 2. Transformer les données en commandes
      const orders = this.transformSheetDataToOrders(sheetData);
      console.log(`🔄 Transformation en commandes: ${orders.length} commandes à traiter`);
      
      // 3. Synchroniser complètement avec la base de données
      const syncResult = await this.syncOrdersToDatabase(orders);
      console.log('✅ Synchronisation complète réussie');
      
      // 4. Vérifier le total final
      const Order = require('../models/Order');
      const totalOrders = await Order.countDocuments();
      const activeOrders = await Order.countDocuments({ status: { $ne: 'livré' } });
      const deliveredOrders = await Order.countDocuments({ status: 'livré' });
      
      console.log('📊 Statistiques finales après synchronisation:');
      console.log(`   Total des commandes: ${totalOrders}`);
      console.log(`   Commandes actives: ${activeOrders}`);
      console.log(`   Commandes livrées: ${deliveredOrders}`);
      
      return {
        ...syncResult,
        totalStats: {
          total: totalOrders,
          active: activeOrders,
          delivered: deliveredOrders
        },
        message: `Synchronisation complète réussie. Total: ${totalOrders} commandes`
      };
      
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation depuis la nouvelle feuille:', error);
      throw error;
    }
  }

  transformSheetDataToOrders(sheetData) {
    try {
      if (!sheetData || sheetData.length < 2) {
        console.log('⚠️ Données insuffisantes pour la transformation');
        return [];
      }

      const [headers, ...rows] = sheetData;
      console.log(`📋 En-têtes détectés: ${headers.join(', ')}`);
      console.log(`📊 Lignes de données à traiter: ${rows.length}`);

      // Mapping intelligent des colonnes
      const columnMapping = this.detectColumnMapping(headers);
      console.log('🔍 Mapping des colonnes détecté:', columnMapping);

      const orders = [];
      let validOrders = 0;
      let skippedRows = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Ignorer les lignes vides
        if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
          skippedRows++;
          continue;
        }

        try {
          const order = this.createOrderFromRow(row, headers, columnMapping, i + 2); // +2 car on commence à la ligne 2 (après les en-têtes)
          if (order) {
            orders.push(order);
            validOrders++;
          } else {
            skippedRows++;
          }
        } catch (rowError) {
          console.log(`⚠️ Erreur lors du traitement de la ligne ${i + 2}:`, rowError.message);
          skippedRows++;
        }
      }

      console.log(`✅ Transformation terminée: ${validOrders} commandes valides, ${skippedRows} lignes ignorées`);
      
      if (validOrders === 0) {
        console.log('⚠️ Aucune commande valide trouvée');
        console.log('💡 Vérifiez le format de vos données et les en-têtes de colonnes');
      }

      return orders;

    } catch (error) {
      console.error('❌ Erreur lors de la transformation des données:', error);
      throw new Error(`Erreur lors de la transformation des données: ${error.message}`);
    }
  }

  detectColumnMapping(headers) {
    const mapping = {};
    
    headers.forEach((header, index) => {
      const headerLower = header.toString().toLowerCase().trim();
      
      // Mapping intelligent des colonnes
      if (headerLower.includes('nom') || headerLower.includes('client') || headerLower.includes('name')) {
        mapping.clientName = index;
      } else if (headerLower.includes('adresse') || headerLower.includes('address')) {
        mapping.address = index;
      } else if (headerLower.includes('téléphone') || headerLower.includes('phone') || headerLower.includes('tel')) {
        mapping.phone = index;
      } else if (headerLower.includes('produit') || headerLower.includes('product') || headerLower.includes('article')) {
        mapping.product = index;
      } else if (headerLower.includes('quantité') || headerLower.includes('quantity') || headerLower.includes('qte')) {
        mapping.quantity = index;
      } else if (headerLower.includes('prix') || headerLower.includes('price') || headerLower.includes('montant')) {
        mapping.price = index;
      } else if (headerLower.includes('date') || headerLower.includes('date commande')) {
        mapping.orderDate = index;
      } else if (headerLower.includes('statut') || headerLower.includes('status') || headerLower.includes('état')) {
        mapping.status = index;
      } else if (headerLower.includes('livreur') || headerLower.includes('delivery') || headerLower.includes('driver')) {
        mapping.deliveryPerson = index;
      }
    });

    console.log('🔍 Colonnes mappées:', mapping);
    return mapping;
  }

  createOrderFromRow(row, headers, columnMapping, rowNumber) {
    try {
      // Vérifier que la ligne contient des données essentielles
      const hasClientName = columnMapping.clientName !== undefined && row[columnMapping.clientName];
      const hasProduct = columnMapping.product !== undefined && row[columnMapping.product];
      
      if (!hasClientName || !hasProduct) {
        console.log(`⚠️ Ligne ${rowNumber} ignorée: données essentielles manquantes`);
        return null;
      }

      // Créer l'objet commande
      const order = {
        clientName: row[columnMapping.clientName] || 'Client inconnu',
        address: row[columnMapping.address] || 'Adresse non spécifiée',
        phone: row[columnMapping.phone] || 'Téléphone non spécifié',
        product: row[columnMapping.product] || 'Produit non spécifié',
        quantity: parseInt(row[columnMapping.quantity]) || 1,
        price: parseFloat(row[columnMapping.price]) || 0,
        orderDate: this.parseDate(row[columnMapping.orderDate]) || new Date(),
        status: row[columnMapping.status] || 'en attente',
        deliveryPerson: row[columnMapping.deliveryPerson] || null,
        sourceSheet: 'Google Sheets',
        lastUpdated: new Date()
      };

      // Validation des données
      if (order.quantity <= 0) order.quantity = 1;
      if (order.price < 0) order.price = 0;

      return order;

    } catch (error) {
      console.log(`⚠️ Erreur lors de la création de la commande ligne ${rowNumber}:`, error.message);
      return null;
    }
  }

  parseDate(dateString) {
    if (!dateString) return new Date();
    
    try {
      // Essayer différents formats de date
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Format français DD/MM/YYYY
      const frenchDate = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (frenchDate) {
        return new Date(frenchDate[3], frenchDate[2] - 1, frenchDate[1]);
      }
      
      // Format américain MM/DD/YYYY
      const americanDate = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (americanDate) {
        return new Date(americanDate[3], americanDate[1] - 1, americanDate[2]);
      }
      
      return new Date();
    } catch (error) {
      console.log('⚠️ Erreur lors du parsing de la date:', dateString);
      return new Date();
    }
  }

  async syncOrdersToDatabase(orders, config) {
    let created = 0;
    let updated = 0;

    try {
      console.log(`🔄 Synchronisation de ${orders.length} commandes avec la base de données...`);
      
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
          console.error(`⚠️ Erreur lors de la synchronisation de la commande ${orderData.numeroCommande}:`, error.message);
        }
      }

      console.log(`✅ Synchronisation terminée: ${created} créées, ${updated} mises à jour`);
      return { created, updated };
      
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation avec la base de données:', error);
      throw error;
    }
  }

  async getCurrentConfig() {
    try {
      if (!this.currentConfig) {
        await this.loadActiveConfig();
      }
      return this.currentConfig;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la configuration:', error);
      throw error;
    }
  }

  // Méthode pour encoder correctement les noms de feuilles
  encodeSheetName(sheetName) {
    if (!sheetName) return 'Sheet1';
    
    // TOUJOURS encoder avec des guillemets simples pour éviter tout problème
    // C'est la méthode la plus sûre pour Google Sheets API
    return `'${sheetName.replace(/'/g, "\\'")}'`;
  }

  async getData(spreadsheetId = null, sheetName = null) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const config = await this.getCurrentConfig();
      if (!config) {
        throw new Error('Aucune configuration active trouvée');
      }

      const targetSpreadsheetId = spreadsheetId || config.spreadsheetId;
      const targetSheetName = sheetName || config.sheetName;

      console.log(`📖 Lecture des données depuis: ${targetSpreadsheetId}`);
      console.log(`📋 Feuille cible: "${targetSheetName}"`);

      // Vérifier d'abord que la feuille existe
      console.log(`🔍 Vérification de l'existence de la feuille: "${targetSheetName}"`);
      try {
        const sheetsResponse = await this.sheets.spreadsheets.get({
          spreadsheetId: targetSpreadsheetId,
          fields: 'sheets.properties.title'
        });
        
        const availableSheets = sheetsResponse.data.sheets.map(s => s.properties.title);
        console.log(`📋 Feuilles disponibles: ${availableSheets.join(', ')}`);
        
        if (!availableSheets.includes(targetSheetName)) {
          console.log(`❌ La feuille "${targetSheetName}" n'existe pas`);
          console.log(`💡 Feuilles disponibles: ${availableSheets.join(', ')}`);
          
          // Suggérer des corrections
          const similarSheets = availableSheets.filter(name =>
            name.toLowerCase().includes(targetSheetName.toLowerCase()) ||
            targetSheetName.toLowerCase().includes(name.toLowerCase())
          );
          
          if (similarSheets.length > 0) {
            console.log(`💡 Feuilles similaires trouvées: ${similarSheets.join(', ')}`);
            throw new Error(`La feuille "${targetSheetName}" n'existe pas. Feuilles similaires: ${similarSheets.join(', ')}. Feuilles disponibles: ${availableSheets.join(', ')}`);
          } else {
            throw new Error(`La feuille "${targetSheetName}" n'existe pas. Feuilles disponibles: ${availableSheets.join(', ')}`);
          }
        }
        
        console.log(`✅ Feuille "${targetSheetName}" trouvée`);
      } catch (error) {
        if (error.message.includes('n\'existe pas')) {
          throw error; // Re-throw specific error for client
        }
        console.log('⚠️ Impossible de vérifier l\'existence de la feuille, tentative de lecture directe...');
      }

      // TOUJOURS utiliser des guillemets pour éviter les erreurs de parsing
      const quotedRange = `'${targetSheetName}'!A:Z`;
      console.log(`🔍 Tentative de lecture avec le range: ${quotedRange}`);

      try {
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: targetSpreadsheetId,
          range: quotedRange
        });

        const data = response.data.values || [];
        console.log(`✅ Lecture réussie: ${data.length} lignes`);
        
        if (data.length > 0) {
          console.log(`📖 Première ligne (en-têtes): ${data[0].join(' | ')}`);
          if (data.length > 1) {
            console.log(`📖 Deuxième ligne (données): ${data[1].join(' | ')}`);
          }
        }

        return data;

      } catch (readError) {
        console.log('⚠️ Erreur lors de la lecture avec le range complet:', readError.message);
        
        // Si l'erreur est "Unable to parse range", essayer avec une approche différente
        if (readError.message.includes('Unable to parse range')) {
          console.log('🔄 Tentative de récupération avec une approche alternative...');
          
          try {
            // Essayer d'abord avec une seule cellule
            const simpleRange = `'${targetSheetName}'!A1`;
            console.log(`🔍 Test avec le range simple: ${simpleRange}`);
            
            const simpleResponse = await this.sheets.spreadsheets.values.get({
              spreadsheetId: targetSpreadsheetId,
              range: simpleRange
            });
            
            console.log('✅ Lecture avec range simple réussie');
            
            // Maintenant essayer de lire plus de données
            const extendedRange = `'${targetSheetName}'!A:Z`;
            console.log(`🔍 Tentative de lecture étendue: ${extendedRange}`);
            
            const extendedResponse = await this.sheets.spreadsheets.values.get({
              spreadsheetId: targetSpreadsheetId,
              range: extendedRange
            });
            
            const data = extendedResponse.data.values || [];
            console.log(`✅ Lecture étendue réussie: ${data.length} lignes`);
            return data;
            
          } catch (retryError) {
            console.log('❌ Échec de la récupération alternative:', retryError.message);
            
            // Fournir des informations détaillées sur l'erreur
            throw new Error(`Impossible de lire la feuille "${targetSheetName}". Erreur: ${retryError.message}. Vérifiez le nom de la feuille et les permissions.`);
          }
        }
        
        // Si ce n'est pas une erreur de parsing, re-throw l'erreur originale
        throw readError;
      }

    } catch (error) {
      console.error('❌ Erreur lors de la lecture des données:', error.message);
      
      // Améliorer les messages d'erreur pour l'interface
      let userFriendlyError = error.message;
      let suggestions = [];
      
      if (error.message.includes('n\'existe pas')) {
        userFriendlyError = 'La feuille configurée n\'existe pas';
        suggestions = [
          'Vérifiez le nom exact de la feuille dans Google Sheets',
          'Utilisez une des feuilles disponibles',
          'Ou créez une nouvelle feuille avec le nom configuré'
        ];
      } else if (error.message.includes('Unable to parse range')) {
        userFriendlyError = 'Erreur de format du nom de feuille';
        suggestions = [
          'Vérifiez que le nom de la feuille est correct',
          'Évitez les caractères spéciaux dans le nom',
          'Utilisez des noms simples'
        ];
      } else if (error.message.includes('Impossible de lire')) {
        userFriendlyError = 'Impossible de lire la feuille';
        suggestions = [
          'Vérifiez que la feuille contient des données',
          'Vérifiez les permissions du compte de service',
          'Vérifiez que la feuille n\'est pas protégée'
        ];
      } else if (error.message.includes('Accès refusé')) {
        userFriendlyError = 'Accès refusé au Google Sheet';
        suggestions = [
          'Vérifiez que le compte de service a accès au spreadsheet',
          'Partagez le spreadsheet avec l\'email du compte de service',
          'Donnez les permissions "Éditeur" au compte de service'
        ];
      }
      
      throw {
        success: false,
        error: userFriendlyError,
        originalError: error.message,
        suggestions,
        message: 'Erreur lors de la lecture des données'
      };
    }
  }

  // Méthode pour tester l'accès avec gestion robuste des noms de feuilles
  async testAccess(spreadsheetId = null, sheetName = null) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const config = await this.getCurrentConfig();
      if (!config) {
        throw new Error('Aucune configuration active trouvée');
      }

      const testSpreadsheetId = spreadsheetId || config.spreadsheetId;
      const testSheetName = sheetName || config.sheetName;

      console.log(`🔍 Test d'accès au spreadsheet: ${testSpreadsheetId}`);
      console.log(`📋 Nom de feuille testé: "${testSheetName}"`);

      // 1. Tester l'accès au spreadsheet
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: testSpreadsheetId,
        fields: 'properties.title,sheets.properties.title'
      });

      const spreadsheetTitle = response.data.properties.title;
      const availableSheets = response.data.sheets.map(s => s.properties.title);
      const sheetExists = availableSheets.includes(testSheetName);

      console.log(`✅ Accès au spreadsheet réussi: ${spreadsheetTitle}`);
      console.log(`📋 Feuilles disponibles: ${availableSheets.join(', ')}`);
      console.log(`🔍 Feuille testée: "${testSheetName}"`);
      console.log(`✅ Feuille existe: ${sheetExists ? 'OUI' : 'NON'}`);

      // 2. Vérifier si la feuille testée peut être lue
      if (testSheetName && sheetExists) {
        try {
          // Test avec une cellule simple d'abord
          const testRange = `'${testSheetName}'!A1`;
          console.log(`🔍 Test de lecture avec le range: ${testRange}`);
          
          const testResponse = await this.sheets.spreadsheets.values.get({
            spreadsheetId: testSpreadsheetId,
            range: testRange
          });

          console.log(`✅ Lecture de la feuille réussie`);
          if (testResponse.data.values && testResponse.data.values.length > 0) {
            console.log(`📖 Première cellule (A1): "${testResponse.data.values[0][0]}"`);
          }
        } catch (readError) {
          console.log('⚠️ Erreur lors de la lecture de la feuille:', readError.message);
          
          if (readError.message.includes('Unable to parse range')) {
            console.log('🔍 Diagnostic du problème de parsing...');
            console.log(`   Nom de feuille original: "${testSheetName}"`);
            console.log(`   Nom avec guillemets: '${testSheetName}'`);
            console.log(`   Longueur du nom: ${testSheetName.length}`);
            console.log(`   Caractères spéciaux détectés: ${/[^\w\s]/.test(testSheetName) ? 'OUI' : 'NON'}`);
            console.log(`   Feuilles disponibles: ${availableSheets.join(', ')}`);
            
            // Trouver des feuilles similaires
            const similarSheets = availableSheets.filter(name =>
              name.toLowerCase().includes(testSheetName.toLowerCase()) ||
              testSheetName.toLowerCase().includes(name.toLowerCase())
            );
            
            if (similarSheets.length > 0) {
              console.log(`   💡 Feuilles similaires trouvées: ${similarSheets.join(', ')}`);
            }
            
            throw new Error(`Impossible de lire la feuille "${testSheetName}". Vérifiez le nom et les permissions. Feuilles disponibles: ${availableSheets.join(', ')}`);
          }
          
          throw new Error(`Impossible de lire la feuille "${testSheetName}". Vérifiez le nom et les permissions. Feuilles disponibles: ${availableSheets.join(', ')}`);
        }
      } else if (testSheetName && !sheetExists) {
        console.log(`❌ La feuille "${testSheetName}" n'existe pas dans le spreadsheet`);
        console.log(`💡 Feuilles disponibles: ${availableSheets.join(', ')}`);
        
        // Suggérer des corrections
        const similarSheets = availableSheets.filter(name =>
          name.toLowerCase().includes(testSheetName.toLowerCase()) ||
          testSheetName.toLowerCase().includes(name.toLowerCase())
        );
        
        if (similarSheets.length > 0) {
          console.log(`💡 Feuilles similaires trouvées: ${similarSheets.join(', ')}`);
        }
        
        throw new Error(`La feuille "${testSheetName}" n'existe pas dans le spreadsheet. Feuilles disponibles: ${availableSheets.join(', ')}`);
      }

      // 3. Retourner le résultat complet
      return {
        success: true,
        spreadsheetTitle,
        availableSheets,
        sheetExists,
        testedSheet: testSheetName,
        message: `Accès réussi au spreadsheet "${spreadsheetTitle}"`
      };

    } catch (error) {
      console.error('❌ Erreur lors du test d\'accès:', error.message);
      
      // Améliorer les messages d'erreur pour l'interface
      let userFriendlyError = error.message;
      let suggestions = [];
      
      if (error.message.includes('Accès refusé')) {
        userFriendlyError = 'Accès refusé au Google Sheet';
        suggestions = [
          'Vérifiez que le compte de service a accès au spreadsheet',
          'Partagez le spreadsheet avec l\'email du compte de service',
          'Donnez les permissions "Éditeur" au compte de service'
        ];
      } else if (error.message.includes('n\'existe pas')) {
        userFriendlyError = 'La feuille configurée n\'existe pas';
        suggestions = [
          'Vérifiez le nom exact de la feuille dans Google Sheets',
          'Utilisez une des feuilles disponibles',
          'Ou créez une nouvelle feuille avec le nom configuré'
        ];
      } else if (error.message.includes('Unable to parse range')) {
        userFriendlyError = 'Erreur de format du nom de feuille';
        suggestions = [
          'Vérifiez que le nom de la feuille est correct',
          'Évitez les caractères spéciaux dans le nom',
          'Utilisez des noms simples'
        ];
      } else if (error.message.includes('Impossible de lire')) {
        userFriendlyError = 'Impossible de lire la feuille';
        suggestions = [
          'Vérifiez que la feuille contient des données',
          'Vérifiez les permissions du compte de service',
          'Vérifiez que la feuille n\'est pas protégée'
        ];
      }
      
      throw {
        success: false,
        error: userFriendlyError,
        originalError: error.message,
        suggestions,
        message: 'Erreur lors du test d\'accès'
      };
    }
  }

  async getAllConfigs() {
    try {
      return await GoogleSheetsConfig.find().sort({ createdAt: -1 });
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des configurations:', error);
      throw error;
    }
  }

  async createConfig(configData) {
    try {
      // Vérifier l'accès avant de créer la configuration
      await this.testAccess(configData.spreadsheetId, configData.sheetName);
      
      const config = new GoogleSheetsConfig(configData);
      await config.save();
      
      console.log(`✅ Nouvelle configuration créée: ${config.name}`);
      return config;
    } catch (error) {
      console.error('❌ Erreur lors de la création de la configuration:', error);
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
      
      console.log(`✅ Configuration mise à jour: ${config.name}`);
      return config;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la configuration:', error);
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
      console.log(`✅ Configuration supprimée: ${config.name}`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de la configuration:', error);
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