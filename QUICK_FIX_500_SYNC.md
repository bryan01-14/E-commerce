# 🚨 Résolution Rapide - Erreur 500 Synchronisation

## ❌ Erreur Rencontrée
```
XHRPOST https://backend-beta-blond-93.vercel.app/api/google-sheets/sync-orders [HTTP/2 500 762ms]
Erreur synchronisation manuelle: Request failed with status code 500
```

## 🔧 Solutions Immédiates

### 1. Diagnostic Automatique
```bash
cd server
npm run diagnose:sync
```

Ce script va identifier automatiquement le problème et vous donner des solutions.

### 2. Vérification des Variables d'Environnement
Assurez-vous que votre fichier `.env` contient :

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/commerce_orders

# Google Sheets API
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVotre clé privée ici\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL=votre_email@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PROJECT_ID=votre_project_id
GOOGLE_SHEETS_PRIVATE_KEY_ID=votre_private_key_id
GOOGLE_SHEETS_CLIENT_ID=votre_client_id
GOOGLE_SHEETS_CLIENT_X509_CERT_URL=votre_cert_url

# Configuration par défaut
GOOGLE_SHEETS_SPREADSHEET_ID=votre_spreadsheet_id
GOOGLE_SHEETS_SHEET_NAME=Feuille 1
```

### 3. Initialisation de la Base de Données
```bash
cd server
npm run migrate:google-sheets
```

### 4. Test de la Configuration
```bash
npm run test:google-sheets
```

## 🚨 Problèmes Courants et Solutions

### Problème 1: Variables d'environnement manquantes
**Symptôme :** Erreur lors de l'initialisation du service
**Solution :** Vérifiez que toutes les variables Google Sheets sont définies

### Problème 2: Aucune configuration active
**Symptôme :** "Aucune configuration active trouvée"
**Solution :** 
```bash
npm run migrate:google-sheets
```

### Problème 3: Permissions Google Sheets
**Symptôme :** "Accès refusé au Google Sheet"
**Solution :** 
1. Allez dans votre Google Sheet
2. Cliquez sur "Partager"
3. Ajoutez l'email du compte de service
4. Donnez les permissions "Éditeur"

### Problème 4: Service non initialisé
**Symptôme :** "Service Google Sheets non disponible"
**Solution :** Redémarrez le serveur
```bash
# Arrêtez le serveur (Ctrl+C)
npm run dev
```

## 🔄 Processus de Récupération

### Étape 1: Diagnostic
```bash
npm run diagnose:sync
```

### Étape 2: Correction
Suivez les recommandations du diagnostic

### Étape 3: Test
```bash
npm run test:sync
```

### Étape 4: Vérification
Testez la synchronisation via l'interface web

## 📱 Test via l'Interface

1. **Connectez-vous** en tant qu'administrateur
2. **Allez dans** "Config Google Sheets"
3. **Cliquez sur** "Synchroniser"
4. **Vérifiez** les messages d'erreur dans la console du serveur

## 🆘 Support Avancé

Si le problème persiste :

1. **Vérifiez les logs** du serveur pour des erreurs détaillées
2. **Testez la connexion** Google Sheets manuellement
3. **Vérifiez la base de données** MongoDB
4. **Consultez** le guide complet de dépannage

## 📋 Checklist de Vérification

- [ ] Variables d'environnement configurées
- [ ] Base de données initialisée
- [ ] Configuration Google Sheets active
- [ ] Permissions du compte de service
- [ ] Serveur redémarré après modifications

---

**Note :** La plupart des erreurs 500 de synchronisation sont liées à des problèmes de configuration. Suivez ce guide étape par étape pour une résolution rapide.
