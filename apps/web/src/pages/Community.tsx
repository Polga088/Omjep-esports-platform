import { useState } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Camera, Clock3, Flame, MessageCircleMore, Plus, Radar } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'
import TacticalEmptyState from '@/components/TacticalEmptyState'

type NewsCategory = 'MERCATO' | 'TOURNAMENT' | 'UPDATE'

interface CommunityArticle {
  id: string
  slug: string
  category: NewsCategory
  title: string
  excerpt: string
  readTime: string
  image: string | null
  quote: string | null
  body: string[]
  views: number
  createdAt: string
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

const fallbackImages: Record<NewsCategory, string> = {
  MERCATO:
    'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=1400&q=80',
  TOURNAMENT:
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1400&q=80',
  UPDATE:
    'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=1400&q=80',
}

const categoryFilters: Array<{ label: string; value: NewsCategory | 'ALL' }> = [
  { label: 'Tous', value: 'ALL' },
  { label: 'Mercato', value: 'MERCATO' },
  { label: 'Tournament', value: 'TOURNAMENT' },
  { label: 'Update', value: 'UPDATE' },
]

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -16,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
}

async function fetchNews(page: number, limit: number, category: NewsCategory | 'ALL'): Promise<NewsResponse> {
  const params: Record<string, string | number> = { page, limit }
  if (category !== 'ALL') {
    params.category = category
  }
  const { data } = await api.get<NewsResponse>('/news', { params })
  return data
}

function CategoryBadge({ category }: { category: NewsCategory }) {
  return (
    <span className="inline-flex rounded-none border border-neutral-200 bg-transparent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black dark:border-neutral-800 dark:text-white">
      {category}
    </span>
  )
}

function TacticalSkeletonCard() {
  return (
    <article className="tactical-bento tactical-skeleton-shimmer relative h-[250px] overflow-hidden rounded-none border border-neutral-200 bg-white/[0.02] dark:border-neutral-800 sm:h-[280px]">
      <div className="absolute inset-x-0 bottom-0 space-y-3 p-5">
        <div className="h-5 w-20 rounded-none border-[0.5px] border-black/5 bg-transparent dark:border-white/10" />
        <div className="h-5 w-11/12 rounded-none border-[0.5px] border-black/5 bg-transparent dark:border-white/10" />
        <div className="h-4 w-1/2 rounded-none border-[0.5px] border-black/5 bg-transparent dark:border-white/10" />
      </div>
    </article>
  )
}

function ArticleCard({
  article,
  isLarge = false,
  onSelect,
}: {
  article: CommunityArticle
  isLarge?: boolean
  onSelect: (article: CommunityArticle) => void
}) {
  const imageUrl = article.image ?? fallbackImages[article.category]

  return (
    <motion.article variants={itemVariants} exit="exit" layout>
      <button
        type="button"
        onClick={() => onSelect(article)}
        className="group tactical-bento relative w-full overflow-hidden rounded-none border border-neutral-200 text-left transition-all duration-300 hover:-translate-y-1 hover:border-neutral-200 focus:outline-none focus-visible:ring-0 dark:border-neutral-800 dark:hover:border-neutral-800"
      >
        <div className={`relative ${isLarge ? 'h-[430px]' : 'h-[250px] sm:h-[280px]'}`}>
          <img
            src={imageUrl}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <CategoryBadge category={article.category} />
            <h3 className="mt-3 font-['Rajdhani'] text-xl font-black italic uppercase leading-tight tracking-[0.05em] text-black dark:text-white sm:text-2xl">
              {article.title}
            </h3>
            <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-black/70 dark:text-white/70">
              <Clock3 className="h-3.5 w-3.5 text-black dark:text-white" />
              <span>{article.readTime} de lecture</span>
            </div>
          </div>
        </div>
      </button>
    </motion.article>
  )
}

