import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Upload, X, ShieldCheck, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useModalOpenSound } from '@/hooks/useModalOpenSound'
import { MatchScoreProjection } from '@/components/kimi/MatchScoreProjection'

interface TeamLite {
  id: string
  name: string
  logoUrl: string | null
}

interface MatchLite {
  id: string
  homeTeam: TeamLite
  awayTeam: TeamLite
  homeScore: number | null
  awayScore: number | null
}

interface RankingSummary {
  homeTeam: { rank: number | null; points: number | null; pointsDelta: number }
  awayTeam: { rank: number | null; points: number | null; pointsDelta: number }
}

interface MatchReportModalProps {
  open: boolean
  match: MatchLite | null
  onClose: () => void
  onUpdated: () => void
}

function GoldConfettiBurst({ active }: { active: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 26 }).map((_, idx) => ({
        id: idx,
        x: (Math.random() - 0.5) * 460,
        y: -Math.random() * 340 - 40,
        rotate: Math.random() * 720 - 360,
        delay: Math.random() * 0.35,
      })),
    [],
  )

  return (
    <AnimatePresence>
      {active && (
        <motion.div className="pointer-events-none absolute inset-0 z-[90]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {particles.map((p) => (
            <motion.span
              key={p.id}
              className="absolute left-1/2 top-1/2 h-2.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.8)]"
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
              animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.7 }}
              transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function MatchReportModal({ open, match, onClose, onUpdated }: MatchReportModalProps) {
  const currentMatch = match
  const [homeScore, setHomeScore] = useState<number>(match?.homeScore ?? 0)
  const [awayScore, setAwayScore] = useState<number>(match?.awayScore ?? 0)
  const [proofUrl, setProofUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rankingSummary, setRankingSummary] = useState<RankingSummary | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useModalOpenSound(Boolean(open && match))

  if (!open || !currentMatch) return null

  async function readFileAsDataUrl(file: File) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
      reader.readAsDataURL(file)
    })
    setProofUrl(dataUrl)
  }

  async function handleReport() {
    if (!currentMatch) return
    setIsSubmitting(true)
    try {
      await api.patch(`/matches/${currentMatch.id}/report`, {
        homeScore,
        awayScore,
        proofUrl: proofUrl || undefined,
      })
      toast.success('Score reporté (PENDING)')
      onUpdated()
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Report impossible'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleConfirm() {
    if (!currentMatch) return
    setIsSubmitting(true)
    try {
      const { data } = await api.patch(`/matches/${currentMatch.id}/confirm`, {
        homeScore,
        awayScore,
      })
      if (data?.status === 'DISPUTE') {
        toast.error('Conflit détecté, match placé en litige')
        onUpdated()
        return
      }
      setRankingSummary(data?.rankingSummary ?? null)
      setShowConfetti(true)
      window.setTimeout(() => setShowConfetti(false), 1400)
      toast.success('Match validé')
      onUpdated()
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Confirmation impossible'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="tactical-modal-backdrop z-[80]">
      <div className="tactical-modal-dim" onClick={onClose} role="presentation" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(event) => event.stopPropagation()}
        className="tactical-modal-panel max-w-2xl border border-amber-400/25 p-6"
      >
        <GoldConfettiBurst active={showConfetti} />
        <button onClick={onClose} className="absolute right-3 top-3 rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:text-white">
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center justify-center gap-4">
          <TeamBadge team={currentMatch.homeTeam} />
          <span className="font-['Rajdhani'] text-2xl font-black text-amber-300/80 sm:text-3xl">VS</span>
          <TeamBadge team={currentMatch.awayTeam} />
        </div>

        <div className="mb-5 flex justify-center px-2">
          <MatchScoreProjection home={homeScore} away={awayScore} size="modal" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ScoreInput label={currentMatch.homeTeam.name} value={homeScore} onChange={setHomeScore} />
          <ScoreInput label={currentMatch.awayTeam.name} value={awayScore} onChange={setAwayScore} />
        </div>

        <div
          className={`mt-4 rounded-2xl border p-4 transition ${dragging ? 'border-amber-300/60 bg-amber-400/10' : 'border-white/10 bg-white/[0.03]'}`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={async (event) => {
            event.preventDefault()
            setDragging(false)
            const file = event.dataTransfer.files?.[0]
            if (file) await readFileAsDataUrl(file)
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (file) await readFileAsDataUrl(file)
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Upload className="h-4 w-4 text-amber-300" />
              <span>Dropzone preuve (image)</span>
            </div>
            <button onClick={() => inputRef.current?.click()} className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-amber-200">
              Upload
            </button>
          </div>
          {proofUrl ? (
            <p className="mt-2 truncate text-xs text-emerald-300">Preuve attachée</p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Glisser-déposer ou sélectionner un screenshot du score final</p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            disabled={isSubmitting}
            onClick={handleReport}
            className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.15em] text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
          >
            Reporter (PENDING)
          </button>
          <button
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.15em] text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
          >
            Confirmer & Valider
          </button>
        </div>

        {rankingSummary && (
          <div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-400/10 p-3">
            <p className="mb-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.12em] text-amber-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Classement mis à jour
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
              <div>Home: #{rankingSummary.homeTeam.rank ?? '-'} · {rankingSummary.homeTeam.points ?? '-'} pts ({rankingSummary.homeTeam.pointsDelta >= 0 ? '+' : ''}{rankingSummary.homeTeam.pointsDelta})</div>
              <div>Away: #{rankingSummary.awayTeam.rank ?? '-'} · {rankingSummary.awayTeam.points ?? '-'} pts ({rankingSummary.awayTeam.pointsDelta >= 0 ? '+' : ''}{rankingSummary.awayTeam.pointsDelta})</div>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
          <AlertCircle className="h-3.5 w-3.5" />
          Seuls les capitaines peuvent reporter/confirmer. En cas d’écart, le match passe en litige.
        </div>
      </motion.div>
    </div>
  )
}

function TeamBadge({ team }: { team: TeamLite }) {
  return (
    <div className="flex min-w-[9rem] flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      {team.logoUrl ? (
        <img src={team.logoUrl} alt={team.name} className="h-10 w-10 object-contain" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-sm font-black text-amber-300">
          {team.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <p className="text-center text-xs font-semibold text-slate-200">{team.name}</p>
    </div>
  )
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="mb-2 truncate text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <input
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value || 0)))}
        className="w-full rounded-lg border border-amber-300/30 bg-black/30 px-3 py-2 text-center font-['Rajdhani'] text-2xl font-black text-amber-200 outline-none focus:border-amber-300/70"
      />
    </label>
  )
}
