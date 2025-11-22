# ENCG Barakat - Plateforme Éducative

Une plateforme web moderne pour la gestion et le partage de ressources pédagogiques à l'École Nationale de Commerce et de Gestion (ENCG).

## 📋 Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Fonctionnalités](#fonctionnalités)
- [Technologies](#technologies)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Architecture](#architecture)
- [Sécurité](#sécurité)
- [Déploiement](#déploiement)
- [Contribution](#contribution)

## 🎯 Vue d'ensemble

ENCG Barakat est une plateforme éducative complète conçue pour faciliter l'accès aux ressources pédagogiques. Elle permet aux étudiants de consulter, prévisualiser et télécharger des cours et travaux dirigés (TDs), tout en offrant aux administrateurs des outils de gestion avancés.

### Objectifs principaux
- **Accessibilité** : Interface intuitive et responsive
- **Sécurité** : Authentification robuste et protection des données
- **Performance** : Chargement rapide et expérience utilisateur fluide
- **Gestion** : Outils d'administration complets

## ✨ Fonctionnalités

### 🎓 Pour les Étudiants
- **Navigation libre** : Accès aux cours et TDs sans connexion
- **Prévisualisation** : Aperçu des documents avant téléchargement
- **Téléchargement** : Accès aux fichiers (connexion requise)
- **Recherche** : Filtrage par année et matière
- **Interface responsive** : Compatible mobile et desktop

### �‍💼 Pour les Administrateurs
- **Gestion des utilisateurs** : Création, modification, suppression
- **Gestion des fichiers** : Upload, organisation, suppression
- **Statistiques** : Aperçu des données et métriques
- **Contrôle d'accès** : Gestion des permissions et statuts
- **Tableau de bord** : Vue d'ensemble centralisée

### � Sécurité
- **Authentification Firebase** : Système de connexion sécurisé
- **Protection CSRF** : Tokens de sécurité dynamiques
- **Rate limiting** : Protection contre les attaques par force brute
- **Validation des entrées** : Sanitisation et validation côté client/serveur
- **Turnstile CAPTCHA** : Protection contre les bots

## 🛠 Technologies

### Frontend
- **React 19** : Framework JavaScript moderne
- **React Router DOM** : Navigation côté client
- **React Icons** : Bibliothèque d'icônes
- **Vite** : Outil de build rapide
- **CSS3** : Styles modernes avec animations

### Backend & Services
- **Firebase** : Backend-as-a-Service
  - Authentication : Gestion des utilisateurs
  - Realtime Database : Base de données temps réel
  - Storage : Stockage de fichiers
  - Hosting : Hébergement web

### Sécurité & Performance
- **Cloudflare Turnstile** : Protection CAPTCHA
- **ESLint** : Analyse statique du code
- **Vercel** : Déploiement et CDN

## 🚀 Installation

### Prérequis
- Node.js (version 18 ou supérieure)
- npm ou yarn
- Compte Firebase
- Compte Cloudflare (pour Turnstile)

### Étapes d'installation

1. **Cloner le repository**
```bash
git clone https://github.com/votre-username/encg-barakat.git
cd encg-barakat
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration Firebase**
```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer le fichier .env avec vos clés Firebase
```

4. **Démarrer le serveur de développement**
```bash
npm run dev
```

## ⚙️ Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Cloudflare Turnstile
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

### Configuration Firebase

1. **Créer un projet Firebase**
2. **Activer Authentication** (Email/Password)
3. **Configurer Realtime Database**
4. **Configurer Storage**
5. **Définir les règles de sécurité**

Consultez `FIREBASE_SETUP.md` pour les instructions détaillées.

## 📖 Utilisation

### Scripts disponibles

```bash
# Développement
npm run dev          # Démarrer le serveur de développement

# Production
npm run build        # Construire pour la production
npm run preview      # Prévisualiser la build de production

# Maintenance
npm run lint         # Analyser le code
npm run gen:cours    # Générer l'index des cours
npm run gen:td       # Générer l'index des TDs
```

### Structure des utilisateurs

#### Rôles
- **student** : Accès aux ressources, téléchargement
- **admin** : Gestion complète de la plateforme

#### Statuts
- **Actif** : Accès complet aux fonctionnalités
- **Inactif** : Accès restreint (étudiants uniquement)

## 🏗 Architecture

### Structure des dossiers

```
src/
├── components/          # Composants React
│   ├── styles/         # Fichiers CSS des composants
│   ├── home.jsx        # Page d'accueil
│   ├── login.jsx       # Page de connexion
│   ├── dashboard.jsx   # Tableau de bord admin
│   ├── UserManager.jsx # Gestion des utilisateurs
│   ├── FileManager.jsx # Gestion des fichiers
│   └── ...
├── utils/              # Utilitaires et helpers
├── firebase/           # Configuration Firebase
├── assets/             # Images et ressources statiques
└── App.jsx            # Composant principal
```

### Composants principaux

#### Pages publiques
- **Home** : Page d'accueil avec aperçus
- **Cours** : Navigation des cours par année
- **TD** : Navigation des TDs par année
- **About-Contact** : Informations et contact

#### Pages protégées
- **Login** : Authentification utilisateur
- **Dashboard** : Interface d'administration
- **UserManager** : Gestion des utilisateurs
- **FileManager** : Gestion des fichiers

#### Composants utilitaires
- **Navbar** : Navigation principale
- **ProtectedRoute** : Protection des routes
- **NotificationContext** : Système de notifications
- **Turnstile** : Intégration CAPTCHA

### Flux de données

1. **Context API** : Gestion de l'état global
2. **Firebase Realtime Database** : Synchronisation temps réel
3. **Local Storage** : Cache des préférences utilisateur
4. **URL Parameters** : Navigation et filtrage

## 🔐 Sécurité

### Mesures implémentées

#### Authentification
- **Firebase Auth** : Gestion sécurisée des sessions
- **Tokens JWT** : Validation côté serveur
- **Expiration automatique** : Sessions limitées dans le temps

#### Protection des données
- **Validation d'entrée** : Sanitisation de tous les inputs
- **CSRF Protection** : Tokens dynamiques
- **Rate Limiting** : Limitation des tentatives de connexion
- **XSS Prevention** : Échappement des données utilisateur

#### Contrôle d'accès
- **Rôles et permissions** : Système granulaire
- **Routes protégées** : Vérification des autorisations
- **Validation côté serveur** : Double vérification

### Règles Firebase

```javascript
// Realtime Database Rules
{
  "rules": {
    "users": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'admin'"
    }
  }
}
```

## 🚀 Déploiement

### Vercel (Recommandé)

1. **Connecter le repository**
2. **Configurer les variables d'environnement**
3. **Déployer automatiquement**

```bash
# Installation Vercel CLI
npm i -g vercel

# Déploiement
vercel --prod
```

### Firebase Hosting

```bash
# Installation Firebase CLI
npm install -g firebase-tools

# Connexion
firebase login

# Initialisation
firebase init hosting

# Déploiement
npm run build
firebase deploy
```

### Variables d'environnement de production

Assurez-vous de configurer toutes les variables d'environnement sur votre plateforme de déploiement.

## 🤝 Contribution

### Guidelines

1. **Fork** le repository
2. **Créer** une branche feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** les changements (`git commit -m 'Add AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir** une Pull Request

### Standards de code

- **ESLint** : Respecter les règles définies
- **Naming** : Conventions camelCase pour JS, kebab-case pour CSS
- **Comments** : Documenter les fonctions complexes
- **Tests** : Ajouter des tests pour les nouvelles fonctionnalités

### Structure des commits

```
type(scope): description

feat(auth): add password reset functionality
fix(ui): resolve mobile navigation issue
docs(readme): update installation instructions
```
---

**Version** : 1.0.0  
**Dernière mise à jour** : Novembre 2025  
**Statut** : Production Ready
