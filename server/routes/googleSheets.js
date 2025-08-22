const express = require('express');
const router = express.Router();
const sheetsService = require('../services/googleSheets');
const { authenticate, requireRole } = require('../middleware/auth');

// Route GET pour /api/google-sheets/data
router.get('/data', async (req, res) => {
  console.log("Route /data appelée"); // Log de vérification
  
  try {
    const data = await sheetsService.getData();
    console.log("Données récupérées:", data); // Log des données
    
    if (!data || data.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Aucune donnée trouvée" 
      });
    }

    // Transformation des données
    const [headers, ...rows] = data;
    const formattedData = rows.map(row => {
      return headers.reduce((obj, header, index) => {
        obj[header] = row[index] || '';
        return obj;
      }, {});
    });

    res.json({
      success: true,
      data: formattedData,
      headers
    });

  } catch (error) {
    console.error("Erreur complète:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Route GET pour récupérer la configuration actuelle
router.get('/config/current', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const config = await sheetsService.getCurrentConfig();
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error("Erreur récupération configuration:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route GET pour récupérer toutes les configurations
router.get('/config', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const configs = await sheetsService.getAllConfigs();
    res.json({
      success: true,
      configs
    });
  } catch (error) {
    console.error("Erreur récupération configurations:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route POST pour créer une nouvelle configuration
router.post('/config', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { name, spreadsheetId, sheetName, description } = req.body;
    
    if (!name || !spreadsheetId) {
      return res.status(400).json({
        success: false,
        error: "Le nom et l'ID du spreadsheet sont requis"
      });
    }

    const configData = {
      name,
      spreadsheetId,
      sheetName: sheetName || 'Feuille 1',
      description,
      createdBy: req.user._id
    };

    const config = await sheetsService.createConfig(configData);
    
    res.status(201).json({
      success: true,
      config
    });
  } catch (error) {
    console.error("Erreur création configuration:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route PUT pour mettre à jour une configuration
router.put('/config/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const config = await sheetsService.updateConfig(id, updateData);
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error("Erreur mise à jour configuration:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route DELETE pour supprimer une configuration
router.delete('/config/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    await sheetsService.deleteConfig(id);
    
    res.json({
      success: true,
      message: "Configuration supprimée avec succès"
    });
  } catch (error) {
    console.error("Erreur suppression configuration:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route POST pour changer la configuration active
router.post('/config/:id/activate', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await sheetsService.setActiveConfig(id);
    
    res.json({
      success: true,
      message: "Configuration activée avec succès",
      config: result.config,
      syncResult: result.syncResult || null
    });
  } catch (error) {
    console.error("Erreur activation configuration:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route POST pour tester l'accès à un spreadsheet
router.post('/config/test', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { spreadsheetId, sheetName } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        error: "L'ID du spreadsheet est requis"
      });
    }

    const testResult = await sheetsService.testAccess(spreadsheetId, sheetName);
    
    res.json({
      success: true,
      testResult
    });
  } catch (error) {
    console.error("Erreur test accès:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route POST pour forcer la synchronisation des commandes
router.post('/sync-orders', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    console.log('🔄 Synchronisation manuelle demandée par:', req.user.username);
    
    // Vérifier que le service est disponible
    if (!sheetsService) {
      console.error('❌ Service Google Sheets non disponible');
      return res.status(500).json({
        success: false,
        error: 'Service Google Sheets non disponible'
      });
    }
    
    // Lancer la synchronisation
    const syncResult = await sheetsService.forceSyncOrders();
    
    console.log('✅ Synchronisation manuelle réussie:', syncResult);
    
    res.json({
      success: true,
      message: "Synchronisation des commandes terminée",
      syncResult
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation manuelle:', {
      message: error.message,
      stack: error.stack,
      user: req.user?.username
    });
    
    // Gestion spécifique des erreurs de parsing de range
    let userFriendlyError = error.message;
    let suggestions = [];
    
    if (error.message.includes('Unable to parse range')) {
      userFriendlyError = 'Erreur de format du nom de feuille Google Sheets';
      suggestions = [
        'Vérifiez que le nom de la feuille est correct',
        'Les noms avec espaces doivent être entre guillemets',
        'Évitez les caractères spéciaux dans les noms de feuilles',
        'Exemples valides: "Feuille 1", "Commandes", "Sheet1"'
      ];
    } else if (error.message.includes('Accès refusé')) {
      userFriendlyError = 'Accès refusé au Google Sheet';
      suggestions = [
        'Vérifiez que le compte de service a accès au spreadsheet',
        'Partagez le spreadsheet avec l\'email du compte de service',
        'Donnez les permissions "Éditeur" au compte de service'
      ];
    } else if (error.message.includes('Configuration incomplète')) {
      userFriendlyError = 'Configuration Google Sheets incomplète';
      suggestions = [
        'Vérifiez que tous les champs sont remplis',
        'L\'ID du spreadsheet et le nom de la feuille sont obligatoires'
      ];
    } else if (error.message.includes('Aucune configuration active')) {
      userFriendlyError = 'Aucune configuration Google Sheets active';
      suggestions = [
        'Créez une nouvelle configuration',
        'Activez une configuration existante',
        'Vérifiez que la base de données est initialisée'
      ];
    }
    
    // Retourner une erreur structurée avec suggestions
    res.status(500).json({
      success: false,
      error: userFriendlyError,
      details: process.env.NODE_ENV === 'development' ? {
        originalError: error.message,
        stack: error.stack,
        type: error.constructor.name
      } : undefined,
      suggestions: suggestions,
      help: suggestions.length > 0 ? 'Consultez les suggestions ci-dessous pour résoudre le problème' : undefined
    });
  }
});

module.exports = router;