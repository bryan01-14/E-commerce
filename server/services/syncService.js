// server/services/syncService.js
const Order = require('../models/Order');

class SyncService {
  async syncOrders() {
    try {
      // 1. Récupérer les données de Google Sheets
      const rawData = await this.getDataFromSheets();
      
      // 2. Transformer les données
      const ordersData = this.transformSheetData(rawData);
      
      // 3. Synchroniser avec la base de données
      const results = await Promise.all(
        ordersData.map(orderData => this.upsertOrder(orderData))
      );
      
      return {
        created: results.filter(r => r.created).length,
        updated: results.filter(r => r.updated).length
      };
    } catch (error) {
      throw error;
    }
  }

  async getDataFromSheets() {
    // Implémentez votre logique de récupération depuis Google Sheets
    // Retourne un tableau de lignes avec les en-têtes en première position
  }

  transformSheetData(rawData) {
    // Transformez les données brutes en format compatible avec votre modèle Order
    // Retourne un tableau d'objets Order
  }

  async upsertOrder(orderData) {
    try {
      const existing = await Order.findOne({ 
        $or: [
          { googleSheetsId: orderData.googleSheetsId },
          { numeroCommande: orderData.numeroCommande }
        ]
      });
      
      if (existing) {
        const updated = await Order.findByIdAndUpdate(existing._id, orderData, { new: true });
        return { updated: true, order: updated };
      } else {
        const newOrder = await Order.create(orderData);
        return { created: true, order: newOrder };
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new SyncService();