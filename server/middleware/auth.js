// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware pour vérifier l'authentification
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
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Accès refusé. Token ou session manquant.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.actif) {
      return res.status(401).json({ 
        error: 'Token invalide ou utilisateur inactif.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    res.status(401).json({ 
      error: 'Token invalide.' 
    });
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
// middleware/auth.js
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    next();
  };
};


module.exports = {
  requireRole,
  authenticate,
  authorize,
  requireAdmin,
  requireCloseur,
  requireLivreur
};