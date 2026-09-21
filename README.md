# 📅 Présence Bureau - Gestion de Calendrier & Télétravail

Application web full-stack moderne pour la planification et le suivi des présences au bureau et en télétravail par équipe.  
Migrée depuis un prototype statique vers une architecture **Next.js 15 (App Router)** avec persistance en base de données et gestion d'équipes étanches.

---

## 🚀 Fonctionnalités Clés

- **Authentification Sécurisée** : Inscription (`/register`) avec choix d'équipe et connexion (`/login`) via identifiants sécurisés (mots de passe hachés, cookies HTTP-only).
- **Cloisonnement par Équipe** : Chaque utilisateur ne voit sur le calendrier que les présences des membres de son équipe.
- **Calendrier Interactif & Intuitif** :
  - Vue mensuelle claire reprenant fidèlement le design original.
  - Découpage par demi-journée (**AM** et **PM**).
  - Bascule de statut au clic : `Bureau (Vert)` ➔ `Télétravail (Bleu)` ➔ `Absent (Rouge)` ➔ `Neutre / Non renseigné`.
  - Sauvegarde instantanée en base de données avec mise à jour optimiste.
- **Rôle Administrateur (`/admin`)** :
  - **Gestion des Équipes** : Création et suppression d'équipes.
  - **Gestion des Utilisateurs** : Attribution d'équipe, promotion au rôle Admin, suppression de compte.
  - **Supervision globale** : Sélecteur permettant à l'administrateur de consulter le calendrier de n'importe quelle équipe.

---

## 🛠️ Stack Technique

