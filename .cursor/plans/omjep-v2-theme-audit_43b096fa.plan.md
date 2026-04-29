---
name: omjep-v2-theme-audit
overview: Audit UI complet de la couche visuelle actuelle pour identifier les styles dangereux, les dépassements de scope et définir un plan de refonte design system OMJEP V2 sans toucher à la logique métier, auth ni routes.
todos:
  - id: audit-global-css
    content: Lister et neutraliser les règles globales dangereuses dans index.css sans impacter la logique
    status: pending
  - id: rebuild-v2-tokens
    content: Reconstruire les tokens OMJEP V2 light/dark (mauve principal, gold accent, lisibilité)
    status: pending
  - id: scope-core-primitives
    content: Isoler les primitives UI par composants/pages avec scopes explicites
    status: pending
  - id: page-by-page-retheme
    content: Refondre Loading, Dashboard, Store, Leaderboard en lots séparés sans mélange
    status: pending
  - id: a11y-hardening
    content: Valider contrastes, états UI, cohérence dark/light et maintenabilité
    status: pending
isProject: false
---

# Audit OMJEP V2 — état actuel et plan de refonte

## Périmètre audité
- [apps/web/src/index.css](apps/web/src/index.css)
- [apps/web/tailwind.config.js](apps/web/tailwind.config.js)
- [apps/web/src/App.tsx](apps/web/src/App.tsx)
- [apps/web/src/layouts/DashboardLayout.tsx](apps/web/src/layouts/DashboardLayout.tsx)
- [apps/web/src/pages/Dashboard/Index.tsx](apps/web/src/pages/Dashboard/Index.tsx)
- [apps/web/src/pages/Dashboard/Leaderboard.tsx](apps/web/src/pages/Dashboard/Leaderboard.tsx)
- [apps/web/src/pages/Dashboard/Matches.tsx](apps/web/src/pages/Dashboard/Matches.tsx)
- [apps/web/src/pages/Dashboard/MyTeam.tsx](apps/web/src/pages/Dashboard/MyTeam.tsx)
- [apps/web/src/pages/Store/Store.tsx](apps/web/src/pages/Store/Store.tsx)
- [apps/web/src/pages/Home.tsx](apps/web/src/pages/Home.tsx)
- [apps/web/src/components/AppLoader.tsx](apps/web/src/components/AppLoader.tsx)
- cockpit partagés: [apps/web/src/components/cockpit/WidgetGrid.tsx](apps/web/src/components/cockpit/WidgetGrid.tsx), [apps/web/src/components/cockpit/WidgetTile.tsx](apps/web/src/components/cockpit/WidgetTile.tsx), [apps/web/src/components/cockpit/BottomDock.tsx](apps/web/src/components/cockpit/BottomDock.tsx), [apps/web/src/components/cockpit/CinematicRouteStage.tsx](apps/web/src/components/cockpit/CinematicRouteStage.tsx), [apps/web/src/components/cockpit/ContactZone.tsx](apps/web/src/components/cockpit/ContactZone.tsx)
- composants UI réutilisables: [apps/web/src/components/kimi/TechnicalDataValue.tsx](apps/web/src/components/kimi/TechnicalDataValue.tsx), [apps/web/src/components/LivePlayerCard.tsx](apps/web/src/components/LivePlayerCard.tsx), sections Home [apps/web/src/sections/Hero.tsx](apps/web/src/sections/Hero.tsx), [apps/web/src/sections/Statistics.tsx](apps/web/src/sections/Statistics.tsx), [apps/web/src/sections/Leaderboard.tsx](apps/web/src/sections/Leaderboard.tsx), [apps/web/src/sections/LiveMatches.tsx](apps/web/src/sections/LiveMatches.tsx), [apps/web/src/sections/PlayerProfile.tsx](apps/web/src/sections/PlayerProfile.tsx), [apps/web/src/sections/RecentActivity.tsx](apps/web/src/sections/RecentActivity.tsx)

