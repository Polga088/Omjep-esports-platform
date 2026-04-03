import { Trophy, Shield, Swords } from 'lucide-react';
import PlayerIdentity from '@/components/PlayerIdentity';

export interface MatchBrief {
  id: string;
  round: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  homeTeam: { id: string; name: string; logo_url: string | null };
  awayTeam: { id: string; name: string; logo_url: string | null };
}

interface BracketRound {
  name: string;
  matches: MatchBrief[];
}

interface Props {
  rounds: BracketRound[];
  myTeamId?: string | null;
  /** Admin : clic sur une carte pour ouvrir la saisie / correction de score. */
  onMatchClick?: (match: MatchBrief) => void;
}

function TeamLogo({ team }: { team: { name: string; logo_url: string | null } }) {
  return team.logo_url ? (
    <img
      src={team.logo_url}
      alt={team.name}
      className="w-6 h-6 rounded-md object-cover border border-white/10 shrink-0"
    />
  ) : (
    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-white/10 flex items-center justify-center text-[10px] font-bold text-amber-400 uppercase shrink-0">
      {team.name.charAt(0)}
    </div>
  );
}

/**
 * Carte bracket style terminal : score à gauche, logo (PlayerIdentity xs) centré, nom à droite — sans ombres.
 */
export function BracketMatchTerminal({
  match,
  myTeamId,
}: {
  match: MatchBrief;
  myTeamId?: string | null;
}) {
  const isPlayed = match.status === 'PLAYED';
  const homeWon = isPlayed && (match.home_score ?? 0) > (match.away_score ?? 0);
  const awayWon = isPlayed && (match.away_score ?? 0) > (match.home_score ?? 0);
  const isMyHome = match.homeTeam.id === myTeamId;
  const isMyAway = match.awayTeam.id === myTeamId;

  function line(
    team: MatchBrief['homeTeam'],
    score: number | null,
    won: boolean,
    isMy: boolean,
  ) {
    const label = (team.name || '?').slice(0, 1).toUpperCase();
    return (
      <div
        className={`flex items-center gap-2 px-2 py-1.5 font-mono text-[11px] ${
          won ? 'text-slate-200' : 'text-slate-500'
        }`}
      >
        <span className="w-6 shrink-0 text-right tabular-nums text-slate-500">
          {isPlayed && score != null ? score : '—'}
        </span>
        <div className="flex w-8 shrink-0 justify-center">
          <PlayerIdentity
            size="xs"
            initial={label}
            avatarUrl={team.logo_url}
            rarity="common"
            imgAlt={team.name}
            className="shrink-0"
          />
        </div>
        <span
          className={`min-w-0 flex-1 truncate text-left ${isMy ? 'text-slate-200' : 'text-slate-400'}`}
        >
          {team.name}
        </span>
      </div>
    );
  }

  return (
    <div className="min-w-[200px] overflow-hidden rounded border-[0.5px] border-white/10 bg-[#08090c]">
      <div className="divide-y divide-white/[0.06]">
        {line(match.homeTeam, match.home_score, homeWon, isMyHome)}
        {line(match.awayTeam, match.away_score, awayWon, isMyAway)}
      </div>
      {!isPlayed && (
        <div className="border-t border-white/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-slate-600">
          {match.status === 'LIVE'
            ? 'En direct'
            : match.status === 'DISPUTED'
              ? 'Litige'
              : 'À jouer'}
        </div>
      )}
    </div>
  );
}

