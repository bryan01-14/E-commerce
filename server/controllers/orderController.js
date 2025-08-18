// const Order = require('../models/Order');

// exports.createOrder = async (req, res) => {
//   try {
//     // Validation des champs obligatoires
//     const requiredFields = [
//       'numeroCommande', 'dateCommande', 'clientNom', 
//       'clientTelephone', 'adresseLivraison', 'produit',
//       'quantite', 'prix', 'boutique'
//     ];
    
//     const missingFields = requiredFields.filter(field => !req.body[field]);
    
//     if (missingFields.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: `Champs manquants: ${missingFields.join(', ')}`
//       });
//     }

//     // Création de la commande
//     const orderData = {
//       ...req.body,
//       quantite: parseInt(req.body.quantite) || 1,
//       prix: parseFloat(req.body.prix) || 0,
//       dateCommande: new Date(req.body.dateCommande),
//       dateRappel: req.body.dateRappel ? new Date(req.body.dateRappel) : null,
//       status: req.body.status || 'en_attente'
//     };

//     const newOrder = new Order(orderData);
//     await newOrder.save();
    
//     res.status(201).json({ 
//       success: true,
//       message: 'Commande créée avec succès', 
//       order: newOrder 
//     });
//   } catch (error) {
//     console.error('Erreur création commande:', error);
    
//     if (error.name === 'ValidationError') {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation error',
//         errors: error.errors
//       });
//     }
    
//     if (error.code === 11000) {
//       return res.status(400).json({
//         success: false,
//         message: 'Ce numéro de commande existe déjà'
//       });
//     }
    
//     res.status(500).json({
//       success: false,
//       message: 'Erreur serveur lors de la création de la commande',
//       error: error.message
//     });
//   }
// };