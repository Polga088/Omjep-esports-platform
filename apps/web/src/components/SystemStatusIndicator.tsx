/**
 * Indicateur fixe d’état du système tactique (remplace tout switch de thème).
 */
export default function SystemStatusIndicator() {
  return (
    <div
      className="flex shrink-0 items-center gap-2 rounded border border-[#22c55e]/35 bg-[#020202]/90 px-2.5 py-1.5 sm:px-3"
      title="Système d’exploitation tactique — état nominal"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00F2FF] opacity-40" aria-hidden />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00F2FF] shadow-[0_0_8px_rgba(0,242,255,0.85)]" aria-hidden />
      </span>
      <span className="font-['Rajdhani',system-ui,sans-serif] text-[10px] font-bold uppercase tracking-[0.2em] text-[#22c55e]">
        SYS-STABLE
      </span>
    </div>
  )
}
