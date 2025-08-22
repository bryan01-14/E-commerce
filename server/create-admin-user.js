require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  try {
    console.log('👤 Création d\'un utilisateur administrateur...\n');

    // 1. Connexion MongoDB
    console.log('1️⃣ Connexion MongoDB...');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connecté avec succès');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error.message);
      return;
    }

    // 2. Vérifier si un admin existe déjà
    console.log('\n2️⃣ Vérification des administrateurs existants...');
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('⚠️ Un administrateur existe déjà:');
      console.log(`   - Nom: ${existingAdmin.prenom} ${existingAdmin.nom}`);
      console.log(`   - Email: ${existingAdmin.email}`);
      console.log(`   - Rôle: ${existingAdmin.role}`);
      console.log('💡 Utilisez ce compte pour accéder à la page d\'administration');
      return;
    }

    // 3. Créer un nouvel administrateur
    console.log('\n3️⃣ Création d\'un nouvel administrateur...');
    
    const adminData = {
      prenom: 'Admin',
      nom: 'Principal',
      email: 'admin@example.com',
      telephone: '+1234567890',
      password: 'admin123',
      role: 'admin',
      isActive: true
    };

    // Hasher le mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);

    const newAdmin = new User({
      ...adminData,
      password: hashedPassword
    });

    await newAdmin.save();

    console.log('✅ Administrateur créé avec succès !');
    console.log('📋 Informations de connexion:');
    console.log(`   - Email: ${adminData.email}`);
    console.log(`   - Mot de passe: ${adminData.password}`);
    console.log(`   - Rôle: ${adminData.role}`);
    console.log('\n🔐 Connectez-vous avec ces identifiants pour accéder à la page d\'administration');

    // 4. Vérifier la création
    console.log('\n4️⃣ Vérification de la création...');
    const createdAdmin = await User.findOne({ email: adminData.email });
    
    if (createdAdmin) {
      console.log('✅ Utilisateur trouvé en base de données');
      console.log(`   - ID: ${createdAdmin._id}`);
      console.log(`   - Nom: ${createdAdmin.prenom} ${createdAdmin.nom}`);
      console.log(`   - Email: ${createdAdmin.email}`);
      console.log(`   - Rôle: ${createdAdmin.role}`);
      console.log(`   - Actif: ${createdAdmin.isActive ? 'Oui' : 'Non'}`);
    } else {
      console.log('❌ Erreur: Utilisateur non trouvé après création');
    }

    console.log('\n🎉 Création terminée !');

  } catch (error) {
    console.error('\n❌ Erreur lors de la création:', error);
    
    if (error.code === 11000) {
      console.log('💡 Un utilisateur avec cet email existe déjà');
    }
    
    console.error('Stack:', error.stack);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('\n🔌 Déconnecté de MongoDB');
    } catch (error) {
      console.log('⚠️ Erreur lors de la déconnexion MongoDB');
    }
  }
}

// Exécuter la création
if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;
