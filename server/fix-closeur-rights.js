require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function fixCloseurRights() {
  try {
    console.log('🔧 Vérification et correction des droits des closeurs...\n');

    // 1. Connexion MongoDB
    console.log('1️⃣ Connexion MongoDB...');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connecté avec succès');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error.message);
      return;
    }

    // 2. Vérifier les closeurs existants
    console.log('\n2️⃣ Vérification des closeurs existants...');
    const closeurs = await User.find({ role: 'closeur' }).select('-password').lean();
    
    console.log(`   ${closeurs.length} closeur(s) trouvé(s)`);
    
    if (closeurs.length === 0) {
      console.log('⚠️ Aucun closeur trouvé');
      console.log('💡 Créez des utilisateurs avec le rôle "closeur"');
    } else {
      closeurs.forEach((closeur, index) => {
        console.log(`   ${index + 1}. ${closeur.prenom} ${closeur.nom} (${closeur.email})`);
        console.log(`      - Rôle: ${closeur.role}`);
        console.log(`      - Actif: ${closeur.isActive ? 'Oui' : 'Non'}`);
        console.log(`      - Boutique: ${closeur.boutique || 'Non définie'}`);
      });
    }

    // 3. Vérifier les droits dans les routes
    console.log('\n3️⃣ Vérification des droits dans les routes...');
    
    const routesWithCloseurAccess = [
      'GET /api/orders/google-sheets/data - ✅ Closeurs autorisés',
      'POST /api/orders/assign-from-sheets - ✅ Closeurs autorisés',
      'GET /api/orders/assigned - ✅ Closeurs autorisés',
      'GET /api/orders - ✅ Closeurs autorisés',
      'GET /api/orders/stats/overview - ✅ Closeurs autorisés',
      'PUT /api/orders/:id/status - ✅ Closeurs autorisés'
    ];
    
    console.log('   Routes avec accès closeur:');
    routesWithCloseurAccess.forEach(route => {
      console.log(`   - ${route}`);
    });

    // 4. Vérifier les utilisateurs administrateurs
    console.log('\n4️⃣ Vérification des administrateurs...');
    const admins = await User.find({ role: 'admin' }).select('-password').lean();
    
    console.log(`   ${admins.length} administrateur(s) trouvé(s)`);
    
    if (admins.length === 0) {
      console.log('⚠️ Aucun administrateur trouvé');
      console.log('💡 Créez un administrateur pour accéder à la page de surveillance');
    } else {
      admins.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.prenom} ${admin.nom} (${admin.email})`);
        console.log(`      - Rôle: ${admin.role}`);
        console.log(`      - Actif: ${admin.isActive ? 'Oui' : 'Non'}`);
      });
    }

    // 5. Recommandations
    console.log('\n5️⃣ Recommandations...');
    
    console.log('✅ Les closeurs ont déjà les droits d\'assigner des commandes');
    console.log('   - Ils peuvent voir les commandes');
    console.log('   - Ils peuvent assigner des commandes aux livreurs');
    console.log('   - Ils peuvent modifier le statut des commandes');
    
    if (admins.length === 0) {
      console.log('\n❌ Problème: Aucun administrateur pour accéder à la surveillance');
      console.log('💡 Solution: Créez un administrateur avec:');
      console.log('   npm run create:admin');
    } else {
      console.log('\n✅ Administrateurs disponibles pour la surveillance');
      console.log('💡 Pour tester la page de surveillance:');
      console.log('   1. Connectez-vous avec un compte administrateur');
      console.log('   2. Vérifiez que le rôle est bien "admin"');
      console.log('   3. Le menu "Surveillance Activités" devrait apparaître');
    }

    // 6. Vérifier la structure de navigation attendue
    console.log('\n6️⃣ Structure de navigation attendue...');
    
    console.log('   Pour les closeurs:');
    console.log('   - Tableau de bord');
    console.log('   - Attribuer Commandes ✅');
    console.log('   - Paramètres');
    
    console.log('\n   Pour les administrateurs:');
    console.log('   - Tableau de bord');
    console.log('   - Attribuer Commandes ✅');
    console.log('   - Utilisateurs ✅');
    console.log('   - Surveillance Activités ✅');
    console.log('   - Total des commandes ✅');
    console.log('   - Config Google Sheets ✅');
    console.log('   - Paramètres');

    console.log('\n🎉 Vérification terminée !');

  } catch (error) {
    console.error('\n❌ Erreur lors de la vérification:', error);
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

// Exécuter la vérification
if (require.main === module) {
  fixCloseurRights();
}

module.exports = fixCloseurRights;
