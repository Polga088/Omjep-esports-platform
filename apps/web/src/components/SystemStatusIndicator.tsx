/**
 * Indicateur fixe d’état du système tactique (remplace tout switch de thème).
 */
export default function SystemStatusIndicator() {
  return (
    <div
      className="flex shrink-0 items-center gap-2 rounded border border-omjep-border bg-omjep-bg-panel/85 px-2.5 py-1.5 sm:px-3"
      title="Système d’exploitation tactique — état nominal"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-omjep-mauve opacity-45" aria-hidden />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-omjep-mauve shadow-[0_0_8px_rgba(110,89,217,0.85)]" aria-hidden />
      </span>
      <span className="font-heading text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-text-primary">
        SYS-STABLE
      </span>
    </div>
  )
}
