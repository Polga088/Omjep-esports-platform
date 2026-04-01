import { PrismaClient, UserRole, ClubRole, Platform, ValidationStatus, Position } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Test1234!';

const clubs = [
  {
    name: 'FC Algiers Eagles',
    platform: Platform.CROSSPLAY,
    description: 'Club phare d\'Alger, champion de la ligue virtuelle.',
    budget: 2500000,
    prestige_level: 5,
    ea_club_id: 'ea-club-001',
  },
  {
    name: 'Oran Thunder SC',
    platform: Platform.PS5,
    description: 'Club de l\'ouest algérien, puissance et vitesse.',
    budget: 1800000,
    prestige_level: 3,
    ea_club_id: 'ea-club-002',
  },
  {
    name: 'Constantine United',
    platform: Platform.XBOX,
    description: 'L\'union fait la force depuis les hauts plateaux.',
    budget: 2000000,
    prestige_level: 4,
    ea_club_id: 'ea-club-003',
  },
  {
    name: 'Annaba Sharks',
    platform: Platform.CROSSPLAY,
    description: 'Club de l\'est, redoutables en compétition.',
    budget: 1500000,
    prestige_level: 2,
    ea_club_id: 'ea-club-004',
  },
  {
    name: 'Sétif Wolves',
    platform: Platform.PS5,
    description: 'Meute soudée des hautes plaines sétifiennes.',
    budget: 1700000,
    prestige_level: 3,
    ea_club_id: 'ea-club-005',
  },
  {
    name: 'Tlemcen Lions',
    platform: Platform.CROSSPLAY,
    description: 'Club historique du nord-ouest, fiers et combatifs.',
    budget: 1600000,
    prestige_level: 3,
    ea_club_id: 'ea-club-006',
  },
  {
    name: 'Béjaïa Falcons',
    platform: Platform.PC,
    description: 'Rapides comme les faucons de la côte kabyle.',
    budget: 1400000,
    prestige_level: 2,
    ea_club_id: 'ea-club-007',
  },
  {
    name: 'Batna Storm',
    platform: Platform.CROSSPLAY,
    description: 'La tempête venue des Aurès, imprévisible et redoutable.',
    budget: 1300000,
    prestige_level: 2,
    ea_club_id: 'ea-club-008',
  },
  {
    name: 'Blida Panthers',
    platform: Platform.PS5,
    description: 'Les panthères de la Mitidja, agiles et précises.',
    budget: 1900000,
    prestige_level: 4,
    ea_club_id: 'ea-club-009',
  },
  {
    name: 'Tizi-Ouzou FC',
    platform: Platform.XBOX,
    description: 'Club kabyle au grand coeur et au grand palmarès.',
    budget: 2200000,
    prestige_level: 4,
    ea_club_id: 'ea-club-010',
  },
];

const managers = [
  {
    email: 'manager.algiers@omjep.test',
    ea_persona_name: 'AlgiersEaglesBoss',
    gamertag_psn: 'AlgiersEgles_PSN',
    nationality: 'DZ',
    preferred_position: Position.MDC,
    level: 15,
    xp: 14500,
    omjepCoins: 5000,
  },
  {
    email: 'manager.oran@omjep.test',
    ea_persona_name: 'OranThunderBoss',
    gamertag_psn: 'OranThunder_PSN',
    nationality: 'DZ',
    preferred_position: Position.ATT,
    level: 10,
    xp: 9800,
    omjepCoins: 3500,
  },
  {
    email: 'manager.constantine@omjep.test',
    ea_persona_name: 'ConstantineUnitedBoss',
    gamertag_xbox: 'CstUnited_XBX',
    nationality: 'DZ',
    preferred_position: Position.DC,
    level: 12,
    xp: 11200,
    omjepCoins: 4000,
  },
  {
    email: 'manager.annaba@omjep.test',
    ea_persona_name: 'AnnabaSharksBoss',
    gamertag_psn: 'AnnabaSharks_PSN',
    nationality: 'DZ',
    preferred_position: Position.GK,
    level: 8,
    xp: 7300,
    omjepCoins: 2800,
  },
  {
    email: 'manager.setif@omjep.test',
    ea_persona_name: 'SetifWolvesBoss',
    gamertag_psn: 'SetifWolves_PSN',
    nationality: 'DZ',
    preferred_position: Position.MOC,
    level: 9,
    xp: 8600,
    omjepCoins: 3200,
  },
  {
    email: 'manager.tlemcen@omjep.test',
    ea_persona_name: 'TlemcenLionsBoss',
    gamertag_psn: 'TlemcenLions_PSN',
    nationality: 'DZ',
    preferred_position: Position.LAT,
    level: 11,
    xp: 10400,
    omjepCoins: 3800,
  },
  {
    email: 'manager.bejaia@omjep.test',
    ea_persona_name: 'BejaiaFalconsBoss',
    nationality: 'DZ',
    preferred_position: Position.RAT,
    level: 7,
    xp: 6100,
    omjepCoins: 2500,
  },
  {
    email: 'manager.batna@omjep.test',
    ea_persona_name: 'BatnaStormBoss',
    gamertag_psn: 'BatnaStorm_PSN',
    nationality: 'DZ',
    preferred_position: Position.MD,
    level: 6,
    xp: 5200,
    omjepCoins: 2200,
  },
  {
    email: 'manager.blida@omjep.test',
    ea_persona_name: 'BlidaPanthersBoss',
    gamertag_psn: 'BlidaPanthers_PSN',
    nationality: 'DZ',
    preferred_position: Position.MG,
    level: 13,
    xp: 12500,
    omjepCoins: 4500,
  },
  {
    email: 'manager.tiziouzou@omjep.test',
    ea_persona_name: 'TiziOuzouFCBoss',
    gamertag_xbox: 'TiziOuzouFC_XBX',
    nationality: 'DZ',
    preferred_position: Position.BU,
    level: 14,
    xp: 13800,
    omjepCoins: 4800,
  },
];

