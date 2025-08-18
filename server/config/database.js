const mongoose = require('mongoose');

const connectDB = async () => {
  let conn = null;
  try {
    if (conn) return conn;
    conn = await mongoose.connect(process.env.MONGODB_URI);
    return conn;

    console.log(`MongoDB connecté: ${conn.connection.host}`);

    // Gestion des événements de connexion
    mongoose.connection.on('error', (err) => {
      console.error('Erreur de connexion MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB déconnecté');
    });

    // Gestion de l'arrêt propre
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Connexion MongoDB fermée suite à l\'arrêt de l\'application');
      process.exit(0);
    });

  } catch (error) {
    console.error('Erreur lors de la connexion à MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
