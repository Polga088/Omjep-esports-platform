import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react';
import { Link } from 'react-router-dom';
import {
  Crown, Trophy, Swords, Users, Shield, Scale, Loader2, ArrowRight,
  AlertTriangle, ShoppingBag,
} from 'lucide-react';
import api from '@/lib/api';

interface ScoreReport {
  reporting_team_id: string;
  home_score: number;
  away_score: number;
}

interface ModMatch {
  id: string;
  status: string;
  home_team_id: string;
  away_team_id: string;
  scoreReports: ScoreReport[];
}

function modMatchReadyToValidate(m: ModMatch): boolean {
  if (m.status !== 'SCHEDULED') return false;
  const home = m.scoreReports.find((r) => r.reporting_team_id === m.home_team_id);
  const away = m.scoreReports.find((r) => r.reporting_team_id === m.away_team_id);
  if (!home || !away) return false;
  return home.home_score === away.home_score && home.away_score === away.away_score;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [competitionsCount, setCompetitionsCount] = useState(0);
  const [matchesScheduled, setMatchesScheduled] = useState(0);
  const [matchesDisputed, setMatchesDisputed] = useState(0);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersByRole, setUsersByRole] = useState<Record<string, number>>({});
  const [clubsCount, setClubsCount] = useState(0);
  const [scoresReady, setScoresReady] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [compsRes, matchesRes, usersRes, teamsRes, modMatchesRes] = await Promise.allSettled([
          api.get('/admin/competitions'),
          api.get('/admin/matches'),
          api.get('/users'),
          api.get('/teams'),
          api.get('/moderator/league/matches'),
        ]);

        if (cancelled) return;

        if (compsRes.status === 'fulfilled') {
          const d = compsRes.value.data?.data ?? compsRes.value.data;
          setCompetitionsCount(Array.isArray(d) ? d.length : 0);
        }

        if (matchesRes.status === 'fulfilled') {
          const d = matchesRes.value.data?.data ?? matchesRes.value.data;
          const list = Array.isArray(d) ? d : [];
          // Ne compter que les matchs liés à une compétition existante (cohérent avec GET /admin/matches).
          const withCompetition = list.filter(
            (x: { status: string; competition?: { id: string } | null }) =>
              x.competition != null && x.competition.id != null,
          );
          setMatchesScheduled(
            withCompetition.filter((x: { status: string }) => x.status === 'SCHEDULED' || x.status === 'LIVE').length,
          );
          setMatchesDisputed(withCompetition.filter((x: { status: string }) => x.status === 'DISPUTED').length);
        }

        if (usersRes.status === 'fulfilled') {
          const d = usersRes.value.data?.data ?? usersRes.value.data;
          const list = Array.isArray(d) ? d : [];
          setUsersTotal(list.length);
          const by: Record<string, number> = {};
          for (const u of list as { role?: string }[]) {
            const r = u.role ?? 'PLAYER';
            by[r] = (by[r] ?? 0) + 1;
          }
          setUsersByRole(by);
        }

        if (teamsRes.status === 'fulfilled') {
          const d = teamsRes.value.data?.data ?? teamsRes.value.data;
          setClubsCount(Array.isArray(d) ? d.length : 0);
        }

        if (modMatchesRes.status === 'fulfilled') {
          const d = modMatchesRes.value.data?.data ?? modMatchesRes.value.data;
          const list = Array.isArray(d) ? (d as ModMatch[]) : [];
          setScoresReady(list.filter(modMatchReadyToValidate).length);
        } else {
          setScoresReady(0);
        }

        const failed = [compsRes, matchesRes, usersRes, teamsRes].filter((r) => r.status === 'rejected');
        if (failed.length > 0) {
          setError('Certaines métriques n’ont pas pu être chargées (droits ou réseau).');
        }
      } catch {
        if (!cancelled) setError('Chargement du tableau de bord impossible.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const roleSummary = useMemo(() => {
    const parts = ['ADMIN', 'MODERATOR', 'MANAGER', 'PLAYER'].map(
      (r) => `${r}: ${usersByRole[r] ?? 0}`,
    );
    return parts.join(' · ');
  }, [usersByRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center border border-amber-400/20">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          Tableau de bord — Super Admin
        </h1>
        <p className="text-sm text-slate-500 mt-2 ml-[52px] max-w-2xl">
          Vue d’ensemble OMJEP : compétitions, matchs, comptes et validation ligue. Les actions
          sensibles restent réservées au rôle ADMIN ; l’espace commissaire est partagé avec les
          MODERATOR.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          icon={Trophy}
          label="Compétitions"
          value={competitionsCount}
          to="/admin/competitions"
          hint="Ligues & coupes"
        />
        <StatCard
          icon={Swords}
          label="Matchs à jouer"
          value={matchesScheduled}
          to="/admin/matches"
          hint="Saisie résultats admin"
        />
        <StatCard
          icon={Scale}
          label="Scores prêts (double déclaration)"
          value={scoresReady}
          to="/moderator/matches"
          hint="Validation commissaire"
          accent="cyan"
        />
        <StatCard
          icon={AlertTriangle}
          label="Matchs en litige"
          value={matchesDisputed}
          to="/admin/matches"
          hint="À traiter côté matchs"
          accent="orange"
        />
        <StatCard
          icon={Users}
          label="Utilisateurs"
          value={usersTotal}
          to="/admin/users"
          hint={roleSummary}
        />
        <StatCard
          icon={Shield}
          label="Clubs"
          value={clubsCount}
          to="/admin/clubs"
          hint="Rosters & équipes"
        />
      </div>

      <div className="rounded-2xl border border-amber-400/10 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-amber-400/90 mb-3">Raccourcis</h2>
        <div className="flex flex-wrap gap-2">
          <QuickLink to="/admin/competitions" label="Gérer les compétitions" />
          <QuickLink to="/admin/matches" label="Gérer les matchs" />
          <QuickLink to="/admin/users" label="Comptes & rôles" />
          <QuickLink to="/admin/clubs" label="Clubs" />
          <QuickLink to="/admin/store" label="Gestion boutique (Jepy / VIP)" icon={ShoppingBag} />
          <QuickLink to="/moderator/matches" label="Espace commissaire — scores" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  to,
  hint,
  accent = 'amber',
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  to: string;
  hint: string;
  accent?: 'amber' | 'cyan' | 'orange';
}) {
  const ring =
    accent === 'cyan'
      ? 'border-cyan-400/15 hover:border-cyan-400/35'
      : accent === 'orange'
        ? 'border-orange-400/15 hover:border-orange-400/35'
        : 'border-amber-400/15 hover:border-amber-400/35';
  const iconBg =
    accent === 'cyan'
      ? 'from-cyan-400/20 to-teal-600/10 text-cyan-400'
      : accent === 'orange'
        ? 'from-orange-400/20 to-orange-600/10 text-orange-400'
        : 'from-amber-400/20 to-amber-600/10 text-amber-400';

  return (
    <Link
      to={to}
      className={`group flex flex-col gap-3 p-5 rounded-2xl border bg-white/[0.02] transition-all ${ring} hover:bg-white/[0.04]`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center border border-white/[0.06]`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400/80 transition-colors shrink-0 mt-1" />
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-3xl font-black text-white tabular-nums mt-1">{value}</p>
        <p className="text-[11px] text-slate-600 mt-2 leading-snug line-clamp-2">{hint}</p>
      </div>
    </Link>
  );
}

function QuickLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-white/[0.08] text-slate-400 hover:text-amber-300 hover:border-amber-400/25 hover:bg-amber-400/5 transition-colors"
    >
      {Icon ? <Icon className="w-3.5 h-3.5 opacity-70 shrink-0" /> : null}
      {label}
      <ArrowRight className="w-3 h-3 opacity-50" />
    </Link>
  );
}