- **Frontend & Backend** : [Next.js 15](https://nextjs.org/) (App Router, React 19, Server Actions, TypeScript)
- **Base de Données** : **SQLite** en développement local (fichier autonome `prisma/dev.db`, zéro configuration) ➔ compatible **PostgreSQL** (Supabase, Neon, Docker) pour la production
- **ORM** : [Prisma ORM](https://www.prisma.io/)
- **Authentification** : [NextAuth.js v5](https://authjs.dev/) / Sessions sécurisées
- **Styling** : [Tailwind CSS](https://tailwindcss.com/) + variables CSS du prototype (`globals.css`)
- **Validation** : [Zod](https://zod.dev/)
- **Icônes** : [Lucide React](https://lucide.dev/)

---

## 📋 Prérequis

- **Système d'exploitation** : Windows, macOS ou Linux
- **Node.js** : Version LTS recommandée (v20+ ou v22+)
  - *Sous Windows (via PowerShell)* :
    ```powershell
    winget install OpenJS.NodeJS.LTS
    ```
    *(Redémarrer ensuite le terminal pour actualiser la variable `PATH`)*
- **Git** : Installé sur la machine

---

## ⚡ Installation & Démarrage Rapide

### 1. Cloner le projet (si ce n'est pas déjà fait)
```bash
git clone https://github.com/elisabethsirois/presence-bureau.git
cd presence-bureau
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer les variables d'environnement
Créez un fichier `.env` à la racine en copiant le modèle `.env.example` :
```bash
cp .env.example .env
```

Contenu par défaut du fichier `.env` :
```env
# URL de la base de données (SQLite en local)
DATABASE_URL="file:./dev.db"

# Clé secrète pour NextAuth (générer avec: npx auth secret ou openssl rand -base64 32)
AUTH_SECRET="votre_cle_secrete_aleatoire"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Initialiser la Base de Données & Peupler les données de test
```bash
# Appliquer les migrations Prisma
npx prisma migrate dev --name init

# Exécuter le script de seed (crée des équipes et des utilisateurs initiaux)
npx prisma db seed
```

### 5. Lancer le serveur de développement
```bash
npm run dev
```
L'application est accessible à l'adresse : **[http://localhost:3000](http://localhost:3000)**.

---

## 📜 Scripts Disponibles

| Commande | Description |
| :--- | :--- |
| `npm run dev` | Démarre le serveur de développement Next.js sur `http://localhost:3000` |
| `npm run build` | Compile l'application pour la production |
| `npm run start` | Démarre l'application compilée en mode production |
| `npm run lint` | Analyse le code avec ESLint pour détecter d'éventuelles erreurs |
| `npx prisma migrate dev` | Crée et applique une nouvelle migration sur la base de données locale |
| `npx prisma db seed` | Remplit la base de données avec les données initiales (équipes, admin, utilisateurs) |
| `npx prisma studio` | Ouvre une interface web d'administration de la base de données sur `http://localhost:5555` |
| `npx prisma generate` | Régénère le client TypeScript Prisma après modification de `schema.prisma` |

---

## 🗄️ Modèle de Données (Prisma)

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│     Team     │ 1     * │     User     │ 1     * │   Presence   │
├──────────────┤─────────├──────────────┤─────────├──────────────┤
│ id (cuid)    │         │ id (cuid)    │         │ id (cuid)    │
│ name         │         │ email        │         │ date (Y-M-D) │
│ createdAt    │         │ passwordHash │         │ amStatus     │
│ updatedAt    │         │ firstName    │         │ pmStatus     │
└──────────────┘         │ lastName     │         │ userId (FK)  │
                         │ role (ADMIN) │         │ updatedAt    │
                         │ teamId (FK)  │         └──────────────┘
                         └──────────────┘
```

- **Statuts possibles (`PresenceStatus`)** :
  - `NONE` : Non renseigné (`—`)
  - `OFFICE` : Présent au bureau
  - `REMOTE` : Télétravail
  - `ABSENT` : Absent / Congé

---

## 🛡️ Comptes par Défaut (Générés par le Seed)

Après avoir exécuté `npx prisma db seed`, les comptes suivants sont prêts à l'emploi :

| Rôle | Nom | Email | Mot de passe initial | Équipe assignée |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Élisabeth Sirois | `admin@bureau.local` | `Admin123!` | Équipe Alpha |
| **Utilisateur** | Frédérique Bonenfant | `frederique@bureau.local` | `User123!` | Équipe Alpha |
| **Utilisateur** | Allyne Fernandes | `allyne@bureau.local` | `User123!` | Équipe Alpha |

*(Pensez à modifier ces identifiants lors d'un déploiement en production)*.

---

## 📁 Structure du Projet

```
presence-bureau/
├── prisma/
│   ├── schema.prisma            # Définition des modèles de données et enums
│   ├── seed.ts                  # Données de test initiales
│   └── dev.db                   # Base de données SQLite locale (générée automatiquement)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx   # Écran de connexion
│   │   │   └── register/page.tsx# Écran d'inscription avec choix d'équipe
│   │   ├── admin/
│   │   │   └── page.tsx         # Tableau de bord Admin (équipes & utilisateurs)
│   │   ├── globals.css          # Variables de couleurs & styles du calendrier
│   │   ├── layout.tsx           # Layout racine
│   │   └── page.tsx             # Page principale (calendrier de l'équipe)
│   ├── components/
│   │   ├── Calendar/
│   │   │   ├── CalendarGrid.tsx # Grille calendaire 7 colonnes
│   │   │   ├── DayCell.tsx      # Cellule d'un jour avec contrôles AM/PM
│   │   │   └── SlotButton.tsx   # Bouton de bascule de statut
│   │   ├── Navbar.tsx           # Barre supérieure avec profil et déconnexion
│   │   └── Admin/               # Composants de gestion administrateur
│   ├── lib/
│   │   ├── auth.ts              # Configuration NextAuth & gestion de session
│   │   ├── db.ts                # Client Prisma singleton
│   │   └── actions/
│   │       ├── presence.ts      # Server Actions pour modifier les présences
│   │       └── admin.ts         # Server Actions pour administrer équipes/users
│   └── middleware.ts            # Protection des routes et vérification des rôles
├── .env.example                 # Modèle des variables d'environnement
├── package.json                 # Dépendances et scripts npm
├── PLAN.md                      # Plan d'implémentation détaillé du projet
└── README.md                    # Documentation principale du projet
```