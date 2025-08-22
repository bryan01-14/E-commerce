require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function testAdminAccess() {
  try {
    console.log('🔍 Diagnostic de l\'accès administrateur...\n');

    // 1. Connexion MongoDB
    console.log('1️⃣ Connexion MongoDB...');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connecté avec succès');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error.message);
      return;
    }

    // 2. Vérifier les utilisateurs administrateurs
    console.log('\n2️⃣ Vérification des utilisateurs administrateurs...');
    const adminUsers = await User.find({ role: 'admin' }).select('-password').lean();
    
    console.log(`   ${adminUsers.length} utilisateur(s) administrateur trouvé(s)`);
    
    if (adminUsers.length === 0) {
      console.log('⚠️ Aucun utilisateur administrateur trouvé');
      console.log('💡 Créez un utilisateur avec le rôle "admin"');
    } else {
      adminUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.prenom} ${user.nom} (${user.email})`);
        console.log(`      - Rôle: ${user.role}`);
        console.log(`      - Actif: ${user.isActive ? 'Oui' : 'Non'}`);
        console.log(`      - Dernière connexion: ${user.derniereConnexion || 'Jamais'}`);
      });
    }

    // 3. Vérifier tous les utilisateurs
    console.log('\n3️⃣ Vérification de tous les utilisateurs...');
    const allUsers = await User.find({}).select('-password').lean();
    
    console.log(`   ${allUsers.length} utilisateur(s) total`);
    
    const roleCounts = {};
    allUsers.forEach(user => {
      roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
    });
    
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   - ${role}: ${count} utilisateur(s)`);
    });

    // 4. Vérifier la structure de la navigation
    console.log('\n4️⃣ Structure de navigation attendue pour admin...');
    const expectedNavigation = [
      'Tableau de bord',
      'Attribuer Commandes',
      'Utilisateurs',
      'Surveillance Activités',
      'Total des commandes',
      'Config Google Sheets',
      'Paramètres'
    ];
    
    console.log('   Navigation attendue pour admin:');
    expectedNavigation.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item}`);
    });

    // 5. Recommandations
    console.log('\n5️⃣ Recommandations...');
    
    if (adminUsers.length === 0) {
      console.log('❌ Problème: Aucun utilisateur administrateur');
      console.log('💡 Solution: Créez un utilisateur avec le rôle "admin"');
      console.log('   Exemple:');
      console.log('   - Nom: Admin');
      console.log('   - Email: admin@example.com');
      console.log('   - Rôle: admin');
    } else {
      console.log('✅ Utilisateurs administrateurs trouvés');
      
      const inactiveAdmins = adminUsers.filter(user => !user.isActive);
      if (inactiveAdmins.length > 0) {
        console.log('⚠️ Attention: Des administrateurs sont inactifs');
        inactiveAdmins.forEach(user => {
          console.log(`   - ${user.prenom} ${user.nom} (${user.email})`);
        });
      }
      
      console.log('💡 Pour tester:');
      console.log('   1. Connectez-vous avec un compte administrateur');
      console.log('   2. Vérifiez que le rôle est bien "admin"');
      console.log('   3. Vérifiez que l\'utilisateur est actif');
      console.log('   4. Rechargez la page si nécessaire');
    }

    // 6. Vérifier les routes
    console.log('\n6️⃣ Vérification des routes...');
    const routes = [
      '/dashboard',
      '/orders',
      '/users',
      '/admin-activity',
      '/google-sheets',
      '/google-sheets-config',
      '/settings'
    ];
    
    console.log('   Routes attendues:');
    routes.forEach(route => {
      console.log(`   - ${route}`);
    });

    console.log('\n🎉 Diagnostic terminé !');

  } catch (error) {
    console.error('\n❌ Erreur lors du diagnostic:', error);
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

// Exécuter le diagnostic
if (require.main === module) {
  testAdminAccess();
}

module.exports = testAdminAccess;
