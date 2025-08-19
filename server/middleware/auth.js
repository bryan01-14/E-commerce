const jwt = require('jsonwebtoken');
const User = require('../models/User');



const authenticate = async (req, res, next) => {
  try {
    // Vérifier d'abord le token JWT dans les headers
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
          const user = await User.findById(decoded.userId);
          
          if (user && user.actif) {
            req.user = user;
            
            // Mettre à jour la session pour les requêtes futures
            req.session.userId = user._id;
            req.session.role = user.role;
            
            return next();
          }
        } catch (tokenError) {
          // Token invalide ou expiré, on continue avec la session
          console.log('Token invalide, vérification de la session...');
        }
      }
    }

    // Vérifier la session si le token n'est pas valide ou absent
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user && user.actif) {
        req.user = user;
        return next();
      }
    }

    // Si aucune méthode d'authentification n'a fonctionné
    return res.status(401).json({ 
      error: 'Accès refusé. Token ou session manquant.' 
    });

  } catch (error) {
    console.error('Erreur d\'authentification:', error);
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