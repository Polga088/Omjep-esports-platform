import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Upload } from 'lucide-react'
import api from '@/lib/api'
import MercatoArticleCover from '@/components/community/MercatoArticleCover'

type NewsCategory = 'MERCATO' | 'TOURNAMENT' | 'UPDATE'
type NewsCreateMode = 'MERCATO' | 'CLASSIC'
type MercatoStatus =
  | 'OFFICIEL'
  | 'RUMEUR'
  | 'ACCORD TROUVÉ'
  | 'AGENT LIBRE'
  | 'PRÊT'
  | 'FIN DE CONTRAT'

interface NewsCreatePayload {
  category: NewsCategory
  type?: NewsCategory
  title: string
  excerpt: string
  readTime: string
  image?: string
  quote?: string
  body?: string[]
  coverTemplate?: string
  coverData?: Record<string, unknown>
  published?: boolean
}

interface ClubOption {
  id: string
  name: string
  logo_url?: string | null
}

interface MercatoGeneratedContent {
  title: string
  subtitle: string
  summaryLines: string[]
  body: string[]
  quote: string
}

const categories: NewsCategory[] = ['MERCATO', 'TOURNAMENT', 'UPDATE']
const mercatoStatuses: MercatoStatus[] = [
  'OFFICIEL',
  'RUMEUR',
  'ACCORD TROUVÉ',
  'AGENT LIBRE',
  'PRÊT',
  'FIN DE CONTRAT',
]
const MERCATO_TEMPLATE_PATH = '/images/community/mercato-template.png'

function getMercatoTitle({
  status,
  playerName,
  arrivalClubName,
  amountOc,
}: {
  status: MercatoStatus
  playerName: string
  arrivalClubName: string
  amountOc: number
}): string {
  if (status === 'OFFICIEL') {
    return `OFFICIEL : ${playerName} rejoint ${arrivalClubName} pour ${amountOc.toLocaleString('fr-FR')} OC`
  }
  if (status === 'RUMEUR') {
    return `RUMEUR : ${arrivalClubName} s'intéresse à ${playerName}`
  }
  if (status === 'ACCORD TROUVÉ') {
    return `ACCORD TROUVÉ : ${playerName} proche de ${arrivalClubName}`
  }
  if (status === 'AGENT LIBRE') {
    return `AGENT LIBRE : ${playerName} signe chez ${arrivalClubName} pour ${amountOc.toLocaleString('fr-FR')} OC`
  }
  if (status === 'PRÊT') {
    return `PRÊT : ${playerName} rejoint ${arrivalClubName}`
  }
  return `FIN DE CONTRAT : ${playerName} s'engage avec ${arrivalClubName}`
}

function estimateReadTime(paragraphs: string[]): string {
  const words = paragraphs.join(' ').trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.max(3, Math.ceil(words / 170))
  return `${minutes} min`
}

function buildMercatoContent({
  playerName,
  departureClubName,
  arrivalClubName,
  amountOc,
  status,
  competition,
}: {
  playerName: string
  departureClubName: string
  arrivalClubName: string
  amountOc: number
  status: MercatoStatus
  competition: string
}): MercatoGeneratedContent {
  const title = getMercatoTitle({
    status,
    playerName,
    arrivalClubName,
    amountOc,
  })

  const subtitle =
    "Le mercato OMJEP s'anime avec un nouveau mouvement stratégique sur la scène Pro Clubs."

  const formattedAmount = amountOc.toLocaleString('fr-FR')
  const summaryLines = [
    `Joueur : ${playerName}`,
    `Club de départ : ${departureClubName}`,
    `Club d'arrivée : ${arrivalClubName}`,
    `Statut : ${status}`,
    `Montant : ${formattedAmount} OC`,
    `Compétition : ${competition}`,
  ]

  const body = [
    ...summaryLines,
    `Le mercato OMJEP continue de s'animer avec une nouvelle opération confirmée. ${playerName} rejoint ${arrivalClubName} dans le cadre d'un mouvement estimé à ${formattedAmount} OC.`,
    `Cette arrivée représente une étape importante pour ${arrivalClubName}, qui renforce son effectif avec un profil capable d'apporter de l'impact, de la stabilité et une nouvelle dynamique dans les prochaines rencontres.`,
    `Du côté du joueur, ${playerName} ouvre un nouveau chapitre de sa carrière compétitive. Après son passage chez ${departureClubName}, ce transfert confirme son ambition de s'imposer dans un projet structuré et compétitif.`,
    `Avec ce mouvement, ${arrivalClubName} envoie un message clair au reste du championnat : le club avance ses pions et prépare sérieusement les prochaines échéances.`,
    `La communauté OMJEP suivra avec attention les premiers pas de ${playerName} sous ses nouvelles couleurs.`,
  ]

  const quote = `Je suis prêt pour ce nouveau défi. ${arrivalClubName} a un vrai projet, et je veux aider l'équipe à atteindre ses objectifs.`

  return {
    title,
    subtitle,
    summaryLines,
    body,
    quote,
  }
}

