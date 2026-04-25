-- Textes d’exemple pour l’affichage des avantages (JSON)
UPDATE "subscription_plans"
SET "features" = '["Cosmétiques et bonus de profil VIP", "Accès prioritaire aux événements", "Badge joueur premium"]'::jsonb
WHERE "code" = 'PLAYER';

UPDATE "subscription_plans"
SET "features" = '["Club en mode premium président", "Outils de gestion étendus", "Visibilité renforcée du club"]'::jsonb
WHERE "code" = 'PRESIDENT';
