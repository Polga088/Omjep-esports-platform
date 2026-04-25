-- Ajouter la valeur CHAMPIONS à l'enum CompetitionType
-- ALTER TYPE ... ADD VALUE ne peut pas s'exécuter dans une transaction
-- Prisma migrate deploy gère cela correctement
ALTER TYPE "CompetitionType" ADD VALUE IF NOT EXISTS 'CHAMPIONS';
