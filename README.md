# Application de Gestion des Commandes E-commerce

Une application web complète pour la gestion et le suivi des commandes e-commerce depuis plusieurs boutiques en ligne, avec synchronisation Google Sheets et gestion des rôles utilisateurs.

## 🚀 Fonctionnalités

### 🔐 Authentification et Rôles
- **Administrateur Principal** : Accès complet à toutes les fonctionnalités
- **Administrateur Boutique (Closeur)** : Gestion des commandes de sa boutique
- **Livreur** : Suivi et mise à jour des commandes assignées

### 📦 Gestion des Commandes
- Affichage des commandes avec filtres avancés
- Attribution des commandes aux livreurs
- Mise à jour des statuts (livrée, non livrée, reprogrammée)
- Système de rappels et reprogrammation
- Historique complet des actions

### 👥 Gestion des Utilisateurs
- Création et modification des comptes utilisateurs
- Activation/désactivation des comptes
- Gestion des rôles et permissions

### 🔄 Synchronisation Google Sheets
- Connexion automatique aux Google Sheets
- Synchronisation périodique des données
- Import des nouvelles commandes

### 📱 Interface Moderne
- Design responsive avec Tailwind CSS
- Notifications en temps réel
- Interface intuitive et accessible

## 🛠️ Technologies Utilisées

### Backend
- **Node.js** avec Express.js
- **MongoDB** avec Mongoose
- **Socket.IO** pour les notifications temps réel
- **JWT** et sessions pour l'authentification
- **Google Sheets API** pour la synchronisation

### Frontend
- **React.js** avec hooks
- **React Router** pour la navigation
- **Tailwind CSS** pour le styling
- **Socket.IO Client** pour les communications temps réel
- **React Hook Form** pour la gestion des formulaires

## 📋 Prérequis

- Node.js (version 16 ou supérieure)
- MongoDB (local ou cloud)
- Compte Google Cloud avec Google Sheets API activée

## 🚀 Installation

1. **Cloner le repository**
   ```bash
   git clone <repository-url>
   cd commerce
   ```

2. **Installer les dépendances**
   ```bash
   npm run install-all
   ```

3. **Configuration de l'environnement**
   
   Créer le fichier `.env` dans le dossier `server/` :
   ```env
   # Configuration du serveur
   PORT=5000
   NODE_ENV=development

   # Configuration MongoDB
   MONGODB_URI=mongodb://localhost:27017/commerce_orders

   # Configuration JWT
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=24h

   # Configuration Google Sheets API
   GOOGLE_SHEETS_PRIVATE_KEY=your_private_key_here
   GOOGLE_SHEETS_CLIENT_EMAIL=your_client_email_here
   GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here

   # Configuration des sessions
   SESSION_SECRET=your_session_secret_here

   # Configuration CORS
   CLIENT_URL=http://localhost:3000
   ```

4. **Configuration Google Sheets API**
   
   - Créer un projet Google Cloud
   - Activer l'API Google Sheets
   - Créer un compte de service
   - Télécharger la clé privée JSON
   - Partager votre Google Sheet avec l'email du compte de service

5. **Démarrer l'application**
   ```bash
   npm run dev
   ```

   L'application sera accessible sur :
   - Frontend : http://localhost:3000
   - Backend : http://localhost:5000

## 📊 Structure des Données

### Google Sheet
Le Google Sheet doit contenir les colonnes suivantes :
- Numéro de commande
- Date de commande
- Nom du client
- Téléphone
- Adresse
- Produit
- Quantité
- Prix
- Boutique
- Statut
- Date de rappel (optionnel)
- ID du livreur (optionnel)

### Base de Données
L'application utilise MongoDB avec les collections suivantes :
- **users** : Utilisateurs et leurs rôles
- **orders** : Commandes avec historique complet

## 🔧 Scripts Disponibles

```bash
# Installation complète
npm run install-all

# Développement (client + serveur)
npm run dev

# Serveur uniquement
npm run server

# Client uniquement
npm run client

# Build de production
npm run build

# Démarrage en production
npm start
```

## 📱 Utilisation

### Connexion
1. Accédez à l'application via http://localhost:3000
2. Connectez-vous avec vos identifiants
3. L'interface s'adapte selon votre rôle

### Gestion des Commandes
- **Filtrage** : Utilisez les filtres pour trouver des commandes spécifiques
- **Actions** : Attribuez, reprogrammez ou mettez à jour les statuts
- **Temps réel** : Les mises à jour sont synchronisées en temps réel

### Synchronisation Google Sheets
- Configurez l'ID du Google Sheet dans les paramètres
- Testez la connexion
- Lancez une synchronisation manuelle ou automatique

## 🔒 Sécurité

- Authentification JWT avec sessions
- Hachage des mots de passe avec bcrypt
- Validation des données côté serveur
- Protection CSRF et XSS
- Rate limiting sur les API
- Headers de sécurité avec Helmet

## 📈 Fonctionnalités Avancées

### Notifications Temps Réel
- Nouvelles commandes
- Mises à jour de statut
- Rappels automatiques
- Notifications de livraison

### Rapports et Statistiques
- Vue d'ensemble des commandes
- Statistiques par boutique
- Performance des livreurs
- Historique des actions

### API REST
L'application expose une API REST complète :
- `/api/auth/*` - Authentification
- `/api/orders/*` - Gestion des commandes
- `/api/users/*` - Gestion des utilisateurs
- `/api/google-sheets/*` - Synchronisation Google Sheets

## 🐛 Dépannage

### Problèmes Courants

1. **Erreur de connexion MongoDB**
   - Vérifiez que MongoDB est démarré
   - Vérifiez l'URI de connexion dans `.env`

2. **Erreur Google Sheets API**
   - Vérifiez les credentials du compte de service
   - Assurez-vous que l'API est activée
   - Vérifiez les permissions du Google Sheet

3. **Problèmes de synchronisation**
   - Vérifiez le format des données dans le Google Sheet
   - Testez la connexion via l'interface

## 🤝 Contribution

1. Fork le projet
2. Créez une branche pour votre fonctionnalité
3. Committez vos changements
4. Poussez vers la branche
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- Ouvrez une issue sur GitHub
- Consultez la documentation technique
- Contactez l'équipe de développement

---

**Développé avec ❤️ pour simplifier la gestion des commandes e-commerce**