export default function NewsCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<NewsCreateMode>('MERCATO')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [isMercatoTextGenerated, setIsMercatoTextGenerated] = useState(false)
  const [clubs, setClubs] = useState<ClubOption[]>([])
  const [clubsLoading, setClubsLoading] = useState(false)
  const [mercatoForm, setMercatoForm] = useState({
    playerName: '',
    departureClubId: '',
    arrivalClubId: '',
    amountOc: '2000',
    status: 'OFFICIEL' as MercatoStatus,
    competition: 'OMJEP Pro Clubs',
    image: MERCATO_TEMPLATE_PATH,
  })
  const [formState, setFormState] = useState({
    category: 'UPDATE' as NewsCategory,
    title: '',
    excerpt: '',
    readTime: '5 min',
    image: '',
    quote: '',
    bodyText: '',
  })

  useEffect(() => {
    const loadClubs = async () => {
      setClubsLoading(true)
      try {
        const { data } = await api.get<ClubOption[] | { data?: ClubOption[] }>('/teams')
        const rows = Array.isArray(data) ? data : (data?.data ?? [])
        setClubs(rows)
      } catch {
        toast.error('Impossible de charger les clubs pour le générateur mercato')
      } finally {
        setClubsLoading(false)
      }
    }

    loadClubs()
  }, [])

  function updateField(field: keyof typeof formState, value: string) {
    setFormState((current) => ({ ...current, [field]: value }))
  }

  function updateMercatoField<K extends keyof typeof mercatoForm>(
    field: K,
    value: (typeof mercatoForm)[K],
  ) {
    setMercatoForm((current) => ({ ...current, [field]: value }))
  }

  const departureClub = useMemo(
    () => clubs.find((club) => club.id === mercatoForm.departureClubId) ?? null,
    [clubs, mercatoForm.departureClubId],
  )

  const arrivalClub = useMemo(
    () => clubs.find((club) => club.id === mercatoForm.arrivalClubId) ?? null,
    [clubs, mercatoForm.arrivalClubId],
  )

  const parsedAmountOc = useMemo(() => {
    const raw = Number(mercatoForm.amountOc)
    if (!Number.isFinite(raw) || raw < 0) return 0
    return Math.trunc(raw)
  }, [mercatoForm.amountOc])

  const canGenerateMercatoText = Boolean(
    mercatoForm.playerName.trim() &&
      departureClub?.name &&
      arrivalClub?.name,
  )

  const generatedMercatoContent = useMemo(() => {
    if (!canGenerateMercatoText || !departureClub || !arrivalClub) {
      return null
    }
    return buildMercatoContent({
      playerName: mercatoForm.playerName.trim(),
      departureClubName: departureClub.name,
      arrivalClubName: arrivalClub.name,
      amountOc: parsedAmountOc,
      status: mercatoForm.status,
      competition: mercatoForm.competition.trim() || 'OMJEP Pro Clubs',
    })
  }, [
    canGenerateMercatoText,
    departureClub,
    arrivalClub,
    mercatoForm.playerName,
    parsedAmountOc,
    mercatoForm.status,
    mercatoForm.competition,
  ])

  const mercatoReadTime = useMemo(() => {
    if (!generatedMercatoContent) return '4 min'
    return estimateReadTime(generatedMercatoContent.body)
  }, [generatedMercatoContent])

  async function handleArticleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setCoverUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const { data } = await api.post<{ url: string }>('/admin/news-media/article-cover', fd)
      updateField('image', data.url)
      toast.success('Couverture téléversée — URL appliquée au champ image')
    } catch {
      toast.error('Téléversement impossible')
    } finally {
      setCoverUploading(false)
    }
  }

  function handleGenerateMercatoText() {
    if (!generatedMercatoContent) {
      toast.error('Renseignez joueur, clubs et montant pour générer le texte')
      return
    }
    setIsMercatoTextGenerated(true)
    toast.success('Article mercato généré automatiquement')
  }

  function handleMercatoPreview() {
    if (!generatedMercatoContent) {
      toast.error('Complétez les champs mercato pour la prévisualisation')
      return
    }
    setIsMercatoTextGenerated(true)
    toast.success('Prévisualisation mercato prête')
  }

  async function handleMercatoPublish() {
    if (!generatedMercatoContent || !departureClub || !arrivalClub) {
      toast.error('Le template mercato est incomplet')
      return
    }

    const payload: NewsCreatePayload = {
      category: 'MERCATO',
      type: 'MERCATO',
      title: generatedMercatoContent.title,
      excerpt: generatedMercatoContent.subtitle,
      readTime: mercatoReadTime,
      image: mercatoForm.image,
      quote: generatedMercatoContent.quote,
      body: generatedMercatoContent.body,
      coverTemplate: 'mercato-template',
      coverData: {
        playerName: mercatoForm.playerName.trim(),
        departureClubId: departureClub.id,
        arrivalClubId: arrivalClub.id,
        departureClubName: departureClub.name,
        arrivalClubName: arrivalClub.name,
        departureClubLogoUrl: departureClub.logo_url ?? null,
        arrivalClubLogoUrl: arrivalClub.logo_url ?? null,
        amountOc: parsedAmountOc,
        status: mercatoForm.status,
      },
      published: true,
    }

    setIsSubmitting(true)
    try {
      await api.post('/news', payload)
      await queryClient.invalidateQueries({ queryKey: ['community-news'] })
      toast.success('Article mercato publié')
      navigate('/community')
    } catch {
      toast.error("Publication de l'article mercato impossible")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (mode === 'MERCATO') {
      await handleMercatoPublish()
      return
    }

    setIsSubmitting(true)

    const paragraphs = formState.bodyText
      .split('\n')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)

    const payload: NewsCreatePayload = {
      category: formState.category,
      title: formState.title.trim(),
      excerpt: formState.excerpt.trim(),
      readTime: formState.readTime.trim(),
      image: formState.image.trim() || undefined,
      quote: formState.quote.trim() || undefined,
      body: paragraphs.length > 0 ? paragraphs : undefined,
    }

    try {
      await api.post('/news', payload)
      await queryClient.invalidateQueries({ queryKey: ['community-news'] })
      toast.success('Article créé')
      navigate('/community')
    } catch {
      toast.error('Création impossible')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="font-['Rajdhani'] text-3xl font-black italic uppercase tracking-[0.08em] text-slate-100">
          Créer un article
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Publication rapide dans la section Community
        </p>
      </div>

      <div className="mb-5 inline-flex rounded-xl border border-white/10 bg-black/25 p-1">
        <button
          type="button"
          onClick={() => setMode('MERCATO')}
          className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${
            mode === 'MERCATO'
              ? 'border border-amber-300/45 bg-amber-300/15 text-amber-100'
              : 'text-slate-300 hover:bg-white/5'
          }`}
        >
          Créer article mercato
        </button>
        <button
          type="button"
          onClick={() => setMode('CLASSIC')}
          className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${
            mode === 'CLASSIC'
              ? 'border border-amber-300/45 bg-amber-300/15 text-amber-100'
              : 'text-slate-300 hover:bg-white/5'
          }`}
        >
          Article classique
        </button>
      </div>

      <form onSubmit={handleSubmit} className="tactical-bento space-y-4 rounded-2xl p-5">
        {mode === 'MERCATO' ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs uppercase tracking-[0.16em] text-slate-400">
                Joueur
                <input
                  required
                  value={mercatoForm.playerName}
                  placeholder="Ex. MIDKING"
                  onChange={(event) => updateMercatoField('playerName', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-slate-100 outline-none"
                />
              </label>
              <label className="block text-xs uppercase tracking-[0.16em] text-slate-400">
                Montant
                <div className="mt-2 flex items-center rounded-lg border border-white/15 bg-black/45">
                  <input
                    required
                    type="number"
                    min={0}
                    value={mercatoForm.amountOc}
                    placeholder="2000"
                    onChange={(event) => updateMercatoField('amountOc', event.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                  <span className="px-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    OC
                  </span>
                </div>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs uppercase tracking-[0.16em] text-slate-400">
                Club de départ
                <select
                  required
                  value={mercatoForm.departureClubId}
                  onChange={(event) => updateMercatoField('departureClubId', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  <option value="" disabled>
                    {clubsLoading ? 'Chargement clubs…' : 'Sélectionner un club'}
                  </option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs uppercase tracking-[0.16em] text-slate-400">
                Club d'arrivée
                <select
                  required
                  value={mercatoForm.arrivalClubId}
                  onChange={(event) => updateMercatoField('arrivalClubId', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  <option value="" disabled>
                    {clubsLoading ? 'Chargement clubs…' : 'Sélectionner un club'}
                  </option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-xs uppercase tracking-[0.16em] text-slate-400">
                Statut
                <select
                  value={mercatoForm.status}
                  onChange={(event) => updateMercatoField('status', event.target.value as MercatoStatus)}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  {mercatoStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs uppercase tracking-[0.16em] text-slate-400 sm:col-span-2">
                Compétition
                <input
                  value={mercatoForm.competition}
                  onChange={(event) => updateMercatoField('competition', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-slate-100 outline-none"
                />
              </label>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Image standard</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Template fixe utilisé pour le rendu mercato : {MERCATO_TEMPLATE_PATH}
              </p>
              <input
                value={mercatoForm.image}
                onChange={(event) => updateMercatoField('image', event.target.value)}
                className="mt-3 w-full rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-xs text-slate-300 outline-none"
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-black/25 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
                  Prévisualisation live
                </p>
                <p className="text-[11px] text-slate-500">
                  Les logos sont injectés automatiquement depuis les clubs
                </p>
              </div>
              <MercatoArticleCover
                playerName={mercatoForm.playerName.trim() || 'Nouveau Joueur'}
                departureClubName={departureClub?.name ?? 'Club Départ'}
                arrivalClubName={arrivalClub?.name ?? 'Club Arrivée'}
                departureClubLogoUrl={departureClub?.logo_url ?? null}
                arrivalClubLogoUrl={arrivalClub?.logo_url ?? null}
                amountOc={parsedAmountOc}
                status={mercatoForm.status}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleGenerateMercatoText}
                disabled={!canGenerateMercatoText}
                className="rounded-lg border border-fuchsia-300/45 bg-fuchsia-300/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Générer l’article
              </button>
              <button
                type="button"
                onClick={handleMercatoPreview}
                disabled={!canGenerateMercatoText}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prévisualiser
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !canGenerateMercatoText}
                className="rounded-lg border border-amber-300/45 bg-amber-300/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Publication...' : 'Publier'}
              </button>
            </div>

            {isMercatoTextGenerated && generatedMercatoContent ? (
              <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Titre premium</p>
                  <p className="mt-1 text-sm text-slate-100">{generatedMercatoContent.title}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Sous-titre</p>
                  <p className="mt-1 text-sm text-slate-200">{generatedMercatoContent.subtitle}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Résumé structuré</p>
                  <div className="mt-1 space-y-1 text-xs text-slate-300">
                    {generatedMercatoContent.summaryLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <label className="block text-xs uppercase tracking-[0.16em] text-slate-400">
              Catégorie
              <select
                value={formState.category}
                onChange={(event) => updateField('category', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-slate-100 outline-none"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs uppercase tracking-[0.16em] text-slate-400">
              Titre
              <input
                required
                value={formState.title}
                onChange={(event) => updateField('title', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-slate-100 outline-none"
              />
            </label>

            <label className="block text-xs uppercase tracking-[0.16em] text-slate-400">
              Extrait
              <textarea
                required
                value={formState.excerpt}
                onChange={(event) => updateField('excerpt', event.target.value)}
                className="mt-2 min-h-[100px] w-full rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-slate-100 outline-none"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs uppercase tracking-[0.16em] text-slate-400">
                Temps de lecture
                <input
                  required
                  value={formState.readTime}
                  onChange={(event) => updateField('readTime', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-slate-100 outline-none"
                />
              </label>
              <label className="block text-xs uppercase tracking-[0.16em] text-slate-400">
                Image (URL)
                <input
                  value={formState.image}
                  onChange={(event) => updateField('image', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-slate-100 outline-none"
                />
              </label>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Couverture (fichier)</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Téléversement admin — l’URL est injectée dans le champ « Image (URL) ».
              </p>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-100 hover:bg-amber-400/15">
                {coverUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {coverUploading ? 'Envoi…' : 'Choisir une image'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" className="sr-only" onChange={handleArticleCoverUpload} disabled={coverUploading} />
              </label>
            </div>

            <label className="block text-xs uppercase tracking-[0.16em] text-slate-400">
              Citation
              <input
                value={formState.quote}
                onChange={(event) => updateField('quote', event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-slate-100 outline-none"
              />
            </label>

            <label className="block text-xs uppercase tracking-[0.16em] text-slate-400">
              Paragraphes (une ligne = un paragraphe)
              <textarea
                value={formState.bodyText}
                onChange={(event) => updateField('bodyText', event.target.value)}
                className="mt-2 min-h-[120px] w-full rounded-lg border border-white/15 bg-black/45 px-3 py-2 text-sm text-slate-100 outline-none"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg border border-amber-300/45 bg-amber-300/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Publication...' : 'Publier'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
