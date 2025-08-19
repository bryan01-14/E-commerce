const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation pour la connexion
const loginValidation = [
  body('username')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Le nom d\'utilisateur doit contenir au moins 3 caractères'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
];

// Validation pour l'inscription
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Le nom d\'utilisateur doit contenir entre 3 et 50 caractères')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('nom')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Le nom doit contenir au moins 2 caractères'),
  body('prenom')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Le prénom doit contenir au moins 2 caractères'),
  body('role')
    .isIn(['admin', 'closeur', 'livreur'])
    .withMessage('Rôle invalide'),
  body('boutique')
    .if(body('role').equals('closeur'))
    .notEmpty()
    .withMessage('La boutique est requise pour les closeurs')
];

// Route de connexion
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Données invalides',
        details: errors.array() 
      });
    }

    const { username, password } = req.body;

    // Rechercher l'utilisateur
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }],
      actif: true 
    });

    if (!user) {
      console.warn('[AUTH] Login échec: utilisateur introuvable/inactif', { username });
      return res.status(401).json({ 
        error: 'Nom d\'utilisateur ou mot de passe incorrect' 
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.warn('[AUTH] Login échec: mot de passe invalide', { userId: user._id.toString() });
      return res.status(401).json({ 
        error: 'Nom d\'utilisateur ou mot de passe incorrect' 
      });
    }

    // Mettre à jour la dernière connexion
    user.derniereConnexion = new Date();
    await user.save();

    // Créer la session
    req.session.userId = user._id;
    req.session.role = user.role;

    // Générer le token JWT
    // Générer le token JWT
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        boutique: user.boutique 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    // Envoyer la réponse AVEC le token
    res.json({
      message: 'Connexion réussie',
      user: user.toPublicJSON(),
      token, // ← Assurez-vous que le token est inclus
      sessionId: req.sessionID
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ 
      error: 'Erreur interne du serveur' 
    });
  }
});

// Route d'inscription du premier admin principal (pas d'authentification requise)
router.post('/register', async (req, res) => {
  try {
    // Vérifier s'il existe déjà un admin principal
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(403).json({ 
        error: 'Un administrateur principal existe déjà. L\'inscription est fermée.' 
      });
    }

    // Validation simplifiée pour le premier admin
    const { nom, email, telephone, password } = req.body;

    if (!nom || !email || !telephone || !password) {
      return res.status(400).json({ 
        error: 'Tous les champs sont requis' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [{ email }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Un utilisateur avec cet email existe déjà' 
      });
    }

    // Créer le premier admin principal
    const newUser = new User({
      username: email.split('@')[0], // Utiliser la partie locale de l'email comme username
      email,
      password,
      nom,
      prenom: nom.split(' ')[0] || nom, // Utiliser le premier mot du nom comme prénom
      role: 'admin',
      telephone
    });

    await newUser.save();

    res.status(201).json({
      message: 'Administrateur principal créé avec succès',
      user: newUser.toPublicJSON()
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ 
      error: 'Erreur interne du serveur' 
    });
  }
});
// // Supprimer cette section en double :
// // Route pour vérifier l'authentification
// router.get('/me', authenticate, async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id);
//     if (!user) {
//       return res.status(404).json({ error: 'Utilisateur non trouvé' });
//     }
    
//     res.json({
//       user: user.toPublicJSON(),
//       sessionId: req.sessionID
//     });
//   } catch (error) {
//     console.error('Erreur route /me:', error);
//     res.status(500).json({ error: 'Erreur serveur' });
//   }
// });

// Route d'inscription d'utilisateurs (réservée aux admins)
router.post('/register-user', authenticate, requireAdmin, registerValidation, async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Données invalides',
        details: errors.array() 
      });
    }

    const { username, email, password, nom, prenom, role, boutique, telephone } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Un utilisateur avec ce nom d\'utilisateur ou email existe déjà' 
      });
    }

    // Créer le nouvel utilisateur
    const newUser = new User({
      username,
      email,
      password,
      nom,
      prenom,
      role,
      boutique: role === 'closeur' ? boutique : undefined,
      telephone
    });

    await newUser.save();

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: newUser.toPublicJSON()
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ 
      error: 'Erreur interne du serveur' 
    });
  }
});

// Route de déconnexion
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erreur lors de la déconnexion:', err);
      return res.status(500).json({ 
        error: 'Erreur lors de la déconnexion' 
      });
    }
    
    res.clearCookie('connect.sid');
    res.json({ message: 'Déconnexion réussie' });
  });
});

router.get('/me', authenticate, (req, res) => {
  const token = jwt.sign(
    { 
      userId: req.user._id, 
      role: req.user.role,
      boutique: req.user.boutique 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );

  res.json({
    user: req.user.toPublicJSON(),
    token, // ← AJOUTER le token ici
    sessionId: req.sessionID
  });
}
);

// Route pour vérifier s'il existe déjà un admin principal
router.get('/check-admin', async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    res.json({ hasAdmin: !!existingAdmin });
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    res.status(500).json({ 
      error: 'Erreur interne du serveur' 
    });
  }
});

// Route pour changer le mot de passe
router.post('/change-password', authenticate, [
  body('currentPassword')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe actuel doit contenir au moins 6 caractères'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
], async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Données invalides',
        details: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        error: 'Mot de passe actuel incorrect' 
      });
    }

    // Mettre à jour le mot de passe
    req.user.password = newPassword;
    await req.user.save();

    res.json({ message: 'Mot de passe modifié avec succès' });

  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ 
      error: 'Erreur interne du serveur' 
    });
  }
});

// Route pour obtenir les informations de session
router.get('/session', (req, res) => {
  res.json({
    sessionId: req.sessionID,
    userId: req.session.userId,
    role: req.session.role
  });
});

module.exports = router;
