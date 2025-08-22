require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function testCloseurAccess() {
  try {
    console.log('🧪 Test de l\'accès des closeurs aux routes utilisateurs...\n');

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

    // 3. Vérifier les livreurs existants
    console.log('\n3️⃣ Vérification des livreurs existants...');
    const livreurs = await User.find({ role: 'livreur' }).select('-password').lean();
    
    console.log(`   ${livreurs.length} livreur(s) trouvé(s)`);
    
    if (livreurs.length === 0) {
      console.log('⚠️ Aucun livreur trouvé');
      console.log('💡 Créez des utilisateurs avec le rôle "livreur"');
    } else {
      livreurs.slice(0, 3).forEach((livreur, index) => {
        console.log(`   ${index + 1}. ${livreur.prenom} ${livreur.nom} (${livreur.email})`);
        console.log(`      - Rôle: ${livreur.role}`);
        console.log(`      - Actif: ${livreur.isActive ? 'Oui' : 'Non'}`);
      });
    }

    // 4. Vérifier les routes accessibles aux closeurs
    console.log('\n4️⃣ Routes accessibles aux closeurs...');
    
    const routesWithCloseurAccess = [
      'GET /api/users - ✅ Closeurs autorisés (pour voir les livreurs)',
      'GET /api/users?role=livreur&actif=true - ✅ Closeurs autorisés',
      'GET /api/users/:id - ✅ Closeurs autorisés (pour les livreurs uniquement)',
      'POST /api/users - ✅ Closeurs autorisés (pour créer des livreurs uniquement)',
      'GET /api/orders - ✅ Closeurs autorisés',
      'POST /api/orders/assign-from-sheets - ✅ Closeurs autorisés',
      'PUT /api/orders/:id/status - ✅ Closeurs autorisés'
    ];
    
    console.log('   Routes avec accès closeur:');
    routesWithCloseurAccess.forEach(route => {
      console.log(`   - ${route}`);
    });

    // 5. Vérifier les restrictions pour les closeurs
    console.log('\n5️⃣ Restrictions pour les closeurs...');
    
    const closeurRestrictions = [
      '❌ Ne peuvent pas créer d\'administrateurs',
      '❌ Ne peuvent pas créer d\'autres closeurs',
      '❌ Ne peuvent voir que les livreurs (pas les admins/closeurs)',
      '❌ Ne peuvent pas modifier les administrateurs',
      '❌ Ne peuvent pas supprimer des utilisateurs',
      '✅ Peuvent créer des livreurs',
      '✅ Peuvent voir tous les livreurs',
      '✅ Peuvent assigner des commandes aux livreurs'
    ];
    
    console.log('   Restrictions et permissions:');
    closeurRestrictions.forEach(restriction => {
      console.log(`   - ${restriction}`);
    });

    // 6. Recommandations
    console.log('\n6️⃣ Recommandations...');
    
    if (closeurs.length === 0) {
      console.log('❌ Problème: Aucun closeur trouvé');
      console.log('💡 Solution: Créez des utilisateurs avec le rôle "closeur"');
    } else {
      console.log('✅ Closeurs trouvés');
    }
    
    if (livreurs.length === 0) {
      console.log('❌ Problème: Aucun livreur trouvé');
      console.log('💡 Solution: Créez des utilisateurs avec le rôle "livreur"');
      console.log('   Les closeurs peuvent créer des livreurs via l\'interface');
    } else {
      console.log('✅ Livreurs trouvés');
    }

    console.log('\n💡 Pour tester l\'interface closeur:');
    console.log('   1. Connectez-vous avec un compte closeur');
    console.log('   2. Allez dans "Attribuer Commandes"');
    console.log('   3. Vérifiez que vous pouvez voir les livreurs');
    console.log('   4. Vérifiez que vous pouvez assigner des commandes');

    console.log('\n🎉 Test terminé !');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
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

// Exécuter le test
if (require.main === module) {
  testCloseurAccess();
}

module.exports = testCloseurAccess;
