import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Crown, Send } from 'lucide-react'
import { toast } from 'sonner'

const linksNav = [
  { to: '/', label: 'Rejoindre OMJEP' },
  { to: '/palmares', label: 'Palmarès officiel' },
  { to: '/register', label: 'Inscription' },
  { to: '/login', label: 'Connexion joueur' },
  { to: '/community', label: 'Communauté eSport' },
]

const linksPro = [
  { to: '/register', label: 'Inscription pro' },
  { to: '/palmares', label: 'Palmarès officiel' },
  { to: '/community', label: 'Actualités EA FC' },
]

const linksLegal: { href: string; label: string; external?: boolean }[] = [
  { href: 'https://omjep.ma', label: 'Institution OMJEP', external: true },
  { href: 'mailto:contact@omjep.ma', label: 'Contact fédération' },
]

/**
 * Pied de page 4 colonnes, newsletter, fond flouté.
 */
export default function CinematicFooter() {
  const [email, setEmail] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Saisis une adresse e-mail valide')
      return
    }
    toast.success('Merci ! Ta newsletter est enregistrée (démo).')
    setEmail('')
  }

  return (
    <footer className="relative border-t border-white/[0.06] bg-[#020202]/85 backdrop-blur-2xl backdrop-saturate-150">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(34,197,94,0.08),transparent_50%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
                <Crown className="h-5 w-5 text-emerald-400" fill="currentColor" />
              </div>
              <div>
                <p className="font-heading text-base font-bold tracking-tight text-white">OMJEP</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">EA FC — Maroc</p>
              </div>
            </div>
              <p className="max-w-xs font-sans text-sm leading-relaxed text-slate-400">
              Plateforme officielle des compétitions professionnelles EA FC au Maroc.
            </p>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-bold uppercase tracking-wider text-white">
              Navigation
            </h3>
            <ul className="space-y-2">
              {linksNav.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="font-sans text-sm text-slate-400 transition hover:text-emerald-400"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-bold uppercase tracking-wider text-white">
              Plateforme
            </h3>
            <ul className="space-y-2">
              {linksPro.map((l) => (
                <li key={l.label + l.to}>
                  <Link
                    to={l.to}
                    className="font-sans text-sm text-slate-400 transition hover:text-emerald-400"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
              {linksLegal.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target={l.external ? '_blank' : undefined}
                    rel={l.external ? 'noopener noreferrer' : undefined}
                    className="font-sans text-sm text-slate-500 transition hover:text-emerald-400/80"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-bold uppercase tracking-wider text-white">
              Newsletter
            </h3>
            <p className="mb-3 font-sans text-sm text-slate-500">
              Calendrier officiel, résultats homologués et annonces de tournois.
            </p>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-2"
              noValidate
              aria-label="Inscription à la newsletter"
            >
              <label htmlFor="cinematic-footer-email" className="sr-only">
                Adresse e-mail
              </label>
              <input
                id="cinematic-footer-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="votre@email.ma"
                className="w-full rounded-lg border border-white/10 bg-[#050505]/80 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 py-2.5 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              >
                <Send className="h-4 w-4" aria-hidden />
                Recevoir les actualités
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-8 text-center sm:flex-row sm:text-left">
          <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-slate-600">
            Organisation Marocaine des Jeux Électroniques Professionnels
          </p>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} OMJEP — Fédération E-sport Maroc</p>
        </div>
      </div>
    </footer>
  )
}
