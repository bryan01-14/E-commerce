require('dotenv').config();
const mongoose = require('mongoose');
const sheetsService = require('./services/googleSheets');

async function testSyncPerformance() {
  try {
    console.log('⚡ Test de performance de la synchronisation ultra-rapide...\n');

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

    // 4. Test de performance de lecture des données
    console.log('\n4️⃣ Test de performance de lecture des données...');
    try {
      const startRead = Date.now();
      const data = await sheetsService.getData(config.spreadsheetId, config.sheetName);
      const readTime = Date.now() - startRead;
      
      console.log(`⚡ Lecture des données: ${data.length} lignes en ${readTime}ms`);
      console.log(`   Vitesse: ${(data.length / (readTime / 1000)).toFixed(2)} lignes/seconde`);
      
      if (data.length > 0) {
        console.log('   Première ligne (en-têtes):', data[0]);
        if (data.length > 1) {
          console.log('   Deuxième ligne (données):', data[1]);
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la lecture des données:', error.message);
      return;
    }

    // 5. Test de performance de transformation des données
    console.log('\n5️⃣ Test de performance de transformation des données...');
    try {
      const data = await sheetsService.getData(config.spreadsheetId, config.sheetName);
      
      const startTransform = Date.now();
      const orders = sheetsService.transformSheetDataToOrders(data);
      const transformTime = Date.now() - startTransform;
      
      console.log(`⚡ Transformation des données: ${orders.length} commandes en ${transformTime}ms`);
      console.log(`   Vitesse: ${(orders.length / (transformTime / 1000)).toFixed(2)} commandes/seconde`);
      
      if (orders.length > 0) {
        console.log('   Première commande:', {
          clientName: orders[0].clientName,
          product: orders[0].product,
          quantity: orders[0].quantity,
          price: orders[0].price
        });
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la transformation des données:', error.message);
      return;
    }

    // 6. Test de performance de synchronisation complète
    console.log('\n6️⃣ Test de performance de synchronisation complète...');
    try {
      const startSync = Date.now();
      const result = await sheetsService.setActiveConfig(config._id);
      const totalTime = Date.now() - startSync;
      
      if (result.success) {
        console.log('✅ Synchronisation ultra-rapide réussie !');
        console.log(`⚡ Temps total: ${totalTime}ms`);
        
        if (result.performance) {
          console.log('📊 Détails de performance:');
          console.log(`   Durée de synchronisation: ${result.performance.syncDuration}ms`);
          console.log(`   Vitesse: ${result.performance.speed}`);
        }
        
        if (result.syncResult) {
          console.log('🔄 Résultats de la synchronisation:');
          console.log(`   Nouvelles commandes: ${result.syncResult.created}`);
          console.log(`   Commandes mises à jour: ${result.syncResult.updated}`);
          console.log(`   Total traité: ${result.syncResult.total}`);
          
          if (result.syncResult.performance) {
            console.log('⚡ Performance détaillée:');
            console.log(`   Temps de transformation: ${result.syncResult.performance.transformTime}ms`);
            console.log(`   Temps de synchronisation: ${result.syncResult.performance.syncTime}ms`);
            console.log(`   Temps total: ${result.syncResult.performance.totalTime}ms`);
          }
        }
        
        if (result.totalStats) {
          console.log('📊 Statistiques finales:');
          console.log(`   Total des commandes: ${result.totalStats.total}`);
          console.log(`   Commandes actives: ${result.totalStats.active}`);
          console.log(`   Commandes livrées: ${result.totalStats.delivered}`);
        }
        
        // Évaluer la performance
        let performanceRating = 'Normal';
        if (totalTime < 1000) performanceRating = 'Ultra-rapide 🚀';
        else if (totalTime < 3000) performanceRating = 'Rapide ⚡';
        else if (totalTime < 5000) performanceRating = 'Normal 📊';
        else performanceRating = 'Lent 🐌';
        
        console.log(`\n🏆 Évaluation de performance: ${performanceRating}`);
        console.log(`   Temps total: ${totalTime}ms`);
        
        if (totalTime < 1000) {
          console.log('🎉 Performance exceptionnelle ! Votre synchronisation est ultra-rapide !');
        } else if (totalTime < 3000) {
          console.log('✅ Performance très bonne ! Votre synchronisation est rapide !');
        } else if (totalTime < 5000) {
          console.log('📊 Performance acceptable. La synchronisation fonctionne bien.');
        } else {
          console.log('⚠️ Performance lente. Vérifiez votre connexion et la taille des données.');
        }
        
      } else {
        console.log('❌ Synchronisation échouée');
        console.log(`   Erreur: ${result.error}`);
        if (result.suggestions) {
          console.log('💡 Suggestions:', result.suggestions.join(', '));
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur lors du test de synchronisation:', error.message);
      return;
    }

    // 7. Recommandations d'optimisation
    console.log('\n💡 Recommandations d\'optimisation:');
    console.log('   1. Utilisez des noms de colonnes simples et courts');
    console.log('   2. Évitez les caractères spéciaux dans les données');
    console.log('   3. Limitez le nombre de lignes si possible');
    console.log('   4. Vérifiez votre connexion internet');
    console.log('   5. Utilisez des feuilles avec des données bien structurées');

    console.log('\n🎉 Test de performance terminé !');

  } catch (error) {
    console.error('\n❌ Erreur lors du test de performance:', error);
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

// Exécuter le test de performance
if (require.main === module) {
  testSyncPerformance();
}

module.exports = testSyncPerformance;
const mongoose = require('mongoose');
const sheetsService = require('./services/googleSheets');

async function testSyncPerformance() {
  try {
    console.log('⚡ Test de performance de la synchronisation ultra-rapide...\n');

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

    // 4. Test de performance de lecture des données
    console.log('\n4️⃣ Test de performance de lecture des données...');
    try {
      const startRead = Date.now();
      const data = await sheetsService.getData(config.spreadsheetId, config.sheetName);
      const readTime = Date.now() - startRead;
      
      console.log(`⚡ Lecture des données: ${data.length} lignes en ${readTime}ms`);
      console.log(`   Vitesse: ${(data.length / (readTime / 1000)).toFixed(2)} lignes/seconde`);
      
      if (data.length > 0) {
        console.log('   Première ligne (en-têtes):', data[0]);
        if (data.length > 1) {
          console.log('   Deuxième ligne (données):', data[1]);
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la lecture des données:', error.message);
      return;
    }

    // 5. Test de performance de transformation des données
    console.log('\n5️⃣ Test de performance de transformation des données...');
    try {
      const data = await sheetsService.getData(config.spreadsheetId, config.sheetName);
      
      const startTransform = Date.now();
      const orders = sheetsService.transformSheetDataToOrders(data);
      const transformTime = Date.now() - startTransform;
      
      console.log(`⚡ Transformation des données: ${orders.length} commandes en ${transformTime}ms`);
      console.log(`   Vitesse: ${(orders.length / (transformTime / 1000)).toFixed(2)} commandes/seconde`);
      
      if (orders.length > 0) {
        console.log('   Première commande:', {
          clientName: orders[0].clientName,
          product: orders[0].product,
          quantity: orders[0].quantity,
          price: orders[0].price
        });
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la transformation des données:', error.message);
      return;
    }

    // 6. Test de performance de synchronisation complète
    console.log('\n6️⃣ Test de performance de synchronisation complète...');
    try {
      const startSync = Date.now();
      const result = await sheetsService.setActiveConfig(config._id);
      const totalTime = Date.now() - startSync;
      
      if (result.success) {
        console.log('✅ Synchronisation ultra-rapide réussie !');
        console.log(`⚡ Temps total: ${totalTime}ms`);
        
        if (result.performance) {
          console.log('📊 Détails de performance:');
          console.log(`   Durée de synchronisation: ${result.performance.syncDuration}ms`);
          console.log(`   Vitesse: ${result.performance.speed}`);
        }
        
        if (result.syncResult) {
          console.log('🔄 Résultats de la synchronisation:');
          console.log(`   Nouvelles commandes: ${result.syncResult.created}`);
          console.log(`   Commandes mises à jour: ${result.syncResult.updated}`);
          console.log(`   Total traité: ${result.syncResult.total}`);
          
          if (result.syncResult.performance) {
            console.log('⚡ Performance détaillée:');
            console.log(`   Temps de transformation: ${result.syncResult.performance.transformTime}ms`);
            console.log(`   Temps de synchronisation: ${result.syncResult.performance.syncTime}ms`);
            console.log(`   Temps total: ${result.syncResult.performance.totalTime}ms`);
          }
        }
        
        if (result.totalStats) {
          console.log('📊 Statistiques finales:');
          console.log(`   Total des commandes: ${result.totalStats.total}`);
          console.log(`   Commandes actives: ${result.totalStats.active}`);
          console.log(`   Commandes livrées: ${result.totalStats.delivered}`);
        }
        
        // Évaluer la performance
        let performanceRating = 'Normal';
        if (totalTime < 1000) performanceRating = 'Ultra-rapide 🚀';
        else if (totalTime < 3000) performanceRating = 'Rapide ⚡';
        else if (totalTime < 5000) performanceRating = 'Normal 📊';
        else performanceRating = 'Lent 🐌';
        
        console.log(`\n🏆 Évaluation de performance: ${performanceRating}`);
        console.log(`   Temps total: ${totalTime}ms`);
        
        if (totalTime < 1000) {
          console.log('🎉 Performance exceptionnelle ! Votre synchronisation est ultra-rapide !');
        } else if (totalTime < 3000) {
          console.log('✅ Performance très bonne ! Votre synchronisation est rapide !');
        } else if (totalTime < 5000) {
          console.log('📊 Performance acceptable. La synchronisation fonctionne bien.');
        } else {
          console.log('⚠️ Performance lente. Vérifiez votre connexion et la taille des données.');
        }
        
      } else {
        console.log('❌ Synchronisation échouée');
        console.log(`   Erreur: ${result.error}`);
        if (result.suggestions) {
          console.log('💡 Suggestions:', result.suggestions.join(', '));
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur lors du test de synchronisation:', error.message);
      return;
    }

    // 7. Recommandations d'optimisation
    console.log('\n💡 Recommandations d\'optimisation:');
    console.log('   1. Utilisez des noms de colonnes simples et courts');
    console.log('   2. Évitez les caractères spéciaux dans les données');
    console.log('   3. Limitez le nombre de lignes si possible');
    console.log('   4. Vérifiez votre connexion internet');
    console.log('   5. Utilisez des feuilles avec des données bien structurées');

    console.log('\n🎉 Test de performance terminé !');

  } catch (error) {
    console.error('\n❌ Erreur lors du test de performance:', error);
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

// Exécuter le test de performance
if (require.main === module) {
  testSyncPerformance();
}

module.exports = testSyncPerformance;
