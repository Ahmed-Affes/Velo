# VéloSf — CycloSfaxcity

Système d'information de gestion de vélos en libre-service à Sfax (Tunisie), développé avec **Next.js (App Router, TypeScript)**, **Tailwind CSS** et **Supabase (PostgreSQL)** selon le thème **« Salines de Sfax »**.

## Surfaces & Écrans
- **A1 (`/login`)** : Connexion du personnel (détection automatique du rôle Responsable / Technicien, verrouillage 10 min après 5 échecs) et configuration initiale du premier Responsable sur une base vide.
- **K1 → K11 (`/borne`)** : Borne tactile de station (abonnés par carte + code secret à 4 chiffres, occasionnels par carte de courte durée, paiement TPE / e-DINAR, restitution et remboursement de garantie).
- **R1 → R18 (`/admin`)** : Back-office Responsable (tableau de bord, carte de Sfax, parc de vélos, acquisition en série/remplacement, réforme, stations, fournisseurs, types & entrepôts, réclamations, planification & suivi des réparations, mouvements, itinéraires, ordres de mission, camions, abonnés & cartes, locations, personnel).
- **T1 → T4 (`/technicien`)** : Application Technicien (aujourd'hui, contrôle journalier avec mode hors-ligne, exécution des missions, clôture des réparations).

## Installation & Démarrage à zéro
1. Ouvrez votre projet Supabase → **SQL Editor**.
2. Exécutez [`supabase/schema.sql`](supabase/schema.sql) (tables, contraintes UML, triggers de capacité, fonctions RPC atomiques, RLS).
   - Si votre base contient déjà des données de test, exécutez [`supabase/reset.sql`](supabase/reset.sql) pour tout vider à zéro.
3. Configurez `.env.local` à partir de `.env.example` :
   ```bash
   cp .env.example .env.local
   ```
4. Lancez le serveur de développement :
   ```bash
   npm install
   npm run dev
   ```
5. Ouvrez `/login` pour créer le premier compte **Responsable**, puis configurez vos entrepôts, types de vélos, stations, fournisseurs, camions, techniciens, vélos et abonnés depuis `/admin`.
