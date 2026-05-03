import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ImageIcon, Loader2, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import type { PublicLandingMediaPayload } from '@/types/public-landing-media'

const COMP_ROWS = [
  { id: 'ligue-elite', label: 'Ligue Elite OMJEP' },
  { id: 'coupe-trone', label: 'Coupe du Trône eFootball' },
  { id: 'ucl', label: 'OMJEP Champions League' },
] as const

const CHAMP_ROWS = [
  { key: 'atlas-wolves', label: 'Atlas Wolves' },
  { key: 'rabat-united', label: 'Rabat United' },
  { key: 'casablanca-kings', label: 'Casablanca Kings' },
] as const

interface AdminLandingRow {
  id: string
  updatedAt: string
  palmaresHeroVisualUrl: string | null
  palmaresCompetitionsMedia: unknown
  palmaresChampionsMedia: unknown
}

async function fetchLandingAdmin(): Promise<AdminLandingRow> {
  const { data } = await api.get<AdminLandingRow>('/admin/landing-media')
  return data
}

export default function AdminLandingMedia() {
  const queryClient = useQueryClient()
  const [heroUrlDraft, setHeroUrlDraft] = useState('')

  const q = useQuery({
    queryKey: ['admin-landing-media'],
    queryFn: fetchLandingAdmin,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-landing-media'] })
    void queryClient.invalidateQueries({ queryKey: ['public-landing-media'] })
  }

  const patchMutation = useMutation({
    mutationFn: async (body: Partial<PublicLandingMediaPayload>) => {
      await api.patch('/admin/landing-media', body)
    },
    onSuccess: () => {
      toast.success('Médias enregistrés')
      invalidate()
    },
    onError: () => toast.error('Enregistrement impossible'),
  })

  const row = q.data

  useEffect(() => {
    if (row?.palmaresHeroVisualUrl !== undefined) {
      setHeroUrlDraft(row.palmaresHeroVisualUrl ?? '')
    }
  }, [row?.palmaresHeroVisualUrl])

  async function handleUpload(
    path: string,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    const form = event.currentTarget
    const input = form.querySelector('input[type="file"]') as HTMLInputElement | null
    const file = input?.files?.[0]
    if (!file) {
      toast.error('Choisissez un fichier')
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    try {
      await api.post<{ url: string }>(path, fd)
      toast.success('Image téléversée')
      form.reset()
      invalidate()
    } catch {
      toast.error('Échec du téléversement')
    }
  }

  function handlePatchHeroUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    patchMutation.mutate({
      palmaresHeroVisualUrl: heroUrlDraft.trim() === '' ? null : heroUrlDraft.trim(),
    })
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-black tracking-tight text-omjep-text-primary">
            Médias landing & Palmarès
          </h1>
          <p className="mt-2 max-w-xl text-sm text-omjep-text-secondary">
            Images servies sur la page publique Palmarès. Si une URL est vide, le rendu SVG premium par défaut
            s’affiche.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void q.refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-omjep-border bg-omjep-bg-panel-soft px-3 py-2 text-xs font-bold uppercase tracking-wider text-omjep-text-primary"
        >
          {q.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Rafraîchir
        </button>
      </div>

      {q.isLoading ? (
        <div className="flex justify-center py-16 text-omjep-text-muted">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : q.isError ? (
        <p className="text-sm text-red-400">Impossible de charger la configuration (migration DB appliquée ?).</p>
      ) : (
        <div className="space-y-10">
          <section className="rounded-2xl border border-omjep-border bg-omjep-bg-panel-soft/80 p-5">
            <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-omjep-text-primary">
              <ImageIcon className="h-5 w-5 text-[color-mix(in_srgb,var(--omjep-gold)_75%,var(--omjep-mauve))]" />
              Hero Palmarès
            </h2>
            <p className="mt-1 text-xs text-omjep-text-muted">
              Visuel principal à droite du hero. Format large recommandé (PNG / WebP), fond transparent ou sombre.
            </p>
            <form onSubmit={handlePatchHeroUrl} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1 text-xs uppercase tracking-wider text-omjep-text-muted">
                URL (optionnel)
                <input
                  value={heroUrlDraft}
                  onChange={(e) => setHeroUrlDraft(e.target.value)}
                  placeholder="/api/v1/uploads/..."
                  className="mt-1.5 w-full rounded-lg border border-omjep-border bg-omjep-bg-panel px-3 py-2 text-sm text-omjep-text-primary outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={patchMutation.isPending}
                className="rounded-lg border border-[color-mix(in_srgb,var(--omjep-mauve)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_15%,var(--omjep-bg-panel))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-omjep-text-primary disabled:opacity-50"
              >
                Enregistrer l’URL
              </button>
            </form>
            <form
              onSubmit={(e) => void handleUpload('/admin/landing-media/upload/palmares-hero', e)}
              className="mt-4 flex flex-wrap items-center gap-3 border-t border-omjep-border/60 pt-4"
            >
              <input
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                className="max-w-full text-xs text-omjep-text-secondary file:mr-3 file:rounded-lg file:border file:border-omjep-border file:bg-omjep-bg-panel file:px-3 file:py-1.5"
              />
              <button
                type="submit"
                className="rounded-lg border border-[color-mix(in_srgb,var(--omjep-gold)_45%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_12%,var(--omjep-bg-panel))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-omjep-text-primary"
              >
                Téléverser hero
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-omjep-border bg-omjep-bg-panel-soft/80 p-5">
            <h2 className="font-heading text-lg font-bold text-omjep-text-primary">Compétitions (3)</h2>
            <p className="mt-1 text-xs text-omjep-text-muted">Trophée (colonne gauche carte) et visuel carte (arrière-plan optionnel).</p>
            <ul className="mt-4 space-y-6">
              {COMP_ROWS.map((c) => (
                <li key={c.id} className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel/60 p-4">
                  <p className="text-sm font-bold text-omjep-text-primary">{c.label}</p>
                  <p className="mt-1 font-mono text-[11px] text-omjep-text-muted">{c.id}</p>
                  <div className="mt-3 flex flex-wrap gap-4">
                    <form onSubmit={(e) => void handleUpload(`/admin/landing-media/upload/palmares-competition/${c.id}/trophy`, e)} className="flex flex-wrap items-center gap-2">
                      <input name="file" type="file" accept="image/*" className="max-w-[200px] text-[11px] file:rounded file:border file:border-omjep-border file:bg-omjep-bg-panel file:px-2 file:py-1" />
                      <button type="submit" className="rounded-lg border border-omjep-border px-2 py-1 text-[10px] font-bold uppercase text-omjep-text-primary">
                        Trophée
                      </button>
                    </form>
                    <form onSubmit={(e) => void handleUpload(`/admin/landing-media/upload/palmares-competition/${c.id}/card`, e)} className="flex flex-wrap items-center gap-2">
                      <input name="file" type="file" accept="image/*" className="max-w-[200px] text-[11px] file:rounded file:border file:border-omjep-border file:bg-omjep-bg-panel file:px-2 file:py-1" />
                      <button type="submit" className="rounded-lg border border-omjep-border px-2 py-1 text-[10px] font-bold uppercase text-omjep-text-primary">
                        Carte
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-omjep-border bg-omjep-bg-panel-soft/80 p-5">
            <h2 className="font-heading text-lg font-bold text-omjep-text-primary">Badges champions</h2>
            <ul className="mt-4 space-y-4">
              {CHAMP_ROWS.map((c) => (
                <li key={c.key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-omjep-border/70 bg-omjep-bg-panel/60 p-3">
                  <span className="text-sm font-semibold text-omjep-text-primary">{c.label}</span>
                  <form onSubmit={(e) => void handleUpload(`/admin/landing-media/upload/palmares-champion/${c.key}/badge`, e)} className="flex flex-wrap items-center gap-2">
                    <input name="file" type="file" accept="image/*" className="max-w-[200px] text-[11px] file:rounded file:border file:border-omjep-border file:bg-omjep-bg-panel file:px-2 file:py-1" />
                    <button type="submit" className="rounded-lg border border-omjep-border px-2 py-1 text-[10px] font-bold uppercase text-omjep-text-primary">
                      Badge
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-center text-[11px] text-omjep-text-muted">
            Community : couverture d’article via téléversement sur la page « Créer un article ».
          </p>
        </div>
      )}
    </div>
  )
}