async function main() {
  console.log('🌱 Début du seeding...\n');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // ─── 1. Admin account ──────────────────────────────────────────────
  console.log('👤 Création du compte admin...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@omjep.test' },
    update: {},
    create: {
      email: 'admin@omjep.test',
      password_hash: passwordHash,
      role: UserRole.ADMIN,
      ea_persona_name: 'OmjepAdmin',
      nationality: 'DZ',
      level: 99,
      xp: 999999,
      omjepCoins: 100000,
      stats: { create: {} },
    },
  });
  console.log(`   ✅ Admin créé : ${admin.email}`);

  // ─── 2. Manager accounts + clubs ──────────────────────────────────
  console.log('\n👥 Création des managers et clubs...\n');

  for (let i = 0; i < 10; i++) {
    const managerData = managers[i];
    const clubData = clubs[i];

    // Create manager user
    const manager = await prisma.user.upsert({
      where: { email: managerData.email },
      update: {},
      create: {
        email: managerData.email,
        password_hash: passwordHash,
        role: UserRole.MANAGER,
        ea_persona_name: managerData.ea_persona_name,
        gamertag_psn: managerData.gamertag_psn ?? null,
        gamertag_xbox: managerData.gamertag_xbox ?? null,
        nationality: managerData.nationality,
        preferred_position: managerData.preferred_position,
        level: managerData.level,
        xp: managerData.xp,
        omjepCoins: managerData.omjepCoins,
        stats: { create: {} },
      },
    });

    // Create club (APPROVED, linked to manager)
    const club = await prisma.club.upsert({
      where: { name: clubData.name },
      update: {},
      create: {
        name: clubData.name,
        platform: clubData.platform,
        description: clubData.description,
        budget: clubData.budget,
        prestige_level: clubData.prestige_level,
        ea_club_id: clubData.ea_club_id,
        validation_status: ValidationStatus.APPROVED,
        manager_id: manager.id,
      },
    });

    // Create TeamMember (FOUNDER role)
    await prisma.teamMember.upsert({
      where: {
        user_id_team_id: {
          user_id: manager.id,
          team_id: club.id,
        },
      },
      update: {},
      create: {
        user_id: manager.id,
        team_id: club.id,
        club_role: ClubRole.FOUNDER,
      },
    });

    console.log(`   ✅ [${i + 1}/10] ${club.name}`);
    console.log(`         Manager : ${manager.email}`);
    console.log(`         Budget  : ${club.budget.toLocaleString('fr-FR')} €`);
    console.log(`         Plateforme : ${club.platform}\n`);
  }

  // ─── Summary ───────────────────────────────────────────────────────
  console.log('─'.repeat(55));
  console.log('✅ Seeding terminé avec succès !');
  console.log('─'.repeat(55));
  console.log('\n📋 Comptes de test (mot de passe : Test1234!) :\n');
  console.log('  ADMIN :');
  console.log('    admin@omjep.test');
  console.log('\n  MANAGERS (10 comptes) :');
  managers.forEach((m) => console.log(`    ${m.email}`));
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