export function MatchCard({
  match,
  myTeamId,
  onMatchClick,
}: {
  match: MatchBrief;
  myTeamId?: string | null;
  onMatchClick?: (match: MatchBrief) => void;
}) {
  const isPlayed = match.status === 'PLAYED';
  const homeWon = isPlayed && (match.home_score ?? 0) > (match.away_score ?? 0);
  const awayWon = isPlayed && (match.away_score ?? 0) > (match.home_score ?? 0);
  const isMyHome = match.homeTeam.id === myTeamId;
  const isMyAway = match.awayTeam.id === myTeamId;

  const inner = (
    <>
      {/* Home */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b border-white/[0.05] ${
        homeWon ? 'bg-emerald-500/[0.06]' : ''
      } ${isMyHome ? 'bg-indigo-500/[0.08]' : ''}`}>
        <TeamLogo team={match.homeTeam} />
        <span className={`text-xs font-semibold flex-1 truncate ${
          homeWon ? 'text-white' : 'text-slate-300'
        } ${isMyHome ? 'text-indigo-300' : ''}`}>
          {match.homeTeam.name}
        </span>
        {isPlayed && (
          <span className={`text-sm font-black tabular-nums w-5 text-right ${
            homeWon ? 'text-white' : 'text-slate-500'
          }`}>
            {match.home_score ?? 0}
          </span>
        )}
      </div>

      {/* Away */}
      <div className={`flex items-center gap-2 px-3 py-2 ${
        awayWon ? 'bg-emerald-500/[0.06]' : ''
      } ${isMyAway ? 'bg-indigo-500/[0.08]' : ''}`}>
        <TeamLogo team={match.awayTeam} />
        <span className={`text-xs font-semibold flex-1 truncate ${
          awayWon ? 'text-white' : 'text-slate-300'
        } ${isMyAway ? 'text-indigo-300' : ''}`}>
          {match.awayTeam.name}
        </span>
        {isPlayed && (
          <span className={`text-sm font-black tabular-nums w-5 text-right ${
            awayWon ? 'text-white' : 'text-slate-500'
          }`}>
            {match.away_score ?? 0}
          </span>
        )}
      </div>

      {/* Status badge */}
      {!isPlayed && (
        <div className="px-3 py-1 bg-white/[0.01] border-t border-white/[0.04]">
          <span className={`text-[9px] font-bold uppercase tracking-widest ${
            match.status === 'DISPUTED' ? 'text-orange-400' :
            match.status === 'LIVE' ? 'text-red-400' : 'text-slate-600'
          }`}>
            {match.status === 'SCHEDULED' ? 'À jouer' :
             match.status === 'LIVE' ? '⚡ En direct' :
             match.status === 'DISPUTED' ? '⚠ Litige' : match.status}
          </span>
        </div>
      )}
    </>
  );

  const shellClass = `rounded-xl border overflow-hidden min-w-[190px] text-left w-full ${
    isPlayed ? 'border-white/[0.08] bg-[#0d1221]' : 'border-white/[0.06] bg-white/[0.02]'
  } ${onMatchClick ? 'cursor-pointer hover:border-amber-400/25 hover:bg-white/[0.04] transition-colors' : ''}`;

  if (onMatchClick) {
    return (
      <button type="button" className={shellClass} onClick={() => onMatchClick(match)}>
        {inner}
      </button>
    );
  }

  return <div className={shellClass}>{inner}</div>;
}

export default function TournamentBrackets({ rounds, myTeamId, onMatchClick }: Props) {
  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
        <Swords className="w-8 h-8 text-slate-700 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Aucun match généré pour cette coupe.</p>
      </div>
    );
  }

  // Finale goes to the right → reverse array for display order (1st round left)
  const orderedRounds = [...rounds];

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/40" />
          Qualifié
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-indigo-500/30 border border-indigo-500/40" />
          Mon club
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
          À jouer
        </div>
      </div>

      {/* Bracket columns */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {orderedRounds.map((round) => (
            <div key={round.name} className="flex flex-col gap-3">
              {/* Round header */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                {round.name === 'Finale' ? (
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span className={`text-xs font-bold uppercase tracking-widest ${
                  round.name === 'Finale' ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  {round.name}
                </span>
                <span className="ml-1 text-[10px] text-slate-600 bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                  {round.matches.length} match{round.matches.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Matches */}
              <div className="flex flex-col gap-3">
                {round.matches.length === 0 ? (
                  <div className="min-w-[190px] h-16 rounded-xl border border-dashed border-white/[0.06] flex items-center justify-center">
                    <span className="text-[10px] text-slate-700">En attente des résultats</span>
                  </div>
                ) : (
                  round.matches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      myTeamId={myTeamId}
                      onMatchClick={onMatchClick}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
