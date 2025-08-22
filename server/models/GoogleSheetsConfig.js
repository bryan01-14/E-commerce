const mongoose = require('mongoose');

const googleSheetsConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  spreadsheetId: {
    type: String,
    required: true,
    trim: true
  },
  sheetName: {
    type: String,
    required: true,
    trim: true,
    default: 'Feuille 1'
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index pour améliorer les performances
googleSheetsConfigSchema.index({ isActive: 1 });
googleSheetsConfigSchema.index({ spreadsheetId: 1 });

module.exports = mongoose.model('GoogleSheetsConfig', googleSheetsConfigSchema);