## 1) Styles dangereux existants
- `index.css` contient une couche massive d’overrides avec `!important` (modales, topbar, badges, pulse, store/community/admin), ce qui casse la hiérarchie des composants et rend les thèmes imprévisibles.
- `index.css` mélange plusieurs directions artistiques concurrentes (cyan/neon/emerald/carbone/noir pur) en global, contraire à la DA demandée (mauve principal + gold accent discret).
- Présence de sélecteurs attributaires larges (`[class*='badge']`, `[class*='status']`, `[class*='pill']`, `[class*='text-slate-']`) qui modifient des composants non visés.
- Overrides globaux sur `[role='dialog']` et `.animate-pulse` pouvant impacter Loading, Dashboard, Store, Leaderboard de manière transversale.
- `:root` définit `color-scheme` et tokens, mais le reste du fichier applique des styles “thème” non tokenisés en dur (`#000`, `#fff`, `slate`, `emerald`) qui créent des incohérences Light/Dark.
- `tailwind.config.js` conserve des palettes legacy (`brand`, `pixar`, `esport`) et animations thématiques non alignées sur OMJEP V2, ce qui favorise la dérive visuelle.

## 2) Styles trop globaux à supprimer/réduire
- Réduire/supprimer resets globaux non nécessaires:
  - `* { margin:0; padding:0; }`
  - `*`, `*::before`, `*::after { transition: none; }`
- Retirer les modifications globales de composants génériques:
  - `.lucide { ... !important }`
  - `.animate-pulse { ... !important }`
  - `[role='dialog'] { ... !important }`
- Supprimer les sélecteurs génériques basés sur noms de classes:
  - `[class*='badge'|'Badge'|'pill'|'Pill'|'status'|'Status']`
  - `[class*='text-slate-']`
- Supprimer les styles transversaux pages “bundle”:
  - `.kimi-luxury-store-page ... !important`
  - `.kimi-community-page ... !important`
  - `.kimi-admin-page table ... !important`
  - `.kimi-luxury-store-page ul/ol/table ... !important`
- Encapsuler les personnalisations scrollbars et modales par scope de composant (pas `html` global hors minimum accessibilité).

## 3) Composants à isoler avec leur propre scope
- **Loading uniquement**: [apps/web/src/components/AppLoader.tsx](apps/web/src/components/AppLoader.tsx) + classes `.app-loader-*` conservées strictement dédiées au loader.
- **Dashboard shell uniquement**: [apps/web/src/layouts/DashboardLayout.tsx](apps/web/src/layouts/DashboardLayout.tsx) et cockpit (`WidgetTile`, `WidgetGrid`, `BottomDock`, `CinematicRouteStage`, `ContactZone`) via namespace de classes dédié (ex. `omjep-cockpit-*`).
- **Leaderboard page**: [apps/web/src/pages/Dashboard/Leaderboard.tsx](apps/web/src/pages/Dashboard/Leaderboard.tsx) doit utiliser ses tokens/table classes sans dépendre de règles globales table/list.
- **Store page**: [apps/web/src/pages/Store/Store.tsx](apps/web/src/pages/Store/Store.tsx) doit sortir de `.kimi-luxury-store-page` global override et passer sur composants atomiques store-scoped.
- **Home/landing sections**: [apps/web/src/pages/Home.tsx](apps/web/src/pages/Home.tsx) + `sections/*` doivent être isolés de tout style dashboard/cockpit (palette et surface propres).
- **MyTeam / Matches**: actuellement très “hardcoded” (`gray/slate/amber`) ; ces pages doivent consommer tokens sémantiques page-level, pas palette brute.

## 4) Tokens à reconstruire (Design System OMJEP V2)
- **Fondations couleur (Light + Dark)**
  - Mauve principal: `--omjep-color-primary-*`
  - Gold accent prestige: `--omjep-color-accent-gold-*`
  - Success discret vert: `--omjep-color-success-*`
  - Error rouge: `--omjep-color-danger-*`
  - Neutres lisibilité: `--omjep-color-text-*`, `--omjep-color-bg-*`, `--omjep-color-surface-*`, `--omjep-color-border-*`
