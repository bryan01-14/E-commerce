// Fichier test.js temporaire
require('dotenv').config();
const sheetsService = require('./services/googleSheets');

async function test() {
  try {
    console.log('Test d\'accès Google Sheets...');
    await sheetsService.initialize();
    const data = await sheetsService.getData();
    console.log('Données récupérées:', data);
  } catch (error) {
    console.error('Échec du test:', error);
  }
}

test();