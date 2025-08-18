const app = require('../index');
const serverless = require('serverless-http');

// Configuration spécifique pour Vercel
const handler = serverless(app, {
  binary: ['image/*', 'application/pdf'] // Ajoutez les types binaires nécessaires
});

// Exportez directement sans wrapper supplémentaire
module.exports = async (req, res) => {
  // Gestion explicite du timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Function timed out'));
    }, 10000); // Timeout de 10 secondes
  });

  try {
    // Exécutez avec timeout
    await Promise.race([
      handler(req, res),
      timeoutPromise
    ]);
  } catch (err) {
    console.error('Error in handler:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};