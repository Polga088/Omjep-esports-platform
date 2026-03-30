import { Link } from 'react-router-dom';
import { Zap, Trophy, Users, ChevronRight, Star, Shield, Swords } from 'lucide-react';

const stats = [
  { label: 'Clubs actifs', value: '128+', icon: Shield },
  { label: 'Joueurs inscrits', value: '1 200+', icon: Users },
  { label: 'Tournois organisés', value: '48', icon: Trophy },
];

const features = [
  {
    icon: Swords,
    title: 'Compétitions EA FC',
    description: 'Participez à des tournois officiels et gravissez le classement national.',
  },
  {
    icon: Users,
    title: 'Gestion de Club',
    description: 'Créez et gérez votre club virtuel, recrutez des joueurs, gérez votre effectif.',
  },
  {
    icon: Trophy,
    title: 'Classement en temps réel',
    description: 'Suivez votre progression et celle de votre club avec des statistiques détaillées.',
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-[#00D4FF]/5 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#FF6B35]/5 blur-[100px]" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(0,212,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.5) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00D4FF]/20 bg-[#00D4FF]/5 text-[#00D4FF] text-sm font-medium mb-8">
              <Star className="w-3.5 h-3.5" fill="currentColor" />
              Saison 2026 — Inscriptions ouvertes
            </div>

            <h1 className="font-display font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-none mb-6">
              <span className="text-white">DOMINEZ</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] to-[#0099BB]">
                L'ARÈNE
              </span>
              <br />
              <span className="text-white">EA FC</span>
            </h1>

            <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed">
              La plateforme officielle OMJEP pour les compétitions EA FC. Rejoignez un club, 
              participez aux tournois et prouvez que vous êtes le meilleur.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg bg-[#00D4FF] text-[#0A0E1A] hover:bg-[#00BBDD] transition-all shadow-xl shadow-[#00D4FF]/25 hover:shadow-[#00D4FF]/40 hover:-translate-y-0.5"
              >
                <Zap className="w-5 h-5" fill="currentColor" />
                Rejoindre maintenant
              </Link>
              <Link
                to="/leaderboard"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg border border-white/10 text-white hover:bg-white/5 hover:border-white/20 transition-all"
              >
                Voir le classement
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0E1A] to-transparent pointer-events-none" />
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-4 justify-center sm:justify-start">
                <div className="w-12 h-12 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#00D4FF]" />
                </div>
                <div>
                  <p className="font-display font-bold text-3xl text-white">{value}</p>
                  <p className="text-slate-500 text-sm">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Une plateforme complète pour gérer votre carrière e-sport EA FC.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#00D4FF]/20 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/10 flex items-center justify-center mb-4 group-hover:bg-[#00D4FF]/15 group-hover:border-[#00D4FF]/30 transition-all">
                  <Icon className="w-5 h-5 text-[#00D4FF]" />
                </div>
                <h3 className="font-display font-semibold text-xl text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl border border-[#00D4FF]/15 bg-gradient-to-br from-[#00D4FF]/5 to-transparent p-12 text-center overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#00D4FF]/5 blur-[80px] pointer-events-none" />
            <div className="relative">
              <Trophy className="w-12 h-12 text-[#00D4FF] mx-auto mb-6" />
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-white mb-4">
                Prêt à compétitionner ?
              </h2>
              <p className="text-slate-400 max-w-lg mx-auto mb-8">
                Créez votre compte gratuitement et rejoignez la communauté OMJEP Eagles dès aujourd'hui.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg bg-[#00D4FF] text-[#0A0E1A] hover:bg-[#00BBDD] transition-all shadow-xl shadow-[#00D4FF]/25"
              >
                <Zap className="w-5 h-5" fill="currentColor" />
                Créer mon compte
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
