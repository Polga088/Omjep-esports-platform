/**
 * Valeurs alignées sur `enum UserRole` (schema Prisma).
 * Définition locale pour éviter de résoudre `@omjep/database` → `database/src/index.ts` côté Vite.
 */
export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  PLAYER: 'PLAYER',
  MODERATOR: 'MODERATOR',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