export default function Community() {
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const isAdmin = user?.role === 'ADMIN'

  const {
    data,
    isLoading,
    isError,
    isFetching,
  } = useQuery({
    queryKey: ['community-news', selectedCategory, page],
    queryFn: () => fetchNews(page, 9, selectedCategory),
  })

  const items = data?.items ?? []
  const pagination = data?.pagination

  const heroMain = items[0]
  const heroRight = items.slice(1, 3)
  const gridItems = items.slice(2)
  const trending = items.slice(0, 5)

  function handleFilterChange(filter: NewsCategory | 'ALL') {
    setSelectedCategory(filter)
    setPage(1)
  }

  function handleSelectArticle(article: CommunityArticle) {
    navigate(`/community/news/${article.id}`)
  }

  return (
    <div className="kimi-community-page relative min-h-screen bg-transparent text-black dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-transparent" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
        <div className="flex-1">
          <h1 className="mb-10 text-8xl font-bold tracking-tighter text-black dark:text-white">Community</h1>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {categoryFilters.map((filter) => {
              const isActive = selectedCategory === filter.value
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => handleFilterChange(filter.value)}
                  className={`rounded-none border border-neutral-200 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition dark:border-neutral-800 ${
                    isActive
                      ? 'bg-white/[0.02] text-black dark:text-white'
                      : 'bg-transparent text-black/65 hover:text-black dark:text-white/65 dark:hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              )
            })}

            <div className="ml-auto flex items-center gap-3">
              {isFetching && !isLoading && (
                <span className="font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.18em] text-black/70 dark:text-white/70">
                  Uplink Sync...
                </span>
              )}
              {isAdmin && (
                <Link
                  to="/admin/news/create"
                  className="inline-flex items-center gap-2 rounded-none border border-neutral-200 bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-black transition dark:border-neutral-800 dark:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Créer un article
                </Link>
              )}
            </div>
          </div>

          {isError && (
            <div className="tactical-bento rounded-none border border-neutral-200 bg-white/[0.02] p-5 text-sm text-black dark:border-neutral-800 dark:text-white">
              Impossible de charger les news pour le moment
            </div>
          )}

          {isLoading && (
            <div className="space-y-8">
              <div className="grid gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <article className="tactical-bento tactical-skeleton-shimmer h-[430px] rounded-none border border-neutral-200 bg-white/[0.02] dark:border-neutral-800" />
                </div>
                <div className="space-y-5">
                  <TacticalSkeletonCard />
                  <TacticalSkeletonCard />
                </div>
              </div>
              <div className="grid auto-rows-[230px] gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <TacticalSkeletonCard key={`skeleton-${index}`} />
                ))}
              </div>
            </div>
          )}

          {!isLoading && items.length > 0 && (
            <>
              <motion.section
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid gap-5 lg:grid-cols-3"
              >
                {heroMain && (
                  <div className="lg:col-span-2">
                    <ArticleCard article={heroMain} onSelect={handleSelectArticle} isLarge />
                  </div>
                )}
                <div className="flex flex-col gap-5">
                  {heroRight.map((article) => (
                    <ArticleCard key={article.id} article={article} onSelect={handleSelectArticle} />
                  ))}
                </div>
              </motion.section>

              <motion.section
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="mt-10"
              >
                <div className="mb-4 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-black dark:text-white" />
                  <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.22em] text-black/70 dark:text-white/70">
                    Flux Articles
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selectedCategory}-${page}`}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="grid auto-rows-[230px] gap-5 sm:grid-cols-2 xl:grid-cols-3"
                  >
                    {gridItems.map((article, index) => (
                      <div
                        key={article.id}
                        className={index % 4 === 0 ? 'sm:col-span-2 xl:col-span-2 xl:row-span-2' : ''}
                      >
                        <ArticleCard article={article} onSelect={handleSelectArticle} />
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </motion.section>
            </>
          )}

          {!isLoading && items.length === 0 && !isError && (
            <TacticalEmptyState
              icon={Radar}
              title="Aucune donnée détectée dans le secteur"
              description="Aucun article pour ce filtre. Changez de catégorie ou revenez plus tard."
            />
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between rounded-none border border-neutral-200 bg-white/[0.02] px-4 py-3 dark:border-neutral-800">
              <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.14em] text-black dark:text-white">
                Page {pagination.page} / {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-none border border-neutral-200 px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-black disabled:cursor-not-allowed disabled:opacity-35 dark:border-neutral-800 dark:text-white"
                >
                  Précédent
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                  className="rounded-none border border-neutral-200 bg-transparent px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-black disabled:cursor-not-allowed disabled:opacity-35 dark:border-neutral-800 dark:text-white"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="w-full lg:sticky lg:top-24 lg:h-fit lg:max-w-sm">
          <section className="tactical-bento rounded-none border-neutral-200 p-5 dark:border-neutral-800">
            <h3 className="font-['Rajdhani'] text-xl font-black italic uppercase tracking-[0.08em] text-black dark:text-white">
              Trending
            </h3>
            <div className="mt-4 space-y-4">
              {trending.map((article, index) => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => handleSelectArticle(article)}
                  className="group relative block w-full overflow-hidden rounded-none border border-neutral-200 bg-white/[0.02] px-4 py-4 text-left dark:border-neutral-800"
                >
                  <span className="pointer-events-none absolute -right-1 top-1 font-['JetBrains_Mono'] text-[58px] font-extrabold leading-none text-white/5">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="pr-16 font-['Rajdhani'] text-base font-bold italic uppercase tracking-[0.04em] text-black dark:text-white">
                    {article.title}
                  </p>
                  <p className="mt-1 font-['JetBrains_Mono'] text-xs uppercase tracking-[0.16em] text-black/60 dark:text-white/60">{article.readTime}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="hub-surface mt-5 rounded-none border-neutral-200 p-5 dark:border-neutral-800">
            <h4 className="font-['Rajdhani'] text-lg font-black italic uppercase tracking-[0.08em] text-black dark:text-white">
              Reseaux Sociaux
            </h4>
            <div className="mt-4 space-y-3">
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-none border border-neutral-200 bg-white/[0.02] px-4 py-3 transition hover:border-neutral-200 dark:border-neutral-800 dark:hover:border-neutral-800"
              >
                <span className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.15em] text-black dark:text-white">
                  <MessageCircleMore className="h-4 w-4 text-black dark:text-white" />
                  Discord
                </span>
                <span className="font-['JetBrains_Mono'] text-xs text-black/60 dark:text-white/60">+4.2k</span>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-none border border-neutral-200 bg-white/[0.02] px-4 py-3 transition hover:border-neutral-200 dark:border-neutral-800 dark:hover:border-neutral-800"
              >
                <span className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.15em] text-black dark:text-white">
                  <Camera className="h-4 w-4 text-black dark:text-white" />
                  Instagram
                </span>
                <span className="font-['JetBrains_Mono'] text-xs text-black/60 dark:text-white/60">@omjep_official</span>
              </a>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
