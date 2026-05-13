import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRight,
  BookOpen,
  ExternalLink,
  Flame,
  Megaphone,
  Newspaper,
  Plus,
  Radio,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'
import TacticalEmptyState from '@/components/TacticalEmptyState'
import MercatoArticleCover from '@/components/community/MercatoArticleCover'

type NewsCategory = 'MERCATO' | 'TOURNAMENT' | 'UPDATE'

interface CommunityArticle {
  id: string
  slug: string
  category: NewsCategory
  type?: NewsCategory
  title: string
  excerpt: string
  readTime: string
  image: string | null
  quote: string | null
  body: string[]
  coverTemplate?: string | null
  coverData?: Record<string, unknown> | null
  published?: boolean
  views: number
  createdAt: string
}

interface MercatoCoverData {
  playerName: string
  departureClubName: string
  arrivalClubName: string
  departureClubLogoUrl?: string | null
  arrivalClubLogoUrl?: string | null
  amountOc?: number | string
  status?: string
}

interface NewsPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface NewsResponse {
  items: CommunityArticle[]
  pagination: NewsPagination
}

type FilterKey = NewsCategory | 'ALL' | 'COMMUNITY'

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'Tous' },
  { key: 'MERCATO', label: 'Mercato' },
  { key: 'TOURNAMENT', label: 'Compétition' },
  { key: 'UPDATE', label: 'Annonce' },
  { key: 'COMMUNITY', label: 'Communauté' },
]

async function fetchNews(page: number, limit: number, category: NewsCategory | 'ALL'): Promise<NewsResponse> {
  const params: Record<string, string | number> = { page, limit }
  if (category !== 'ALL') {
    params.category = category
  }
  const { data } = await api.get<NewsResponse>('/news', { params })
  return data
}

function categoryLabel(c: NewsCategory): string {
  switch (c) {
    case 'MERCATO':
      return 'Mercato'
    case 'TOURNAMENT':
      return 'Compétition'
    case 'UPDATE':
      return 'Annonce'
    default:
      return c
  }
}

function categoryTone(c: NewsCategory): string {
  switch (c) {
    case 'MERCATO':
      return 'border-omjep-mauve/45 bg-[color-mix(in_srgb,var(--omjep-mauve)_18%,transparent)] text-omjep-text-primary'
    case 'TOURNAMENT':
      return 'border-[color-mix(in_srgb,var(--omjep-gold)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_10%,transparent)] text-omjep-text-primary'
    case 'UPDATE':
      return 'border-omjep-border text-omjep-text-secondary bg-omjep-bg-panel-soft/80'
    default:
      return 'border-omjep-border text-omjep-text-secondary'
  }
}

function gradientForCategory(c: NewsCategory): string {
  switch (c) {
    case 'MERCATO':
      return 'from-[color-mix(in_srgb,var(--omjep-mauve)_42%,#0a0f18)] via-[#080d16] to-[#05080f]'
    case 'TOURNAMENT':
      return 'from-[color-mix(in_srgb,var(--omjep-gold)_22%,#0c1018)] via-[#0a0e14] to-[#05070c]'
    case 'UPDATE':
      return 'from-[color-mix(in_srgb,var(--omjep-mauve)_18%,#080c14)] via-[#070a12] to-[#05060c]'
    default:
      return 'from-omjep-bg-panel to-omjep-bg'
  }
}

function formatArticleDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

function getMercatoCoverData(article: CommunityArticle): MercatoCoverData | null {
  if ((article.type ?? article.category) !== 'MERCATO') return null
  if (article.coverTemplate !== 'mercato-template') return null
  const raw = article.coverData
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const data = raw as Record<string, unknown>
  if (
    typeof data.playerName !== 'string' ||
    typeof data.departureClubName !== 'string' ||
    typeof data.arrivalClubName !== 'string'
  ) {
    return null
  }
  return {
    playerName: data.playerName,
    departureClubName: data.departureClubName,
    arrivalClubName: data.arrivalClubName,
    departureClubLogoUrl:
      typeof data.departureClubLogoUrl === 'string' ? data.departureClubLogoUrl : null,
    arrivalClubLogoUrl:
      typeof data.arrivalClubLogoUrl === 'string' ? data.arrivalClubLogoUrl : null,
    amountOc:
      typeof data.amountOc === 'number' || typeof data.amountOc === 'string'
        ? data.amountOc
        : undefined,
    status: typeof data.status === 'string' ? data.status : undefined,
  }
}

