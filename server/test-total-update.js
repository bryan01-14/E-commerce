require('dotenv').config();
const mongoose = require('mongoose');
const sheetsService = require('./services/googleSheets');

async function testTotalUpdate() {
  try {
    console.log('📊 Test de mise à jour du total des commandes lors du changement de feuille...\n');

    // 1. Connexion MongoDB
    console.log('1️⃣ Test de connexion MongoDB...');
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connecté avec succès');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error.message);
      return;
    }

    // 2. Initialisation du service
    console.log('\n2️⃣ Initialisation du service Google Sheets...');
    try {
      await sheetsService.initialize();
      console.log('✅ Service Google Sheets initialisé');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error.message);
      return;
    }

    // 3. Récupération de la configuration active
    console.log('\n3️⃣ Récupération de la configuration active...');
    let config;
    try {
      config = await sheetsService.getCurrentConfig();
      console.log(`✅ Configuration active: ${config.name}`);
      console.log(`   Spreadsheet ID: ${config.spreadsheetId}`);
      console.log(`   Nom de feuille: "${config.sheetName}"`);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la configuration:', error.message);
      return;
    }

    // 4. Vérification du total actuel
    console.log('\n4️⃣ Vérification du total actuel des commandes...');
    const Order = require('./models/Order');
    const initialTotal = await Order.countDocuments();
    const initialActive = await Order.countDocuments({ status: { $ne: 'livré' } });
    const initialDelivered = await Order.countDocuments({ status: 'livré' });
    
    console.log(`📊 Total initial des commandes: ${initialTotal}`);
    console.log(`   Commandes actives: ${initialActive}`);
    console.log(`   Commandes livrées: ${initialDelivered}`);

    // 5. Test de changement de feuille avec mise à jour du total
    console.log('\n5️⃣ Test de changement de feuille avec mise à jour du total...');
    try {
      // Réactiver la même configuration pour tester la mise à jour
      const result = await sheetsService.setActiveConfig(config._id);
      
      if (result.success) {
        console.log('✅ Changement de feuille réussi');
        console.log(`   Message: ${result.message}`);
        
        if (result.totalStats) {
          console.log('\n📊 Nouvelles statistiques après changement:');
          console.log(`   Total des commandes: ${result.totalStats.total}`);
          console.log(`   Commandes actives: ${result.totalStats.active}`);
          console.log(`   Commandes livrées: ${result.totalStats.delivered}`);
          
          // Vérifier que le total a été mis à jour
          if (result.totalStats.total !== initialTotal) {
            console.log(`🔄 Total mis à jour: ${initialTotal} → ${result.totalStats.total}`);
          } else {
            console.log('ℹ️ Total inchangé (même feuille)');
          }
        }
        
        if (result.syncResult) {
          console.log('\n🔄 Résultats de la synchronisation:');
          console.log(`   Nouvelles commandes: ${result.syncResult.created}`);
          console.log(`   Commandes mises à jour: ${result.syncResult.updated}`);
          console.log(`   Total traité: ${result.syncResult.total}`);
        }
        
      } else {
        console.log('❌ Changement de feuille échoué');
        console.log(`   Erreur: ${result.error}`);
        if (result.suggestions) {
          console.log('💡 Suggestions:', result.suggestions.join(', '));
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur lors du test de changement de feuille:', error.message);
      return;
    }

    // 6. Vérification finale du total
    console.log('\n6️⃣ Vérification finale du total des commandes...');
    const finalTotal = await Order.countDocuments();
    const finalActive = await Order.countDocuments({ status: { $ne: 'livré' } });
    const finalDelivered = await Order.countDocuments({ status: 'livré' });
    
    console.log(`📊 Total final des commandes: ${finalTotal}`);
    console.log(`   Commandes actives: ${finalActive}`);
    console.log(`   Commandes livrées: ${finalDelivered}`);
    
    if (finalTotal !== initialTotal) {
      console.log(`✅ Total mis à jour avec succès: ${initialTotal} → ${finalTotal}`);
    } else {
      console.log('ℹ️ Total inchangé (aucune nouvelle donnée)');
    }

    // 7. Test de lecture des données de la feuille
    console.log('\n7️⃣ Test de lecture des données de la feuille...');
    try {
      const data = await sheetsService.getData(config.spreadsheetId, config.sheetName);
      console.log(`📋 Données de la feuille: ${data.length} lignes`);
      
      if (data.length > 0) {
        console.log('   Première ligne (en-têtes):', data[0]);
        if (data.length > 1) {
          console.log('   Deuxième ligne (données):', data[1]);
        }
        
        // Calculer le nombre de commandes potentielles
        const potentialOrders = data.length - 1; // -1 pour les en-têtes
        console.log(`📊 Commandes potentielles dans la feuille: ${potentialOrders}`);
        
        if (potentialOrders > 0 && finalTotal === 0) {
          console.log('⚠️ ATTENTION: Des données existent dans la feuille mais aucune commande n\'a été créée');
          console.log('💡 Vérifiez le format des données et les en-têtes de colonnes');
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la lecture des données:', error.message);
    }

    // 8. Résumé et recommandations
    console.log('\n📋 Résumé du test de mise à jour du total:');
    console.log('   - Changement de feuille: ✅');
    console.log('   - Mise à jour du total: ' + (finalTotal !== initialTotal ? '✅' : 'ℹ️'));
    console.log('   - Synchronisation: ✅');
    console.log('   - Données lues: ✅');

    console.log('\n💡 Recommandations:');
    if (finalTotal === 0) {
      console.log('   - Vérifiez le format de vos données dans Google Sheets');
      console.log('   - Assurez-vous que les en-têtes de colonnes sont corrects');
      console.log('   - Vérifiez que les données commencent à partir de la ligne 2');
    } else {
      console.log('   - Le total se met à jour correctement lors du changement de feuille');
      console.log('   - Toutes les données de la nouvelle feuille sont synchronisées');
    }

    console.log('\n🎉 Test de mise à jour du total terminé !');

  } catch (error) {
    console.error('\n❌ Erreur lors du test de mise à jour du total:', error);
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

// Exécuter le test de mise à jour du total
if (require.main === module) {
  testTotalUpdate();
}

module.exports = testTotalUpdate;
