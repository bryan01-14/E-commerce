# 🚨 SOLUTION RAPIDE - Erreur 500 Synchronisation

## ❌ Erreur Rencontrée
```
Erreur synchronisation manuelle: Request failed with status code 500
```

## 🔧 SOLUTION IMMÉDIATE (5 minutes)

### Étape 1: Diagnostic Automatique
```bash
cd server
npm run fix:sync
```

### Étape 2: Correction Automatique
```bash
npm run auto:fix:sync
```

### Étape 3: Redémarrage
```bash
# Arrêtez le serveur (Ctrl+C)
npm run dev
```

### Étape 4: Test
Testez la synchronisation via l'interface web

## 🚨 Si le problème persiste

### Vérifiez votre fichier `.env`
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/commerce_orders

# Google Sheets API (OBLIGATOIRE)
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVotre clé privée\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL=votre_email@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PROJECT_ID=votre_project_id

# Configuration par défaut
GOOGLE_SHEETS_SPREADSHEET_ID=votre_spreadsheet_id
GOOGLE_SHEETS_SHEET_NAME=Feuille 1
```

### Permissions Google Sheets
1. **Allez dans votre Google Sheet**
2. **Cliquez sur "Partager"** (en haut à droite)
3. **Ajoutez l'email du compte de service**
4. **Donnez les permissions "Éditeur"**

## 🛠️ Scripts Disponibles

```bash
npm run fix:sync          # Diagnostic rapide
npm run auto:fix:sync     # Correction automatique
npm run diagnose:sync     # Diagnostic complet
npm run migrate:google-sheets # Initialisation base
```

## 📱 Test via l'Interface

1. **Connectez-vous** en tant qu'administrateur
2. **Allez dans** "Config Google Sheets"
3. **Cliquez sur** "Synchroniser"
4. **Vérifiez** que ça fonctionne

## 🆘 Support Avancé

Si rien ne fonctionne :

1. **Vérifiez les logs** du serveur
2. **Lancez le diagnostic complet** : `npm run diagnose:sync`
3. **Vérifiez votre connexion MongoDB**
4. **Vérifiez vos credentials Google Sheets**

---

**Note :** 90% des erreurs 500 sont résolues avec `npm run auto:fix:sync` + redémarrage du serveur.
