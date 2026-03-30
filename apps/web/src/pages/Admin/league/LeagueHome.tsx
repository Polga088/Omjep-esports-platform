import { Link } from 'react-router-dom';
import { Scale, Trophy, Swords, ShieldCheck } from 'lucide-react';

export default function LeagueHome() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-teal-600/10 flex items-center justify-center border border-cyan-400/20">
            <Scale className="w-5 h-5 text-cyan-400" />
          </div>
          Espace Commissaire
        </h1>
        <p className="text-sm text-slate-500 mt-2 ml-[52px] max-w-xl">
          Gestion de la ligue et de la coupe : calendriers, création de matchs, et validation des
          résultats uniquement lorsque les deux clubs ont transmis la même déclaration de score.
        </p>
      </div>

      <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.03] p-5 flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-cyan-300">Double validation</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Le bouton de validation final n&apos;aboutit que si le score déclaré par le club à
            domicile est strictement identique à celui déclaré par le club visiteur. Sinon, un
            message d&apos;écart s&apos;affiche pour que vous puissiez trancher avec les managers.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/moderator/competitions"
          className="group flex items-start gap-4 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-cyan-400/25 hover:bg-cyan-400/[0.04] transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-cyan-400/10 flex items-center justify-center border border-cyan-400/15 group-hover:scale-105 transition-transform">
            <Trophy className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
              Compétitions
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Liste des ligues et coupes, génération du calendrier aller simple, liens vers les
              classements.
            </p>
          </div>
        </Link>

        <Link
          to="/moderator/matches"
          className="group flex items-start gap-4 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-teal-400/25 hover:bg-teal-400/[0.04] transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-teal-400/10 flex items-center justify-center border border-teal-400/15 group-hover:scale-105 transition-transform">
            <Swords className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-teal-300 transition-colors">
              Matchs & scores
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tableau des rencontres, déclarations par club, validation après accord mutuel.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
