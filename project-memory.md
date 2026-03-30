# OMJEP - Esports Platform
**Project Memory & Context**

## 🎯 Vision du Projet
Plateforme de gestion e-sport pour les clubs EA FC (Pro Clubs), permettant le suivi automatique des statistiques, la gestion d'effectif et le classement compétitif.

## 🛠 Architecture Technique (Monorepo)
- **Frontend :** React (Vite) + Tailwind CSS + Lucide React + Zustand (State Management).
- **Backend :** NestJS + Prisma ORM + PostgreSQL.
- **Shared :** TypeScript, Zod pour la validation.
- **Localisation :** `@apps/api` (Backend), `@apps/web` (Frontend), `@packages/database` (Prisma).

## 📊 État actuel du Système
- **Auth :** Système Login/Register fonctionnel (JWT).
- **Database :** - Modèles `User`, `Team`, `TeamMember`, `PlayerStats` opérationnels.
  - Relation : 1 User peut appartenir à 1 Team via `TeamMember`.
- **Sync Engine (Cron Job) :** - Un service `SyncService` tourne toutes les 5 minutes.
  - Récupère les stats via un Mock (dev) ou l'API proclubs.io.
  - Met à jour les `PlayerStats` automatiquement via `upsert`.
- **UI Dashboard :**
  - Layout avec Sidebar responsive et logout fonctionnel.
  - Page `MyTeam` (/dashboard/team) : Affiche le vrai roster de l'utilisateur connecté avec ses stats réelles (Full-stack loop OK).

## 🔐 Configuration Critique
- **Roles :** `ADMIN`, `MANAGER`, `PLAYER`, `FOUNDER`, `CO_MANAGER`.
- **Positions :** GK, DC, LAT, RAT, MDC, MOC, MG, MD, BU, ATT.
- **API Base URL :** `http://localhost:3001/api/v1`
- **Frontend URL :** `http://localhost:3000`

## 🚀 Prochaines Étapes
1. **Option 1 :** Dashboard Home (Stats globales, MVP, derniers résultats).
2. **Option 2 :** Gestion du Profil (Changement de position, pseudo EA).
3. **Option 3 :** Ladder (Classement des clubs).

## 📌 Notes de Développement
- Toujours utiliser les DTOs avec `class-validator` pour les entrées API.
- Les routes protégées nécessitent le `JwtAuthGuard`.
- Prioriser le design "E-sport Dark Mode" (#0f172a).