const express = require('express');
const router = express.Router();
const sheetsService = require('../services/googleSheets');

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

module.exports = router;