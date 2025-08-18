const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  quantite: { type: Number, required: true, min: 1 },
  prix: { type: Number, required: true, min: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  googleSheetsId: { type: String, required: true },
  numeroCommande: { 
    type: String, 
    required: [true, 'Le numéro de commande est obligatoire'], 
    unique: true 
  },
  dateCommande: { type: Date, required: true },
  clientNom: { type: String, required: true },
  clientTelephone: { type: String, required: true },
  adresseLivraison: { type: String, required: true },
  produits: { 
    type: [productSchema], 
    required: true,
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'Au moins un produit est requis'
    }
  },
  boutique: { type: String, required: true },
  status: {
    type: String,
    enum: ['en_attente', 'attribué', 'livré', 'annulé'],
    default: 'en_attente'
  },
  livreurId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: function() {
      return this.status !== 'en_attente';
    }
  },
  dateAttribution: {
    type: Date,
    required: function() {
      return this.status !== 'en_attente';
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);