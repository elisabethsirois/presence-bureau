# Plan Intégral : Migration & Backend pour Presence-Bureau

> **Projet** : Gestion de calendrier des présences au bureau (Full-Stack Next.js)  
> **Emplacement** : E:/repository/presence-bureau  
> **Contexte** : Basé sur le prototype UI statique réalisé par Élisabeth Sirois (gemini-code-1790002020286.html).

---

## 1. Synthèse du Projet & Besoins

- **Migration vers Next.js** : Passer d'une page HTML/JS statique à une application full-stack moderne, maintenable et scalable.
- **Préservation fidèle de l'UI** : Conserver le design existant (palette pastel, statuts Bureau / Télétravail / Absent, alternance AM/PM, disposition mensuelle).
- **Système d'authentification** : Création de compte (egister) et connexion sécurisée (login).
- **Système d'équipes étanches** : Chaque utilisateur n'accède qu'au calendrier et aux présences des membres de son équipe.
- **Rôle Administrateur** : Vue d'ensemble sur toutes les équipes, création et suppression d'équipes, gestion et suppression d'utilisateurs.
- **Persistance des données** : Stockage fiable en base de données relationnelle (remplaçant le localStorage).

---

## 2. Technologies Recommandées

| Couche | Technologie | Pourquoi ce choix ? |
| :--- | :--- | :--- |
| **Framework Full-Stack** | **Next.js 15 (App Router, TypeScript)** | Frontend React + Backend (Server Actions) dans un seul projet. Zéro configuration de serveur backend séparé. |
| **Base de Données** | **SQLite (dev / local)** vers **PostgreSQL (production)** | **SQLite** fonctionne avec un simple fichier local (prisma/dev.db), ultra léger et sans aucun service ou serveur à installer. Passage transparent vers **PostgreSQL** (ex: Supabase / Neon gratuit) en modifiant une ligne. |
| **ORM** | **Prisma ORM** | Typage TypeScript automatique, migrations simples (
px prisma migrate dev), et explorateur de données visuel intégré (
px prisma studio). |
| **Authentification** | **NextAuth.js v5 (Auth.js)** | Sessions sécurisées par cookies HTTP-only avec ole et 	eamId inclus dans la session. |
| **Styling & UI** | **Tailwind CSS + CSS du prototype** | Conservation 100% fidèle des variables CSS (--office, --remote, --absent) et de la grille du calendrier. |
| **Validation & Icônes** | **Zod + Lucide React** | Validation robuste des formulaires et icônes SVG légères. |

---

## 3. Modèle de Données (Prisma Schema)

`prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  ADMIN
}

enum PresenceStatus {
  NONE
  OFFICE
  REMOTE
  ABSENT
}

model Team {
  id        String   @id @default(cuid())
  name      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  members   User[]
}

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  passwordHash String
  firstName    String
  lastName     String
  role         Role       @default(USER)
  teamId       String?
  team         Team?      @relation(fields: [teamId], references: [id], onDelete: SetNull)
  presences    Presence[]
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

model Presence {
  id        String         @id @default(cuid())
  date      String         // Format: YYYY-MM-DD
  amStatus  PresenceStatus @default(NONE)
  pmStatus  PresenceStatus @default(NONE)
  userId    String
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  updatedAt DateTime       @updatedAt

  @@unique([date, userId])
  @@index([date])
}
`

---

## 4. Architecture & Fonctionnalités Clés

### 4.1 Authentification & Inscription
- Inscription avec sélection de son équipe. Le 1er inscrit devient Admin (ou via un compte créé par seed).
- Connexion par email/mot de passe. Redirection automatique vers le calendrier.
- Middleware pour protéger les routes privées et restreindre /admin aux administrateurs.

### 4.2 Vue Calendrier (Utilisateur)
- Reprise du design de l'application statique.
- Contrôles personnels AM / PM : cycle au clic entre Bureau, Télétravail, Absent et Neutre.
- Sauvegarde instantanée en base de données via Server Action.
- Visualisation exclusive des collègues de **son équipe** dans les cellules du calendrier.

### 4.3 Espace d'Administration (/admin)
- Gestion des équipes : Création et suppression d'équipes.
- Gestion des utilisateurs : Réassignation d'équipe, modification des rôles (USER <-> ADMIN), suppression de compte.
- Sélecteur de vue : L'admin peut basculer d'une équipe à l'autre pour superviser n'importe quel planning.

---

## 5. Roadmap d'Exécution

1. **Étape 0** : Installation de Node.js LTS sur le poste de développement (winget install OpenJS.NodeJS.LTS).
2. **Étape 1** : Initialisation du projet Next.js avec TypeScript et Tailwind CSS dans E:/repository/presence-bureau.
3. **Étape 2** : Mise en place de Prisma, création du fichier SQLite et script de seed (comptes et équipes initiaux).
4. **Étape 3** : Système d'authentification complet (NextAuth + Register + Login + Middleware).
5. **Étape 4** : Migration des composants UI du calendrier et Server Actions pour la persistance des présences.
6. **Étape 5** : Dashboard d'administration (gestion des équipes, utilisateurs, filtres).
7. **Étape 6** : Validation complète et tests de flux.
