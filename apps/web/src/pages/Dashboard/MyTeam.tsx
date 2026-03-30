import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Star, Gamepad2, Shield, Swords, Crown, Users } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import InvitePlayerModal from '@/components/InvitePlayerModal';

// ─── Types (miroir du payload Prisma) ────────────────────────────────────────

type ClubRole = 'FOUNDER' | 'MANAGER' | 'CO_MANAGER' | 'PLAYER';
type Position = 'GK' | 'DC' | 'LAT' | 'RAT' | 'MDC' | 'MOC' | 'MG' | 'MD' | 'BU' | 'ATT';

interface PlayerStats {
  matches_played: number;
  goals: number;
  assists: number;
  clean_sheets: number;
  motm: number;
  average_rating: number;
}

interface TeamMemberUser {
  id: string;
  ea_persona_name: string | null;
  preferred_position: Position | null;
  nationality: string | null;
  stats: PlayerStats | null;
}

interface TeamMember {
  user_id: string;
  club_role: ClubRole;
  joined_at: string;
  user: TeamMemberUser;
}

interface MyTeamData {
  id: string;
  name: string;
  logo_url: string | null;
  members: TeamMember[];
}

// ─── Config visuels ──────────────────────────────────────────────────────────

const positionColors: Record<Position, string> = {
  GK:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  DC:  'bg-sky-500/15 text-sky-400 border-sky-500/30',
  LAT: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  RAT: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  MDC: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  MOC: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  MG:  'bg-teal-500/15 text-teal-400 border-teal-500/30',
  MD:  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  BU:  'bg-orange-500/15 text-orange-400 border-orange-500/30',
  ATT: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const positionLabel: Record<Position, string> = {
  GK: 'GB', DC: 'DC', LAT: 'LAT', RAT: 'RAT',
  MDC: 'MDC', MOC: 'MOC', MG: 'MG', MD: 'MD', BU: 'BU', ATT: 'ATT',
};

const roleConfig: Record<ClubRole, { label: string; className: string; icon: React.ElementType }> = {
  FOUNDER:    { label: 'Fondateur',   className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   icon: Crown },
  MANAGER:    { label: 'Manager',     className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Shield },
  CO_MANAGER: { label: 'Co-Manager',  className: 'bg-teal-500/15 text-teal-400 border-teal-500/30',       icon: Users },
  PLAYER:     { label: 'Joueur',      className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',       icon: Swords },
};

// ─── Composants utilitaires ──────────────────────────────────────────────────

function RatingBar({ value }: { value: number }) {
  const percentage = (value / 10) * 100;
  const color =
    value >= 8   ? 'from-emerald-500 to-emerald-400' :
    value >= 6.5 ? 'from-blue-500 to-blue-400' :
                   'from-amber-500 to-amber-400';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-sm font-bold tabular-nums w-8 text-right ${
        value >= 8 ? 'text-emerald-400' : value >= 6.5 ? 'text-blue-400' : 'text-amber-400'
      }`}>
        {value > 0 ? value.toFixed(1) : 'N/A'}
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/5">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 rounded-md bg-white/5 animate-pulse" style={{ width: i === 0 ? '60%' : '40%' }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function MyTeam() {
  const [team, setTeam] = useState<MyTeamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    api.get<MyTeamData>('/teams/my-team')
      .then(({ data }) => {
        if (!cancelled) setTeam(data);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg: string =
            err?.response?.data?.message ??
            "Impossible de charger les données de l'équipe.";
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const players = team?.members.filter((m) => m.club_role === 'PLAYER') ?? [];
  const staff   = team?.members.filter((m) => m.club_role !== 'PLAYER') ?? [];
  const allMembers = team?.members ?? [];

  const currentMember = team?.members.find((m) => m.user_id === user?.id);
  const canRecruit = currentMember &&
    ['FOUNDER', 'MANAGER', 'CO_MANAGER'].includes(currentMember.club_role);

  const avgRating =
    allMembers.length > 0
      ? allMembers.reduce((sum, m) => sum + (m.user.stats?.average_rating ?? 0), 0) / allMembers.length
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF]/20 to-[#00D4FF]/5 border border-[#00D4FF]/20 flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-[#00D4FF]" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#00D4FF]/70">Gestion du Club</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {isLoading ? (
              <span className="inline-block w-48 h-8 rounded-lg bg-white/5 animate-pulse" />
            ) : (
              team?.name ?? 'Effectif du Club'
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isLoading ? '\u00a0' : `${allMembers.length} membres enregistrés dans le système`}
          </p>
        </div>

        {canRecruit && (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#00D4FF] to-[#0099BB] text-[#0A0E1A] shadow-lg shadow-[#00D4FF]/20 hover:shadow-[#00D4FF]/40 hover:brightness-110 active:scale-95 transition-all duration-200 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Recruter un joueur
          </button>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total joueurs', value: isLoading ? '—' : players.length, accent: 'text-blue-400' },
          { label: 'Staff / Managers', value: isLoading ? '—' : staff.length, accent: 'text-emerald-400' },
          { label: 'Note moy. équipe', value: isLoading ? '—' : avgRating > 0 ? avgRating.toFixed(1) : 'N/A', accent: 'text-[#00D4FF]' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-xl bg-[#0D1221] border border-white/5 p-4 flex flex-col items-center">
            <span className={`text-2xl font-black tabular-nums ${accent}`}>{value}</span>
            <span className="mt-0.5 text-xs text-slate-500 text-center">{label}</span>
          </div>
        ))}
      </div>

      {/* Erreur */}
      {error && !isLoading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#00D4FF]" />
            <h2 className="text-sm font-semibold text-white">Roster actuel</h2>
          </div>
          <span className="text-xs text-slate-600 bg-white/5 px-2.5 py-1 rounded-full">
            Saison 2025
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Joueur (Pseudo EA)', 'Poste', 'Rôle', 'Matchs joués', 'Note Moy. (AMR)'].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-600"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                [...Array(3)].map((_, i) => <SkeletonRow key={i} />)
              ) : allMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-600">
                    Aucun membre dans cette équipe.
                  </td>
                </tr>
              ) : (
                allMembers.map((member) => {
                  const { user, club_role } = member;
                  const role = roleConfig[club_role];
                  const RoleIcon = role.icon;
                  const position = user.preferred_position;
                  const posColor = position ? positionColors[position] : 'bg-slate-500/15 text-slate-400 border-slate-500/30';
                  const posLabel = position ? positionLabel[position] : '—';
                  const matchesPlayed = user.stats?.matches_played ?? 0;
                  const avgRatingPlayer = user.stats?.average_rating ?? 0;
                  const pseudo = user.ea_persona_name ?? `Joueur #${user.id.slice(0, 6)}`;

                  return (
                    <tr
                      key={user.id}
                      className="group hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer"
                    >
                      {/* Player */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-[#FF6B35]/10 border border-white/10 flex items-center justify-center text-sm font-bold text-[#00D4FF] uppercase shrink-0 group-hover:border-[#00D4FF]/30 transition-colors">
                            {pseudo.charAt(0)}
                          </div>
                          <div>
                            <Link
                              to={`/dashboard/profile/${user.id}`}
                              className="text-sm font-semibold text-white group-hover:text-[#00D4FF] transition-colors hover:underline decoration-[#00D4FF]/40 underline-offset-2"
                            >
                              {pseudo}
                            </Link>
                            <p className="text-xs text-slate-600">{user.nationality ?? '—'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Position */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border tracking-wide ${posColor}`}>
                          {posLabel}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${role.className}`}>
                          <RoleIcon className="w-3 h-3" />
                          {role.label}
                        </span>
                      </td>

                      {/* Matches */}
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-white tabular-nums">
                          {matchesPlayed}
                        </span>
                        <span className="text-xs text-slate-600 ml-1">matchs</span>
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-4 min-w-[160px]">
                        <RatingBar value={avgRatingPlayer} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            {isLoading ? '…' : `${allMembers.length} membre${allMembers.length > 1 ? 's' : ''} au total`}
          </span>
          <span className="text-xs text-slate-700">Données live — v1.0</span>
        </div>
      </div>

      {/* Section Recrutement — visible uniquement pour Fondateur / Manager / Co-Manager */}
      {canRecruit && team && (
        <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#00D4FF]" />
            <h2 className="text-sm font-semibold text-white">Recrutement</h2>
          </div>
          <div className="px-6 py-6">
            <p className="text-sm text-slate-400 mb-4">
              En tant que <span className="text-white font-medium">{roleConfig[currentMember!.club_role].label}</span>, vous pouvez inviter de nouveaux joueurs à rejoindre <span className="text-[#00D4FF] font-medium">{team.name}</span>.
            </p>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#00D4FF] to-[#0099BB] text-[#0A0E1A] shadow-lg shadow-[#00D4FF]/20 hover:shadow-[#00D4FF]/40 hover:brightness-110 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Inviter un Joueur
            </button>
          </div>
        </div>
      )}

      {/* Modale d'invitation */}
      {team && (
        <InvitePlayerModal
          teamId={team.id}
          open={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
        />
      )}
    </div>
  );
}
