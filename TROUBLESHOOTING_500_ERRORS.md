# 🔧 Guide de Dépannage - Erreurs 500

## 🚨 Erreurs 500 Courantes

### 1. Erreur lors de la sauvegarde de configuration

**Symptôme :**
```
Erreur sauvegarde configuration: Request failed with status code 500
```

**Causes possibles :**
- Service Google Sheets non initialisé
- Variables d'environnement manquantes
- Erreur de connexion MongoDB
- Problème avec les credentials Google Sheets

**Solutions :**

#### A. Vérifier les variables d'environnement
```bash
# Dans votre fichier .env, assurez-vous d'avoir :
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVotre clé privée ici\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL=votre_email@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PROJECT_ID=votre_project_id
GOOGLE_SHEETS_PRIVATE_KEY_ID=votre_private_key_id
GOOGLE_SHEETS_CLIENT_ID=votre_client_id
GOOGLE_SHEETS_CLIENT_X509_CERT_URL=votre_cert_url
```

#### B. Tester la connexion Google Sheets
```bash
cd server
npm run test:google-sheets
```

#### C. Vérifier la base de données
```bash
cd server
npm run migrate:google-sheets
```

### 2. Erreur lors du test d'accès

**Symptôme :**
```
Erreur test accès: Request failed with status code 500
```

**Causes possibles :**
- Credentials Google Sheets invalides
- Spreadsheet ID incorrect
- Problème de permissions
- Service non initialisé

**Solutions :**

#### A. Vérifier les permissions du compte de service
1. Allez dans votre Google Sheet
2. Cliquez sur "Partager" (en haut à droite)
3. Ajoutez l'email du compte de service : `votre_email@project.iam.gserviceaccount.com`
4. Donnez-lui les permissions "Éditeur"

#### B. Vérifier l'ID du spreadsheet
- L'ID se trouve dans l'URL : `https://docs.google.com/spreadsheets/d/ID_ICI/edit`
- Copiez uniquement la partie entre `/d/` et `/edit`

#### C. Tester manuellement
```bash
cd server
npm run test:sync
```

### 3. Erreur lors du chargement des configurations

**Symptôme :**
```
Fetch error: Request failed with status code 500
```

**Causes possibles :**
- Modèle MongoDB non créé
- Base de données non initialisée
- Erreur de connexion

**Solutions :**

#### A. Initialiser la base de données
```bash
cd server
npm run migrate:google-sheets
```

#### B. Vérifier la connexion MongoDB
```bash
# Vérifiez que votre variable MONGODB_URI est correcte
echo $MONGODB_URI
# ou dans votre fichier .env
MONGODB_URI=mongodb://localhost:27017/commerce_orders
```

## 🛠️ Scripts de Diagnostic

### 1. Test complet de la configuration
```bash
cd server
npm run test:google-sheets
```

### 2. Test de synchronisation
```bash
cd server
npm run test:sync
```

### 3. Migration de la base de données
```bash
cd server
npm run migrate:google-sheets
```

## 📋 Checklist de Vérification

### Variables d'environnement
- [ ] `GOOGLE_SHEETS_PRIVATE_KEY` est défini
- [ ] `GOOGLE_SHEETS_CLIENT_EMAIL` est défini
- [ ] `GOOGLE_SHEETS_PROJECT_ID` est défini
- [ ] `GOOGLE_SHEETS_PRIVATE_KEY_ID` est défini
- [ ] `GOOGLE_SHEETS_CLIENT_ID` est défini
- [ ] `GOOGLE_SHEETS_CLIENT_X509_CERT_URL` est défini
- [ ] `MONGODB_URI` est défini et accessible

### Permissions Google Sheets
- [ ] Le compte de service a accès au spreadsheet
- [ ] L'ID du spreadsheet est correct
- [ ] La feuille spécifiée existe

### Base de données
- [ ] MongoDB est accessible
- [ ] La collection `googleSheetsConfigs` existe
- [ ] Au moins une configuration est active

## 🔍 Logs de Diagnostic

### Vérifier les logs du serveur
```bash
# Dans le terminal où vous lancez le serveur
npm run dev

# Regardez les messages d'erreur dans la console
```

### Logs typiques d'erreur
```
❌ Erreur initialisation Google Sheets: [message d'erreur]
❌ Erreur lors de la création de la configuration: [message d'erreur]
❌ Erreur lors de la récupération des configurations: [message d'erreur]
```

## 🚀 Solutions Rapides

### 1. Redémarrer le serveur
```bash
# Arrêtez le serveur (Ctrl+C)
# Puis relancez
npm run dev
```

### 2. Réinitialiser la configuration
```bash
cd server
npm run migrate:google-sheets
```

### 3. Vérifier la structure des données
```bash
cd server
npm run test:sync
```

## 📞 Support Avancé

Si les erreurs persistent :

1. **Vérifiez les logs complets** du serveur
2. **Testez chaque composant** individuellement
3. **Vérifiez la version** de vos dépendances
4. **Consultez la documentation** Google Sheets API

## 🔄 Processus de Récupération

### Étape 1 : Diagnostic
```bash
npm run test:google-sheets
```

### Étape 2 : Réparation
```bash
npm run migrate:google-sheets
```

### Étape 3 : Validation
```bash
npm run test:sync
```

### Étape 4 : Test en production
- Testez la création d'une configuration
- Testez le changement de configuration active
- Vérifiez la synchronisation automatique

---

**Note :** La plupart des erreurs 500 sont liées à des problèmes de configuration ou de permissions. Suivez ce guide étape par étape pour identifier et résoudre le problème.