function ArticleCover({ article, tall }: { article: CommunityArticle; tall?: boolean }) {
  const category = article.category
  const imageUrl = article.image
  const title = article.title
  const h = tall ? 'min-h-[220px] sm:min-h-[280px] lg:min-h-[320px]' : 'min-h-[160px] sm:min-h-[180px]'
  const mercatoCoverData = getMercatoCoverData(article)

  if (mercatoCoverData) {
    return (
      <div className={`relative ${h} w-full overflow-hidden`}>
        <MercatoArticleCover {...mercatoCoverData} compact={!tall} />
      </div>
    )
  }

  if (imageUrl) {
    return (
      <div className={`relative ${h} w-full overflow-hidden`}>
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--omjep-bg)_96%,#000)] via-[color-mix(in_srgb,#000_35%,transparent)] to-transparent" />
        <div className="absolute inset-0 ring-1 ring-inset ring-white/10" aria-hidden />
      </div>
    )
  }
  return (
    <div
      className={`relative ${h} w-full overflow-hidden bg-gradient-to-br ${gradientForCategory(category)}`}
      aria-hidden
    >
      <div className="absolute inset-0 opacity-[0.35] bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--omjep-mauve)_35%,transparent),transparent_55%),radial-gradient(ellipse_at_80%_90%,color-mix(in_srgb,var(--omjep-gold)_18%,transparent),transparent_50%)]" />
      <div className="absolute bottom-6 left-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/25 backdrop-blur-md">
        <Newspaper className="h-7 w-7 text-[color-mix(in_srgb,var(--omjep-gold)_88%,#fff)]" aria-hidden />
      </div>
      <p className="sr-only">{title}</p>
    </div>
  )
}

