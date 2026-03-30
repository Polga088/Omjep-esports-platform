import { UserPlus, Star, Gamepad2, Shield, Swords } from 'lucide-react';

type PlayerRole = 'Manager' | 'Joueur';
type Position = 'BU' | 'MOC' | 'MDC' | 'DC' | 'GB' | 'MOD' | 'MG' | 'MD';

interface Player {
  id: string;
  pseudo: string;
  position: Position;
  role: PlayerRole;
  matchesPlayed: number;
  averageRating: number;
  country: string;
}

const MOCK_PLAYERS: Player[] = [
  {
    id: '1',
    pseudo: 'xX_EagleSniper_Xx',
    position: 'BU',
    role: 'Manager',
    matchesPlayed: 42,
    averageRating: 8.4,
    country: 'MA',
  },
  {
    id: '2',
    pseudo: 'ShadowPlaymaker',
    position: 'MOC',
    role: 'Joueur',
    matchesPlayed: 38,
    averageRating: 7.9,
    country: 'DZ',
  },
  {
    id: '3',
    pseudo: 'IronWall_FC',
    position: 'DC',
    role: 'Joueur',
    matchesPlayed: 35,
    averageRating: 7.2,
    country: 'TN',
  },
];

const positionColors: Record<Position, string> = {
  BU:  'bg-orange-500/15 text-orange-400 border-orange-500/30',
  MOC: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  MDC: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  DC:  'bg-sky-500/15 text-sky-400 border-sky-500/30',
  GB:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  MOD: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  MG:  'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  MD:  'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
};

const roleConfig: Record<PlayerRole, { label: string; className: string; icon: React.ElementType }> = {
  Manager: {
    label: 'Manager',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: Shield,
  },
  Joueur: {
    label: 'Joueur',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: Swords,
  },
};

function RatingBar({ value }: { value: number }) {
  const percentage = (value / 10) * 100;
  const color =
    value >= 8 ? 'from-emerald-500 to-emerald-400' :
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
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export default function MyTeam() {
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
            Effectif du Club
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {MOCK_PLAYERS.length} membres enregistrés dans le système
          </p>
        </div>

        <button className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#00D4FF] to-[#0099BB] text-[#0A0E1A] shadow-lg shadow-[#00D4FF]/20 hover:shadow-[#00D4FF]/40 hover:brightness-110 active:scale-95 transition-all duration-200 whitespace-nowrap">
          <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Recruter un joueur
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total joueurs', value: MOCK_PLAYERS.filter(p => p.role === 'Joueur').length, accent: 'text-blue-400' },
          { label: 'Managers', value: MOCK_PLAYERS.filter(p => p.role === 'Manager').length, accent: 'text-emerald-400' },
          { label: 'Note moy. équipe', value: (MOCK_PLAYERS.reduce((s, p) => s + p.averageRating, 0) / MOCK_PLAYERS.length).toFixed(1), accent: 'text-[#00D4FF]' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-xl bg-[#0D1221] border border-white/5 p-4 flex flex-col items-center">
            <span className={`text-2xl font-black tabular-nums ${accent}`}>{value}</span>
            <span className="mt-0.5 text-xs text-slate-500 text-center">{label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#00D4FF]" />
            <h2 className="text-sm font-semibold text-white">Roster actuel</h2>
          </div>
          <span className="text-xs text-slate-600 bg-white/5 px-2.5 py-1 rounded-full">
            Saison 2025
          </span>
        </div>

        {/* Desktop table */}
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
              {MOCK_PLAYERS.map((player) => {
                const role = roleConfig[player.role];
                const RoleIcon = role.icon;
                return (
                  <tr
                    key={player.id}
                    className="group hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer"
                  >
                    {/* Player */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-[#FF6B35]/10 border border-white/10 flex items-center justify-center text-sm font-bold text-[#00D4FF] uppercase shrink-0 group-hover:border-[#00D4FF]/30 transition-colors">
                          {player.pseudo.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white group-hover:text-[#00D4FF] transition-colors">
                            {player.pseudo}
                          </p>
                          <p className="text-xs text-slate-600">{player.country}</p>
                        </div>
                      </div>
                    </td>

                    {/* Position */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border tracking-wide ${positionColors[player.position]}`}>
                        {player.position}
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
                        {player.matchesPlayed}
                      </span>
                      <span className="text-xs text-slate-600 ml-1">matchs</span>
                    </td>

                    {/* Rating */}
                    <td className="px-6 py-4 min-w-[160px]">
                      <RatingBar value={player.averageRating} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-600">{MOCK_PLAYERS.length} joueurs au total</span>
          <span className="text-xs text-slate-700">Données mock — v0.1</span>
        </div>
      </div>
    </div>
  );
}
