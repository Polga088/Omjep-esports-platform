import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function reset() {
  const newPassword = 'AdminOMJEP2026!'; // Ton nouveau mot de passe
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  const user = await prisma.user.update({
    where: { username: 'polga00088' }, // On cible ton pseudo
    data: { 
      password: hashedPassword,
      email: 'admin@omjep.ma' // On en profite pour fixer l'email
    },
  });

  console.log(`✅ Succès !`);
  console.log(`Utilisateur: ${user.username}`);
  console.log(`Nouvel Email: admin@omjep.ma`);
  console.log(`Nouveau Password: ${newPassword}`);
  process.exit(0);
}

reset().catch((e) => {
  console.error("❌ Erreur :", e);
  process.exit(1);
});
