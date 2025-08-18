const express = require('express');
const router = express.Router();
const sheetsService = require('../services/googleSheets');

// Test route - À supprimer après vérification
router.get('/test-connection', (req, res) => {
  res.json({ message: "Connection test successful!", timestamp: new Date() });
});

// Main data route
router.get('/data', async (req, res) => {
  console.log("Accès à /api/google-sheets/data");
  
  try {
    const rawData = await sheetsService.getData();
    console.log("Données brutes reçues:", rawData ? rawData.length : 'null');

    if (!rawData || rawData.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Aucune donnée trouvée dans le Google Sheet" 
      });
    }

    const [headers, ...rows] = rawData;
    const formattedData = rows.map(row => {
      return headers.reduce((obj, header, index) => {
        obj[header] = row[index] || null;
        return obj;
      }, {});
    });

    res.json({
      success: true,
      data: formattedData,
      headers,
      count: formattedData.length
    });

  } catch (error) {
    console.error("ERREUR COMPLÈTE:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

module.exports = router;