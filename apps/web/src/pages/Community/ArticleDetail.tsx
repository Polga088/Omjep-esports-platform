import { useQuery } from '@tanstack/react-query'
import { Eye, LoaderCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import api from '@/lib/api'
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

async function fetchArticle(slugOrId: string): Promise<CommunityArticle> {
  const { data } = await api.get<CommunityArticle>(`/news/${slugOrId}`)
  return data
}

function CategoryBadge({ category }: { category: NewsCategory }) {
  return (
    <span className="inline-flex rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200 shadow-[0_0_14px_rgba(212,175,55,0.2)]">
      {category}
    </span>
  )
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

export default function ArticleDetail() {
  const { slugOrId } = useParams<{ slugOrId: string }>()
  const hasSlugOrId = typeof slugOrId === 'string' && slugOrId.length > 0

  const {
    data: article,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['community-article', slugOrId],
    queryFn: () => fetchArticle(slugOrId!),
    enabled: hasSlugOrId,
  })

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-10">
        <div className="inline-flex items-center gap-3 rounded-xl border border-amber-300/25 bg-black/45 px-5 py-3">
          <LoaderCircle className="h-4 w-4 animate-spin text-amber-300" />
          <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.16em] text-amber-100">
            Chargement article...
          </span>
        </div>
      </div>
    )
  }

  if (isError || !article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="tactical-bento rounded-2xl p-8 text-center">
          <h1 className="font-['Rajdhani'] text-2xl font-black italic uppercase tracking-[0.08em] text-slate-100">
            Article introuvable
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Impossible de recuperer ce contenu
          </p>
          <Link
            to="/community"
            className="mt-5 inline-flex rounded-lg border border-amber-300/45 bg-amber-300/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-100"
          >
            Retour Community
          </Link>
        </div>
      </div>
    )
  }

  const mercatoCoverData = getMercatoCoverData(article)

  return (
    <div className="kimi-community-page relative min-h-screen bg-[#040404] px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(212,175,55,0.12),transparent_45%),radial-gradient(circle_at_100%_20%,rgba(30,58,138,0.16),transparent_42%)]" />
      <article className="relative mx-auto max-w-5xl rounded-2xl border border-amber-300/25 bg-[#050505] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55)] sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <CategoryBadge category={article.category} />
          <div className="inline-flex items-center gap-4 text-[11px] uppercase tracking-[0.15em] text-slate-400">
            <span className="font-['JetBrains_Mono']">{article.readTime}</span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-amber-300" />
              <span className="font-['JetBrains_Mono']">{article.views}</span>
            </span>
          </div>
        </div>

        <h1 className="font-['Rajdhani'] text-3xl font-black italic uppercase tracking-[0.06em] text-slate-100 sm:text-5xl">
          {article.title}
        </h1>

        <p className="mt-5 text-base leading-8 text-[#e6e2d7]">
          {article.excerpt}
        </p>

        {mercatoCoverData ? (
          <div className="my-8 overflow-hidden rounded-xl border border-white/10">
            <MercatoArticleCover {...mercatoCoverData} />
          </div>
        ) : article.image ? (
          <div className="my-8 h-[340px] overflow-hidden rounded-xl border border-white/10 sm:h-[430px]">
            <img src={article.image} alt={article.title} className="h-full w-full object-cover" />
          </div>
        ) : null}

        <section className="space-y-5 text-[15px] leading-8 text-[#e6e2d7]">
          {article.quote && (
            <blockquote className="border-l-4 border-amber-300/90 pl-4 text-lg italic text-[#f3e6b7]">
              "{article.quote}"
            </blockquote>
          )}
          {(article.body.length > 0 ? article.body : [article.excerpt]).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>

        <div className="mt-10">
          <Link
            to="/community"
            className="inline-flex rounded-lg border border-amber-300/45 bg-amber-300/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-100"
          >
            Retour Community
          </Link>
        </div>
      </article>
    </div>
  )
}
