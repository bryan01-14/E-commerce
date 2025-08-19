const jwt = require('jsonwebtoken');
const User = require('../models/User');



// middleware/auth.js
const authenticate = async (req, res, next) => {
  try {
    // Vérifier d'abord la session
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user && user.actif) {
        req.user = user;
        return next();
      }
    }

    // Si pas de session, vérifier le token JWT
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId);
        
        if (user && user.actif) {
          req.user = user;
          
          // Créer/mettre à jour la session pour les requêtes futures
          req.session.userId = user._id;
          req.session.role = user.role;
          
          return next();
        }
      }
    }

    // Si aucune méthode d'authentification n'a fonctionné
    return res.status(401).json({ 
      error: 'Accès refusé. Token ou session manquant.' 
    });

  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalide.' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré.' });
    }
    
    res.status(500).json({ error: 'Erreur d\'authentification.' });
  }
};

// Middleware pour vérifier les rôles
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Utilisateur non authentifié.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Accès refusé. Permissions insuffisantes.' 
      });
    }

    next();
  };
};

// Middleware spécifique pour les administrateurs
const requireAdmin = authorize(['admin']);

// Middleware spécifique pour les closeurs
const requireCloseur = authorize(['admin', 'closeur']);

// Middleware spécifique pour les livreurs
const requireLivreur = authorize(['admin', 'closeur', 'livreur']);

// Middleware pour vérifier le rôle
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Utilisateur non authentifié'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Accès non autorisé'
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  requireAdmin,
  requireCloseur,
  requireLivreur,
  requireRole
};