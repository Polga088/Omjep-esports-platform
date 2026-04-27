import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react'

export interface NewsItem {
  id: string
  title: string
  description: string
  tag?: string
  /** Fond full-bleed HD (cover) — repli sur gradient */
  imageUrl?: string
  gradient?: string
}

interface NewsCarouselProps {
  items: NewsItem[]
  autoPlayInterval?: number
}

const DEFAULT_GRADIENTS = [
  'linear-gradient(135deg, #0a0a0a 0%, #1e3a8a 45%, #0a0a0a 100%)',
  'linear-gradient(135deg, #0a0a0a 0%, #3d2a0a 50%, #0a0a0a 100%)',
  'linear-gradient(135deg, #0a0a0a 0%, #0f2f1a 50%, #0a0a0a 100%)',
  'linear-gradient(135deg, #0a0a0a 0%, #1a1a0f 50%, #0a0a0a 100%)',
  'linear-gradient(135deg, #0a0a0a 0%, #1e1b4b 50%, #0a0a0a 100%)',
]

export default function NewsCarousel({ items, autoPlayInterval = 6000 }: NewsCarouselProps) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const paginate = useCallback(
    (newDirection: number) => {
      setDirection(newDirection)
      setIndex((prev) => {
        const next = prev + newDirection
        if (next < 0) return items.length - 1
        if (next >= items.length) return 0
        return next
      })
    },
    [items.length],
  )

  useEffect(() => {
    if (items.length <= 1) return
    const timer = setInterval(() => paginate(1), autoPlayInterval)
    return () => clearInterval(timer)
  }, [items.length, autoPlayInterval, paginate])

  if (items.length === 0) {
    return (
      <div className="tactical-bento flex min-h-[200px] items-center justify-center p-8">
        <div className="text-center text-slate-500">
          <Newspaper className="mx-auto mb-2 h-10 w-10 opacity-40" />
          <p className="text-sm">Aucune actu à afficher</p>
        </div>
      </div>
    )
  }

  const current = items[index]
  const fallback = current.gradient ?? DEFAULT_GRADIENTS[index % DEFAULT_GRADIENTS.length]
  const hasImage = Boolean(current.imageUrl?.trim())

  const slideStyle: CSSProperties = hasImage
    ? {
        backgroundImage: [
          'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.92) 88%, rgba(0,0,0,0.98) 100%)',
          'linear-gradient(90deg, rgba(0,0,0,0.75) 0%, transparent 55%)',
          `url(${current.imageUrl})`,
        ].join(', '),
        backgroundSize: 'auto, auto, cover',
        backgroundPosition: 'center, left, center',
        backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
      }
    : { background: fallback }

  const variants = {
    enter: (d: number) => ({
      x: d > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (d: number) => ({
      x: d > 0 ? '-100%' : '100%',
      opacity: 0,
      scale: 0.98,
    }),
  }

  return (
    <div className="tactical-bento relative min-h-[min(48vh,28rem)] w-full overflow-hidden">
      <div className="absolute inset-0 z-[0] min-h-[min(48vh,28rem)]">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={current.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute inset-0 flex min-h-full flex-col justify-end"
            style={slideStyle}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_0%,rgba(30,58,138,0.2),transparent_60%)]" />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.15]"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(255,255,255,0.05) 2px,
                  rgba(255,255,255,0.05) 3px
                )`,
              }}
            />
            <div className="relative z-[1] p-5 sm:p-8 lg:p-10">
              {current.tag && (
                <span className="mb-3 inline-block border border-amber-400/45 bg-black/30 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-amber-200/95 backdrop-blur-sm">
                  {current.tag}
                </span>
              )}
              <h2 className="max-w-4xl font-display text-2xl font-extrabold italic leading-[1.1] tracking-wide text-white sm:text-3xl md:text-4xl [text-shadow:0_2px_24px_rgba(0,0,0,0.9)]">
                {current.title}
              </h2>
              <p className="mt-2 max-w-2xl line-clamp-2 text-sm leading-relaxed text-white/70 sm:line-clamp-3 sm:text-base">
                {current.description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => paginate(-1)}
            className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-amber-400/25 bg-black/50 text-amber-200/90 backdrop-blur-md transition-all hover:border-amber-400/50 hover:bg-black/70"
            aria-label="News précédente"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => paginate(1)}
            className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-amber-400/25 bg-black/50 text-amber-200/90 backdrop-blur-md transition-all hover:border-amber-400/50 hover:bg-black/70"
            aria-label="News suivante"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setDirection(i > index ? 1 : -1)
                  setIndex(i)
                }}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === index ? 'w-8 bg-amber-400 shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Aller à la news ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
