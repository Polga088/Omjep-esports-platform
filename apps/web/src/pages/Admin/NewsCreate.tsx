import { FormEvent, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '@/lib/api'

type NewsCategory = 'MERCATO' | 'TOURNAMENT' | 'UPDATE'

interface NewsCreatePayload {
  category: NewsCategory
  title: string
  excerpt: string
  readTime: string
  image?: string
  quote?: string
  body?: string[]
}

const categories: NewsCategory[] = ['MERCATO', 'TOURNAMENT', 'UPDATE']

export default function NewsCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formState, setFormState] = useState({
    category: 'UPDATE' as NewsCategory,
    title: '',
    excerpt: '',
    readTime: '5 min',
    image: '',
    quote: '',
    bodyText: '',
  })

  function updateField(field: keyof typeof formState, value: string) {
    setFormState((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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

      <form onSubmit={handleSubmit} className="tactical-bento space-y-4 rounded-2xl p-5">
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
      </form>
    </div>
  )
}
