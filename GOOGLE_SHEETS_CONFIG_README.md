# Configuration Google Sheets - Guide d'utilisation

## 🎯 Vue d'ensemble

Cette fonctionnalité permet aux administrateurs de gérer dynamiquement les connexions Google Sheets sans avoir à modifier le code ou redémarrer l'application. Vous pouvez maintenant :

- ✅ **Créer plusieurs configurations** pour différents Google Sheets
- ✅ **Changer de feuille active** en temps réel
- ✅ **Tester l'accès** avant de sauvegarder une configuration
- ✅ **Gérer les permissions** et accès aux différents spreadsheets

## 🚀 Installation et configuration

### 1. Exécuter la migration initiale

```bash
cd server
npm run migrate:google-sheets
```

Cette commande va :
- Créer une configuration par défaut basée sur vos variables d'environnement
- Initialiser la base de données avec le modèle `GoogleSheetsConfig`

### 2. Vérifier les variables d'environnement

Assurez-vous que votre fichier `.env` contient :

```env
# Configuration Google Sheets API
GOOGLE_SHEETS_PRIVATE_KEY=your_private_key_here
GOOGLE_SHEETS_CLIENT_EMAIL=your_client_email_here
GOOGLE_SHEETS_PROJECT_ID=your_project_id_here
GOOGLE_SHEETS_PRIVATE_KEY_ID=your_private_key_id_here
GOOGLE_SHEETS_CLIENT_ID=your_client_id_here
GOOGLE_SHEETS_CLIENT_X509_CERT_URL=your_cert_url_here

# Configuration par défaut (optionnel, sera remplacée par la DB)
GOOGLE_SHEETS_SPREADSHEET_ID=your_default_spreadsheet_id
GOOGLE_SHEETS_SHEET_NAME=your_default_sheet_name
```

## 📱 Utilisation de l'interface

### Accès à la page de configuration

1. Connectez-vous en tant qu'**administrateur**
2. Dans le menu de navigation, cliquez sur **"Config Google Sheets"**
3. Vous verrez la configuration actuellement active et la liste de toutes les configurations

### Créer une nouvelle configuration

1. Cliquez sur **"Nouvelle configuration"**
2. Remplissez les champs :
   - **Nom** : Un nom descriptif (ex: "Boutique principale")
   - **ID du Spreadsheet** : L'ID de votre Google Sheet
   - **Nom de la feuille** : Le nom de la feuille à utiliser (ex: "Feuille 1")
   - **Description** : Description optionnelle
3. Cliquez sur **"Tester l'accès"** pour vérifier que tout fonctionne
4. Cliquez sur **"Créer"** pour sauvegarder

### Changer de configuration active

1. Dans la liste des configurations, trouvez celle que vous voulez activer
2. Cliquez sur le bouton **"Activer"**
3. La configuration devient immédiatement active
4. Toutes les nouvelles requêtes utiliseront cette configuration

### Modifier une configuration

1. Cliquez sur **"Modifier"** pour la configuration souhaitée
2. Modifiez les champs nécessaires
3. Cliquez sur **"Mettre à jour"**

### Supprimer une configuration

1. Cliquez sur **"Supprimer"** pour la configuration souhaitée
2. Confirmez la suppression
3. **Note** : Impossible de supprimer la configuration active

## 🔧 Fonctionnalités techniques

### Test d'accès automatique

- Chaque nouvelle configuration est testée avant d'être sauvegardée
- Vérification de l'existence du spreadsheet et de la feuille
- Affichage des feuilles disponibles dans le spreadsheet

### Gestion des erreurs

- Validation des données avant sauvegarde
- Messages d'erreur clairs et informatifs
- Fallback sur la configuration par défaut en cas de problème

### Sécurité

- Seuls les administrateurs peuvent accéder à cette fonctionnalité
- Validation des permissions Google Sheets avant utilisation
- Audit trail des modifications (création, modification, activation)

## 📊 Structure de la base de données

### Modèle GoogleSheetsConfig

```javascript
{
  name: String,           // Nom de la configuration
  spreadsheetId: String,  // ID du Google Sheet
  sheetName: String,      // Nom de la feuille
  description: String,    // Description optionnelle
  isActive: Boolean,      // Configuration actuellement active
  createdBy: ObjectId,    // Référence vers l'utilisateur créateur
  lastUsed: Date,         // Dernière utilisation
  createdAt: Date,        // Date de création
  updatedAt: Date         // Date de dernière modification
}
```

## 🚨 Dépannage

### Erreur "Accès refusé au Google Sheet"

**Causes possibles :**
1. L'ID du spreadsheet est incorrect
2. Le compte de service n'a pas accès au spreadsheet
3. La feuille spécifiée n'existe pas

**Solutions :**
1. Vérifiez l'ID du spreadsheet dans l'URL
2. Partagez le spreadsheet avec l'email du compte de service
3. Vérifiez le nom exact de la feuille

### Configuration non trouvée

**Causes possibles :**
1. La base de données n'a pas été initialisée
2. Erreur de connexion MongoDB

**Solutions :**
1. Exécutez `npm run migrate:google-sheets`
2. Vérifiez la connexion MongoDB

### Changement de configuration non effectif

**Causes possibles :**
1. Cache du navigateur
2. Erreur lors de l'activation

**Solutions :**
1. Rechargez la page
2. Vérifiez les logs du serveur
3. Testez l'accès à la nouvelle configuration

## 🔄 Migration depuis l'ancien système

Si vous utilisez actuellement les variables d'environnement pour la configuration Google Sheets :

1. **Exécutez la migration** : `npm run migrate:google-sheets`
2. **Vérifiez** que la configuration par défaut a été créée
3. **Testez** l'accès via l'interface
4. **Créez** de nouvelles configurations selon vos besoins

## 📝 Exemples d'utilisation

### Configuration pour plusieurs boutiques

```
- Boutique Centre-ville (ID: 1ABC...)
- Boutique Périphérie (ID: 2DEF...)
- Boutique En ligne (ID: 3GHI...)
```

### Configuration pour différents types de données

```
- Commandes (feuille: "Commandes")
- Inventaire (feuille: "Stock")
- Clients (feuille: "Clients")
```

### Changement saisonnier

```
- Hiver: Spreadsheet "Commandes_Hiver"
- Été: Spreadsheet "Commandes_Ete"
```

## 🆘 Support

En cas de problème :

1. Vérifiez les logs du serveur
2. Testez l'accès à la configuration
3. Vérifiez les permissions Google Sheets
4. Consultez la documentation Google Sheets API

---

**Note** : Cette fonctionnalité remplace complètement l'ancien système basé sur les variables d'environnement. Une fois configurée, l'application utilisera automatiquement la configuration active de la base de données.
