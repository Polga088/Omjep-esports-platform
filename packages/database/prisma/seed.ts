import { PrismaClient, UserRole, ClubRole, Platform, ValidationStatus, Position } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Test1234!';
const ADMIN_EMAIL = (process.env.OMJEP_ADMIN_EMAIL ?? 'admin@omjep.test').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.OMJEP_ADMIN_PASSWORD ?? DEFAULT_PASSWORD;

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

  const managerPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

  // ─── 1. Admin account ──────────────────────────────────────────────
  console.log('👤 Création du compte admin...');
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      password_hash: adminPasswordHash,
      role: UserRole.ADMIN,
      ea_persona_name: 'OmjepAdmin',
      nationality: 'DZ',
      level: 99,
      xp: 999999,
      omjepCoins: 100000,
    },
    create: {
      email: ADMIN_EMAIL,
      password_hash: adminPasswordHash,
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
      create: {
        email: managerData.email,
        password_hash: managerPasswordHash,
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
      update: {
        password_hash: managerPasswordHash,
        role: UserRole.MANAGER,
        ea_persona_name: managerData.ea_persona_name,
        gamertag_psn: managerData.gamertag_psn ?? null,
        gamertag_xbox: managerData.gamertag_xbox ?? null,
        nationality: managerData.nationality,
        preferred_position: managerData.preferred_position,
        level: managerData.level,
        xp: managerData.xp,
        omjepCoins: managerData.omjepCoins,
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

  // ─── Email templates (admin-managed) ───────────────────────────────────────
  const emailTemplates = [
    {
      key: 'club_invitation',
      name: 'Invitation club',
      subject: 'Invitation OMJEP — {{clubName}}',
      preheader: '{{inviterName}} vous invite à rejoindre {{clubName}} sur OMJEP',
      enabled: true,
      htmlContent: `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>OMJEP</title>
  </head>
  <body style="margin:0;padding:0;background:#050912;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="padding:28px 14px;">
      <div style="max-width:620px;margin:0 auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div style="font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#d4af37;">OMJEP</div>
          <div style="font-size:12px;color:#94a3b8;">noreply@omjep.ma</div>
        </div>

        <div style="border:1px solid rgba(148,163,184,.18);border-radius:16px;background:linear-gradient(180deg, rgba(124,58,237,.08), rgba(212,175,55,.04));padding:22px;">
          <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#94a3b8;font-weight:800;">Invitation club</div>
          <h1 style="margin:10px 0 0 0;font-size:22px;line-height:1.2;color:#f8fafc;">{{clubName}}</h1>
          <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#cbd5e1;">
            {{inviterName}} vous invite à rejoindre son club sur OMJEP.
          </p>
          <div style="margin-top:18px;">
            <a href="{{actionUrl}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:800;padding:12px 16px;border-radius:12px;">
              Rejoindre le club
            </a>
          </div>
          <p style="margin:14px 0 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
            Si le bouton ne fonctionne pas, copiez-collez ce lien :<br />
            <span style="color:#d4af37;">{{actionUrl}}</span>
          </p>
        </div>

        <div style="margin-top:14px;color:#64748b;font-size:11px;line-height:1.6;text-align:center;">
          OMJEP — Organisation Marocaine des Jeux Électroniques Professionnels
        </div>
      </div>
    </div>
  </body>
</html>`.trim(),
      textContent:
        `OMJEP — Invitation club\n\n{{inviterName}} vous invite à rejoindre {{clubName}}.\n\nLien : {{actionUrl}}\n\nOMJEP — Organisation Marocaine des Jeux Électroniques Professionnels`,
    },
    {
      key: 'support_ticket_created',
      name: 'Support — ticket créé',
      subject: 'Support OMJEP — Ticket #{{ticketId}} reçu',
      preheader: 'Nous avons bien reçu votre demande',
      enabled: true,
      htmlContent:
        `
<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
  <body style="margin:0;padding:0;background:#050912;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="padding:28px 14px;">
      <div style="max-width:620px;margin:0 auto;">
        <div style="font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#d4af37;margin-bottom:14px;">OMJEP</div>
        <div style="border:1px solid rgba(148,163,184,.18);border-radius:16px;background:#0b1220;padding:22px;">
          <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#94a3b8;font-weight:800;">Support</div>
          <h1 style="margin:10px 0 0 0;font-size:20px;color:#f8fafc;">Ticket #{{ticketId}} reçu</h1>
          <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#cbd5e1;">
            Bonjour {{displayName}}, nous avons bien reçu votre demande. Notre équipe reviendra vers vous rapidement.
          </p>
          <div style="margin-top:14px;padding:14px;border-radius:12px;background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.22);">
            <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.12em;font-weight:800;">Résumé</div>
            <div style="margin-top:6px;color:#e2e8f0;font-size:14px;">{{subject}}</div>
          </div>
        </div>
        <div style="margin-top:14px;color:#64748b;font-size:11px;line-height:1.6;text-align:center;">
          OMJEP — Organisation Marocaine des Jeux Électroniques Professionnels
        </div>
      </div>
    </div>
  </body>
</html>`.trim(),
      textContent:
        `OMJEP — Support\n\nTicket #{{ticketId}} reçu.\nBonjour {{displayName}}, nous avons bien reçu votre demande.\n\nSujet : {{subject}}\n\nOMJEP — Organisation Marocaine des Jeux Électroniques Professionnels`,
    },
    {
      key: 'support_ticket_reply',
      name: 'Support — réponse',
      subject: 'Support OMJEP — Réponse au ticket #{{ticketId}}',
      preheader: 'Une nouvelle réponse est disponible',
      enabled: true,
      htmlContent:
        `
<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
  <body style="margin:0;padding:0;background:#050912;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="padding:28px 14px;">
      <div style="max-width:620px;margin:0 auto;">
        <div style="font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#d4af37;margin-bottom:14px;">OMJEP</div>
        <div style="border:1px solid rgba(148,163,184,.18);border-radius:16px;background:#0b1220;padding:22px;">
          <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#94a3b8;font-weight:800;">Support</div>
          <h1 style="margin:10px 0 0 0;font-size:20px;color:#f8fafc;">Réponse au ticket #{{ticketId}}</h1>
          <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#cbd5e1;">
            {{message}}
          </p>
        </div>
        <div style="margin-top:14px;color:#64748b;font-size:11px;line-height:1.6;text-align:center;">
          OMJEP — Organisation Marocaine des Jeux Électroniques Professionnels
        </div>
      </div>
    </div>
  </body>
</html>`.trim(),
      textContent:
        `OMJEP — Support\n\nRéponse au ticket #{{ticketId}}\n\n{{message}}\n\nOMJEP — Organisation Marocaine des Jeux Électroniques Professionnels`,
    },
    {
      key: 'match_scheduled',
      name: 'Match — programmé',
      subject: 'Match programmé — {{homeTeam}} vs {{awayTeam}}',
      preheader: 'Votre rencontre est planifiée',
      enabled: true,
      htmlContent:
        `
<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
  <body style="margin:0;padding:0;background:#050912;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="padding:28px 14px;">
      <div style="max-width:620px;margin:0 auto;">
        <div style="font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#d4af37;margin-bottom:14px;">OMJEP</div>
        <div style="border:1px solid rgba(148,163,184,.18);border-radius:16px;background:#0b1220;padding:22px;">
          <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#94a3b8;font-weight:800;">Match</div>
          <h1 style="margin:10px 0 0 0;font-size:20px;color:#f8fafc;">{{homeTeam}} <span style=\"color:#d4af37;\">vs</span> {{awayTeam}}</h1>
          <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#cbd5e1;">
            Date : <strong style=\"color:#f8fafc;\">{{scheduledAt}}</strong><br/>
            Compétition : <strong style=\"color:#f8fafc;\">{{competitionName}}</strong>
          </p>
        </div>
        <div style="margin-top:14px;color:#64748b;font-size:11px;line-height:1.6;text-align:center;">
          OMJEP — Organisation Marocaine des Jeux Électroniques Professionnels
        </div>
      </div>
    </div>
  </body>
</html>`.trim(),
      textContent:
        `OMJEP — Match programmé\n\n{{homeTeam}} vs {{awayTeam}}\nDate : {{scheduledAt}}\nCompétition : {{competitionName}}\n\nOMJEP — Organisation Marocaine des Jeux Électroniques Professionnels`,
    },
    {
      key: 'match_result_validated',
      name: 'Match — résultat validé',
      subject: 'Résultat validé — {{homeTeam}} {{homeScore}}–{{awayScore}} {{awayTeam}}',
      preheader: 'Le résultat a été validé',
      enabled: true,
      htmlContent:
        `
<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
  <body style="margin:0;padding:0;background:#050912;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="padding:28px 14px;">
      <div style="max-width:620px;margin:0 auto;">
        <div style="font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#d4af37;margin-bottom:14px;">OMJEP</div>
        <div style="border:1px solid rgba(148,163,184,.18);border-radius:16px;background:#0b1220;padding:22px;">
          <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#94a3b8;font-weight:800;">Résultat</div>
          <h1 style="margin:10px 0 0 0;font-size:20px;color:#f8fafc;">{{homeTeam}} <span style=\"color:#d4af37;\">{{homeScore}}–{{awayScore}}</span> {{awayTeam}}</h1>
          <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#cbd5e1;">
            Statut : <strong style=\"color:#f8fafc;\">Validé</strong><br/>
            Compétition : <strong style=\"color:#f8fafc;\">{{competitionName}}</strong>
          </p>
        </div>
        <div style="margin-top:14px;color:#64748b;font-size:11px;line-height:1.6;text-align:center;">
          OMJEP — Organisation Marocaine des Jeux Électroniques Professionnels
        </div>
      </div>
    </div>
  </body>
</html>`.trim(),
      textContent:
        `OMJEP — Résultat validé\n\n{{homeTeam}} {{homeScore}}-{{awayScore}} {{awayTeam}}\nCompétition : {{competitionName}}\n\nOMJEP — Organisation Marocaine des Jeux Électroniques Professionnels`,
    },
  ] as const;

  for (const t of emailTemplates) {
    await prisma.emailTemplate.upsert({
      where: { key: t.key },
      update: {
        name: t.name,
        subject: t.subject,
        preheader: t.preheader ?? null,
        htmlContent: t.htmlContent,
        textContent: t.textContent ?? null,
        enabled: t.enabled,
      },
      create: {
        key: t.key,
        name: t.name,
        subject: t.subject,
        preheader: t.preheader ?? null,
        htmlContent: t.htmlContent,
        textContent: t.textContent ?? null,
        enabled: t.enabled,
      },
    });
  }
  console.log(`📧 Templates email : ${emailTemplates.length} upsert`);

  // ─── Summary ───────────────────────────────────────────────────────
  console.log('─'.repeat(55));
  console.log('✅ Seeding terminé avec succès !');
  console.log('─'.repeat(55));
  console.log('\n📋 Comptes de test :\n');
  console.log('  ADMIN :');
  console.log(`    ${ADMIN_EMAIL}`);
  console.log(`    mot de passe: ${ADMIN_PASSWORD}`);
  console.log('\n  MANAGERS (10 comptes) :');
  console.log(`    mot de passe: ${DEFAULT_PASSWORD}`);
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
