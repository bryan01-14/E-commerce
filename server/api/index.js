// Fichier spécifique pour Vercel
const app = require('../index');
const serverless = require('serverless-http');

// Exportez directement l'application sans créer de nouveau serveur
module.exports = serverless(app);