export default function Community() {
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('ALL')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const apiCategory: NewsCategory | 'ALL' =
    selectedFilter === 'COMMUNITY' ? 'ALL' : selectedFilter === 'ALL' ? 'ALL' : selectedFilter

  const {
    data,
    isLoading,
    isError,
    isFetching,
  } = useQuery({
    queryKey: ['community-news', apiCategory, page],
    queryFn: () => fetchNews(page, 12, apiCategory),
  })

  const rawItems = data?.items ?? []
  const pagination = data?.pagination

  const items = useMemo(() => {
    if (selectedFilter !== 'COMMUNITY') return rawItems
    return [...rawItems].sort((a, b) => b.views - a.views)
  }, [rawItems, selectedFilter])

  const trending = useMemo(() => {
    const pool = rawItems.length ? rawItems : items
    return [...pool].sort((a, b) => b.views - a.views).slice(0, 4)
  }, [rawItems, items])

  const heroMain = items[0]
  const heroSecondary = items.slice(1, 3)
  const feedItems = items.slice(3)

  const stats = useMemo(() => {
    const mercato = items.filter((a) => a.category === 'MERCATO').length
    const comp = items.filter((a) => a.category === 'TOURNAMENT').length
    const views = items.reduce((s, a) => s + (a.views || 0), 0)
    return {
      articles: pagination?.total ?? items.length,
      mercato,
      comp,
      views,
    }
  }, [items, pagination?.total])

  const handleSelectArticle = (article: CommunityArticle) => {
    navigate(`/community/news/${article.id}`)
  }

  const setFilter = (k: FilterKey) => {
    setSelectedFilter(k)
    setPage(1)
  }

  return (
    <div className="community-hub relative min-h-screen overflow-x-hidden bg-omjep-bg text-omjep-text-primary">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,color-mix(in_srgb,var(--omjep-mauve)_14%,transparent),transparent_50%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1440px] px-4 pb-16 pt-8 sm:px-6 lg:px-10">
        <header className="mb-10 grid gap-8 lg:grid-cols-[1fr_minmax(0,320px)] lg:items-end">
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-omjep-text-muted">COMMUNITY HUB</p>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-omjep-text-primary sm:text-4xl lg:text-[2.35rem] lg:leading-[1.1]">
              Actualités &amp; Communauté OMJEP
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-omjep-text-secondary">
              Mercato, compétitions, clubs et joueurs — le flux officiel OMJEP Pro Clubs. Restez alignés sur la saison.
            </p>
            {isAdmin ? (
              <Link
                to="/admin/news/create"
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_38%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_8%,var(--omjep-bg-panel-soft))] px-4 py-2.5 text-xs font-semibold text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-gold)_55%,var(--omjep-mauve))]"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Créer un article
              </Link>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 lg:gap-3">
            <div className="rounded-xl border border-omjep-border/70 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_90%,#070d18)] px-3 py-3 shadow-[var(--omjep-shadow-lg)]">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">
                <BookOpen className="h-3.5 w-3.5 text-omjep-mauve" aria-hidden />
                Articles
              </div>
              <p className="mt-1.5 font-heading text-2xl font-black tabular-nums text-omjep-text-primary">{stats.articles}</p>
            </div>
            <div className="rounded-xl border border-omjep-border/70 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_90%,#070d18)] px-3 py-3 shadow-[var(--omjep-shadow-lg)]">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">
                <Radio className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--omjep-gold)_80%,var(--omjep-mauve))]" aria-hidden />
                Mercato
              </div>
              <p className="mt-1.5 font-heading text-2xl font-black tabular-nums text-[color-mix(in_srgb,var(--omjep-gold)_85%,var(--omjep-text-primary))]">{stats.mercato}</p>
            </div>
            <div className="rounded-xl border border-omjep-border/70 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_90%,#070d18)] px-3 py-3 shadow-[var(--omjep-shadow-lg)]">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">
                <Trophy className="h-3.5 w-3.5 text-omjep-mauve" aria-hidden />
                Compétition
              </div>
              <p className="mt-1.5 font-heading text-2xl font-black tabular-nums text-omjep-text-primary">{stats.comp}</p>
            </div>
            <div className="rounded-xl border border-omjep-border/70 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_90%,#070d18)] px-3 py-3 shadow-[var(--omjep-shadow-lg)]">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-omjep-text-muted">
                <Users className="h-3.5 w-3.5 text-omjep-mauve" aria-hidden />
                Lectures
              </div>
              <p className="mt-1.5 font-heading text-2xl font-black tabular-nums text-omjep-text-primary">{stats.views.toLocaleString('fr-FR')}</p>
            </div>
          </div>
        </header>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="omjep-tabrail flex w-full max-w-full flex-wrap gap-1 p-1">
            {FILTER_TABS.map(({ key, label }) => {
              const active = selectedFilter === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`omjep-tabrail__btn ${active ? 'omjep-tabrail__btn--active' : ''}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {isFetching && !isLoading ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-omjep-text-muted">Mise à jour…</span>
          ) : null}
        </div>

        {isError ? (
          <div className="mb-10 rounded-xl border border-omjep-border/80 bg-omjep-bg-panel-soft/60 px-4 py-4 text-sm text-omjep-text-secondary">
            Impossible de charger les articles pour le moment. Réessayez plus tard.
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="h-[320px] animate-pulse rounded-2xl border border-omjep-border/60 bg-omjep-bg-panel-soft/40 lg:col-span-2" />
            <div className="space-y-4">
              <div className="h-[150px] animate-pulse rounded-xl border border-omjep-border/60 bg-omjep-bg-panel-soft/40" />
              <div className="h-[150px] animate-pulse rounded-xl border border-omjep-border/60 bg-omjep-bg-panel-soft/40" />
            </div>
          </div>
        ) : null}

        {!isLoading && items.length > 0 && heroMain ? (
          <>
            <section className="mb-12 grid gap-5 lg:grid-cols-3" aria-label="À la une">
              <article className="group overflow-hidden rounded-2xl border border-omjep-border/80 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_94%,#060a12)] shadow-[var(--omjep-shadow-lg)] transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_38%,var(--omjep-border))] hover:shadow-[0_0_40px_-16px_color-mix(in_srgb,var(--omjep-mauve)_35%,transparent)] lg:col-span-2">
                <button type="button" onClick={() => handleSelectArticle(heroMain)} className="block w-full text-left">
                  <ArticleCover article={heroMain} tall />
                  <div className="space-y-3 p-5 sm:p-6">
                    <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${categoryTone(heroMain.category)}`}>
                      {categoryLabel(heroMain.category)}
                    </span>
                    <h2 className="font-heading text-xl font-bold leading-snug text-omjep-text-primary sm:text-2xl">{heroMain.title}</h2>
                    <p className="line-clamp-3 text-sm leading-relaxed text-omjep-text-secondary">{heroMain.excerpt}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-omjep-text-muted">
                      <time dateTime={heroMain.createdAt}>{formatArticleDate(heroMain.createdAt)}</time>
                      <span aria-hidden>·</span>
                      <span>{heroMain.readTime}</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-omjep-mauve">
                        Lire <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </div>
                  </div>
                </button>
              </article>

              <div className="flex flex-col gap-4">
                {heroSecondary.map((article) => (
                  <article
                    key={article.id}
                    className="group overflow-hidden rounded-xl border border-omjep-border/80 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_94%,#060a12)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))]"
                  >
                    <button type="button" onClick={() => handleSelectArticle(article)} className="block w-full text-left">
                      <ArticleCover article={article} />
                      <div className="space-y-2 p-4">
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${categoryTone(article.category)}`}>
                          {categoryLabel(article.category)}
                        </span>
                        <h3 className="line-clamp-2 font-heading text-base font-bold leading-tight text-omjep-text-primary">{article.title}</h3>
                        <p className="text-[11px] text-omjep-text-muted">{article.readTime}</p>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <div className="mb-12 grid gap-10 lg:grid-cols-[1fr_320px]">
              <section aria-label="Flux">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-omjep-mauve" aria-hidden />
                  <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-omjep-text-muted">Flux</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {feedItems.map((article) => (
                    <article
                      key={article.id}
                      className="group flex flex-col overflow-hidden rounded-xl border border-omjep-border/70 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_92%,#05080f)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_32%,var(--omjep-border))]"
                    >
                      <button type="button" onClick={() => handleSelectArticle(article)} className="flex flex-1 flex-col text-left">
                        <ArticleCover article={article} />
                        <div className="flex flex-1 flex-col p-4">
                          <span className={`mb-2 w-fit rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${categoryTone(article.category)}`}>
                            {categoryLabel(article.category)}
                          </span>
                          <h3 className="line-clamp-2 flex-1 font-heading text-sm font-bold leading-snug text-omjep-text-primary">{article.title}</h3>
                          <p className="mt-2 line-clamp-2 text-xs text-omjep-text-secondary">{article.excerpt}</p>
                          <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-omjep-text-muted">
                            <time dateTime={article.createdAt}>{formatArticleDate(article.createdAt)}</time>
                            <span>{article.readTime}</span>
                          </div>
                        </div>
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Tendance et liens">
                <div className="rounded-2xl border border-omjep-border/80 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_95%,#070b14)] p-5 shadow-[var(--omjep-shadow-lg)]">
                  <div className="mb-4 flex items-center gap-2">
                    <Flame className="h-4 w-4 text-[color-mix(in_srgb,var(--omjep-gold)_75%,var(--omjep-mauve))]" aria-hidden />
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-omjep-text-muted">Tendance</h2>
                  </div>
                  <ol className="space-y-3">
                    {trending.map((article, i) => (
                      <li key={article.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectArticle(article)}
                          className="flex w-full gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-omjep-border/60 hover:bg-omjep-bg-panel-soft/40"
                        >
                          <span className="mt-0.5 w-6 shrink-0 text-right font-heading text-lg font-black tabular-nums text-omjep-text-muted/50">
                            {i + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="line-clamp-2 text-sm font-semibold leading-snug text-omjep-text-primary">{article.title}</span>
                            <span className="mt-1 block text-[10px] text-omjep-text-muted">{article.views.toLocaleString('fr-FR')} vues</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-6 rounded-2xl border border-omjep-border/80 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_92%,#060910)] p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-omjep-mauve" aria-hidden />
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-omjep-text-muted">Réseaux &amp; communauté</h2>
                  </div>
                  <p className="mb-4 text-xs leading-relaxed text-omjep-text-secondary">
                    Rejoignez les canaux officiels OMJEP pour les annonces live, clips et soirées compétitives.
                  </p>
                  <ul className="space-y-2">
                    {[
                      { label: 'Discord OMJEP', hint: 'Salons compétition', href: 'https://discord.com' },
                      { label: 'YouTube', hint: 'Highlights & interviews', href: 'https://youtube.com' },
                      { label: 'Kick / Live', hint: 'Streams matchs', href: 'https://kick.com' },
                      { label: 'Instagram', hint: '@omjep — stories', href: 'https://instagram.com' },
                    ].map((row) => (
                      <li key={row.label}>
                        <a
                          href={row.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center justify-between gap-2 rounded-xl border border-omjep-border/60 bg-omjep-bg-panel-soft/35 px-3 py-2.5 text-sm font-medium text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] hover:bg-omjep-bg-panel-soft/55"
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{row.label}</span>
                            <span className="text-[10px] text-omjep-text-muted">{row.hint}</span>
                          </span>
                          <ExternalLink className="h-4 w-4 shrink-0 text-omjep-text-muted" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>

            {pagination && pagination.totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/40 px-4 py-3">
                <p className="text-xs font-medium text-omjep-text-secondary">
                  Page {pagination.page} / {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-omjep-border/80 px-3 py-1.5 text-xs font-semibold text-omjep-text-primary transition hover:border-omjep-mauve/40 disabled:opacity-40"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    className="rounded-lg border border-omjep-border/80 px-3 py-1.5 text-xs font-semibold text-omjep-text-primary transition hover:border-omjep-mauve/40 disabled:opacity-40"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {!isLoading && items.length === 0 && !isError ? (
          <TacticalEmptyState
            icon={Newspaper}
            title="Aucun article dans ce flux"
            description="Changez de filtre ou revenez plus tard pour les prochaines annonces OMJEP."
          />
        ) : null}
      </div>
    </div>
  )
}