- **Tokens sémantiques UI**
  - `--omjep-surface-base|elevated|overlay|interactive`
  - `--omjep-text-primary|secondary|muted|inverse`
  - `--omjep-border-default|strong|focus|gold`
  - `--omjep-state-success|warning|error|info`
- **Effets maîtrisés**
  - `--omjep-shadow-sm|md|lg` (sans black massif)
  - `--omjep-glow-mauve-soft`, `--omjep-glow-gold-soft` (accent subtil)
  - `--omjep-backdrop-blur-sm|md`
- **Typographie**
  - `--omjep-font-heading|body|mono`
  - `--omjep-text-scale-*` pour éviter tailles arbitraires répétées
- **Rayons/espacements/composants**
  - `--omjep-radius-*`, `--omjep-space-*`, `--omjep-control-height-*`
- **Motion**
  - `--omjep-motion-fast|base|slow`, easing standardisée
  - réduire/encadrer animations néon pour préserver lisibilité

## 5) Plan d’implémentation en 4 phases

### Phase 1 — Foundations & Guardrails
- Refaire les tokens OMJEP V2 Light/Dark dans [apps/web/src/index.css](apps/web/src/index.css) + harmoniser `tailwind.config.js` autour de ces variables.
- Éliminer les overrides globaux dangereux et `!important` non indispensables.
- Appliquer une stratégie **stabilité d’abord**:
  - ne pas supprimer brutalement une règle globale potentiellement multi-pages
  - migrer d’abord vers un scope explicite (`.omjep-cockpit-*`, `.omjep-store-*`, `.omjep-leaderboard-*`, `.app-loader-*`)
  - supprimer la règle globale seulement après remplacement/scoping
- Conserver seulement un socle global minimal (reset léger, typographie de base, root background/text).
- Ordre d’exécution obligatoire en Phase 1:
  - 1) introduire/remplacer tokens
  - 2) dupliquer les règles sensibles vers scopes explicites
  - 3) retirer les globales devenues redondantes
  - 4) valider build

### Phase 2 — Core primitives scoppées
- Stabiliser les primitives cockpit/store/leaderboard via classes composant (`WidgetTile`, `ContactZone`, `BottomDock`, surfaces, badges) sans selectors globaux.
- Créer variantes explicites (surface/card/button/badge/status) consommant uniquement des tokens.
- Vérifier cohérence contrastes Light/Dark composant par composant.

### Phase 3 — Page-by-page visual rebuild (sans mélange)
- Refaire visuel **Loading** indépendamment.
- Refaire visuel **Dashboard** (layout + pages Dashboard ciblées) sans toucher Store/Leaderboard.
- Refaire visuel **Store** isolément.
- Refaire visuel **Leaderboard** isolément.
- Refaire **Home sections** avec DA alignée mais indépendante du cockpit.

### Phase 4 — Hardening, accessibility, cleanup
- Audit final contrastes, focus states, états hover/active/disabled/error/success.
- Nettoyage classes legacy/dupliquées, suppression des patterns `slate/emerald` hardcodés hors cas métier.
- Vérification anti-régression visuelle (Light/Dark) par page et composant.
- Documentation courte du design system (tokens + conventions de scope) pour maintenabilité.

## Notes critiques de conformité à tes règles
- Les points bloquants actuels sont majoritairement dans [apps/web/src/index.css](apps/web/src/index.css) (global overrides + `!important` + sélecteurs attributaires larges).
- La logique métier, auth et routes peuvent être entièrement préservées: la refonte est faisable uniquement par couche présentation/tokens/classes.
- Le cloisonnement Loading/Dashboard/Store/Leaderboard doit être explicite via namespaces de classes et suppression des overrides transverses.
- Contrainte de sécurité de rollout: **priorité stabilité > suppression agressive** pour toute règle globale à impact incertain.