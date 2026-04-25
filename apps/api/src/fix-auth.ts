import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function run() {
  // Configuration de l'accès
  const targetUsername = 'polga00088';
  const newPassword = 'admin'; // Mot de passe temporaire
  
  console.log(`🚀 Tentative de mise à jour pour : ${targetUsername}...`);

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  try {
    const user = await prisma.user.upsert({
      where: { username: targetUsername },
      update: {
        password: hashedPassword,
        role: 'ADMIN', // On s'assure que tu as les droits
      },
      create: {
        username: targetUsername,
        email: 'admin@omjep.local',
        password: hashedPassword,
        role: 'ADMIN',
        xp: 0,
        level: 1,
        coins: 500,
      },
    });

    console.log("✅ Succès !");
    console.log(`Identifiant : ${user.username}`);
    console.log(`Nouveau mot de passe : ${newPassword}`);
    console.log("Note : Utilise ces identifiants sur ton localhost:3000");
  } catch (error) {
    console.error("❌ Erreur Prisma :", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();