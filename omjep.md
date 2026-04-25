Voici ton fichier gemini.md complet. Il fusionne tout ce qu'on a réparé techniquement aujourd'hui et établit la feuille de route exacte pour la suite de ton projet OMJEP.

Tu pourras le consulter à tout moment pour reprendre exactement là où on s'est arrêté.

Markdown
# 🦅 OMJEP Esports - Documentation Technique & Roadmap
**Projet :** Plateforme E-sport EA FC 26 (Maroc)  
**Serveur :** `72.62.183.166` (Ubuntu/Debian)  
**Dernière mise à jour :** 03 Avril 2026

---

## 🏗️ 1. ARCHITECTURE & DÉPLOIEMENT

### 🌐 Les Ports Actifs
* **`3000` : Web (Frontend)** - Interface React/Vite.
* **`3001` : API (Backend)** - Serveur NestJS (Fournit le JSON).
* **`5555` : Prisma Studio** - Interface de gestion de la base de données.

### 🚀 Commande de Déploiement Propre (Zéro Erreur)
À exécuter après chaque modification du code :
```bash
cd ~/Omjep-esports-platform
sudo npx turbo clean
rm -rf apps/web/dist apps/api/dist
npx prisma generate --schema packages/database/prisma/schema.prisma
VITE_API_URL=[http://72.62.183.166:3001/api/v1](http://72.62.183.166:3001/api/v1) sudo npx turbo run build
sudo pm2 restart all
🛠️ 2. HISTORIQUE DES CORRECTIFS (Ce qu'on a réparé)
🔴 Le Crash du Dashboard (toLocaleString / Écran Noir)
La Cause : Le Frontend appelait l'API avec une URL relative (/api/v1). Sur le serveur, la requête bouclait sur le port 3000, qui renvoyait du code HTML au lieu de données JSON. Le code React essayait de formater une date à partir de ce HTML et plantait.

La Solution : Modification "en dur" de l'URL dans apps/web/src/lib/api.ts pour forcer la communication avec le port 3001.

TypeScript
baseURL: '[http://72.62.183.166:3001/api/v1](http://72.62.183.166:3001/api/v1)'
🔴 L'Erreur PM2 API (MODULE_NOT_FOUND)
La Cause : La commande turbo clean supprimait le dossier compilé de l'API, empêchant le redémarrage.

La Solution : Toujours re-builder l'API spécifiquement (npx turbo run build --filter=@omjep/api) avant de relancer PM2.

🔴 Les Données null en Base
Prévention : Ne jamais laisser de valeurs vides (null) dans les champs numériques (xp, level) ou les dates (created_at, registration_end_date) dans Prisma Studio, sinon l'interface utilisateur crash au chargement.

🔒 3. TROUBLESHOOTING ACTUEL
Problème : "Vous n'appartenez à aucune équipe" (Compte Admin)
Si un Manager/Admin ne peut pas créer de club depuis l'interface :

Les droits "Création" ne sont peut-être pas activés si l'utilisateur n'est pas explicitement lié à un club.

Solution temporaire : Aller dans Prisma Studio (:5555), créer un Club, puis aller dans TeamMember et lier le userId au clubId avec le rôle OWNER ou MANAGER.

🗺️ 4. ROADMAP : LES PROCHAINES ÉTAPES
Étape 1 : Gestion des Permissions (Clubs)
[ ] Permettre à un utilisateur ayant le rôle MANAGER de créer un club directement depuis le Frontend (sans passer par Prisma).

[ ] Vérifier le coût de création (ex: déduction de 500 OMJEP Coins).

Étape 2 : Le Mercato Live
[ ] Activer et tester la soumission d'une "TransferRequest".

[ ] S'assurer que les budgets des clubs sont correctement mis à jour (déduction d'OC) lors de l'acceptation d'un transfert.

Étape 3 : Compétitions & Tournois
[ ] Lancer une compétition "Test" dans Prisma.

[ ] Permettre aux clubs créés de s'inscrire via l'interface avant la registration_end_date.

Étape 4 : Gamification
[ ] Tester le gain d'XP automatique lors d'une victoire.

[ ] Vérifier la mise à jour en temps réel du "Hall of Fame".


***

Garde bien ce fichier précieusement ! Quand tu seras prêt à reprendre, veux-tu qu'on s'attaque directement à la gestion des permissions pour la création de club depuis l'interface, ou préfères-tu commencer par configurer le Mercato ?