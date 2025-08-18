const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/check-admin - Vérifier s'il existe déjà un admin principal
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

// GET /api/users - Récupérer tous les utilisateurs
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      actif,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construire le filtre
    let filter = {};

    if (role) filter.role = role;
    if (actif !== undefined) filter.actif = actif === 'true';
    
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { nom: { $regex: search, $options: 'i' } },
        { prenom: { $regex: search, $options: 'i' } },
        { boutique: { $regex: search, $options: 'i' } }
      ];
    }

    // Options de tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Exécuter la requête
    const users = await User.find(filter)
      .select('-password')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Compter le total pour la pagination
    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/users/livreurs - Récupérer tous les livreurs
router.get('/livreurs', authenticate, async (req, res) => {
  try {
    const livreurs = await User.find({ 
      role: 'livreur', 
      actif: true 
    })
    .select('_id nom prenom telephone')
    .sort({ nom: 1, prenom: 1 });

    res.json({ livreurs });

  } catch (error) {
    console.error('Erreur lors de la récupération des livreurs:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/users - Créer un nouvel utilisateur
router.post('/', authenticate, requireAdmin, [
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
    .optional()
    .trim()
    .custom((value, { req }) => {
      if (req.body.role === 'closeur' && (!value || value.trim() === '')) {
        throw new Error('La boutique est requise pour les closeurs');
      }
      return true;
    })
], async (req, res) => {
  try {
    // Debug: afficher les données reçues
    console.log('Données reçues pour création utilisateur:', req.body);
    
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Erreurs de validation:', errors.array());
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
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({ 
      error: 'Erreur interne du serveur' 
    });
  }
});

// GET /api/users/:id - Récupérer un utilisateur spécifique
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// PUT /api/users/:id - Modifier un utilisateur
router.put('/:id', authenticate, requireAdmin, [
  body('nom')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Le nom doit contenir au moins 2 caractères'),
  body('prenom')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Le prénom doit contenir au moins 2 caractères'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('role')
    .optional()
    .isIn(['admin', 'closeur', 'livreur'])
    .withMessage('Rôle invalide'),
  body('actif')
    .optional()
    .isBoolean()
    .withMessage('Le statut actif doit être un booléen')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Données invalides',
        details: errors.array() 
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier l'unicité de l'email si modifié
    if (req.body.email && req.body.email !== user.email) {
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        return res.status(400).json({ 
          error: 'Un utilisateur avec cet email existe déjà' 
        });
      }
    }

    // Mettre à jour l'utilisateur
    Object.assign(user, req.body);
    await user.save();

    res.json({
      message: 'Utilisateur modifié avec succès',
      user: user.toPublicJSON()
    });

  } catch (error) {
    console.error('Erreur lors de la modification de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// DELETE /api/users/:id - Désactiver un utilisateur
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Désactiver l'utilisateur au lieu de le supprimer
    user.actif = false;
    await user.save();

    res.json({
      message: 'Utilisateur désactivé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la désactivation de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/users/:id/reactivate - Réactiver un utilisateur
router.post('/:id/reactivate', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    user.actif = true;
    await user.save();

    res.json({
      message: 'Utilisateur réactivé avec succès',
      user: user.toPublicJSON()
    });

  } catch (error) {
    console.error('Erreur lors de la réactivation de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/users/stats/overview - Statistiques des utilisateurs
router.get('/stats/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    // Statistiques par rôle
    const statsByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          total: { $sum: 1 },
          actifs: {
            $sum: { $cond: ['$actif', 1, 0] }
          },
          inactifs: {
            $sum: { $cond: ['$actif', 0, 1] }
          }
        }
      }
    ]);

    // Statistiques par boutique (pour les closeurs)
    const statsByBoutique = await User.aggregate([
      { $match: { role: 'closeur' } },
      {
        $group: {
          _id: '$boutique',
          total: { $sum: 1 },
          actifs: {
            $sum: { $cond: ['$actif', 1, 0] }
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Total général
    const total = await User.countDocuments();
    const actifs = await User.countDocuments({ actif: true });
    const inactifs = await User.countDocuments({ actif: false });

    res.json({
      statsByRole,
      statsByBoutique,
      total,
      actifs,
      inactifs
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;
