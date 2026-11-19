# VéloSf — CycloSfaxcity

Système d'information de gestion de vélos en libre-service à Sfax (Tunisie), développé avec **Next.js (App Router, TypeScript)**, **Tailwind CSS** et **Supabase (PostgreSQL)** selon le thème **« Salines de Sfax »**.

## Surfaces & Écrans (34 écrans)
- **A1 (`/login`)** : Connexion du personnel (détection automatique du rôle Responsable / Technicien, verrouillage 10 min après 5 échecs).
- **K1 → K11 (`/borne`)** : Borne tactile de station (abonnés par carte + code secret à 4 chiffres, occasionnels par carte de courte durée, paiement TPE / e-DINAR, restitution et remboursement de garantie).
- **R1 → R18 (`/admin`)** : Back-office Responsable (tableau de bord, carte de Sfax, parc de vélos, acquisition en série/remplacement, réforme, stations, fournisseurs, types & entrepôts, réclamations, planification & suivi des réparations, mouvements, itinéraires, ordres de mission, camions, abonnés & cartes, locations, personnel).
- **T1 → T4 (`/technicien`)** : Application mobile Technicien (aujourd'hui, contrôle journalier avec mode hors-ligne, exécution des missions, clôture des réparations).

## Installation & Base de données Supabase
1. Ouvrez votre projet Supabase → **SQL Editor**.
2. Exécutez d'abord [`supabase/schema.sql`](supabase/schema.sql) (tables, contraintes UML, triggers de capacité, fonctions RPC atomiques, RLS).
3. Exécutez ensuite [`supabase/seed.sql`](supabase/seed.sql) (données de démonstration : 6 stations de Sfax, vélos `VSF-000401`..`VSF-000445`, personnel, abonnés).
4. Configurez `.env.local` à partir de `.env.example` :
   ```bash
   cp .env.example .env.local
   ```
5. Lancez le serveur de développement :
   ```bash
   npm install
   npm run dev
   ```

## Comptes de démonstration
- **Responsable** : Matricule `1001` (Ahmed Ben Salah) · Mot de passe : `Sfax2026!`
- **Technicienne** : Matricule `2014` (Yasmine Trabelsi) · Mot de passe : `Sfax2026!`
- **Technicien** : Matricule `2019` (Karim Jlassi) · Mot de passe : `Sfax2026!`
- **Abonné borne** : Carte `#10001` (Mohamed Gharbi) · Code secret : `1234`
