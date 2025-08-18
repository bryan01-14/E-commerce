const { createServer } = require('http');
const app = require('../index');

module.exports = createServer((req, res) => {
  // Ajoutez ce middleware pour éviter l'erreur "listener is not a function"
  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url}`;
  }
  return app(req, res);
});