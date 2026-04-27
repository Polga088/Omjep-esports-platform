/** Très court clic UI feutré — Web Audio, sans fichier réseau */
let audioCtx: AudioContext | null = null

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new Ctx()
    }
    return audioCtx
  } catch {
    return null
  }
}

export const playSoftUiClick = () => {
  if (typeof window === 'undefined') return
  try {
    const ctx = getCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()

    const t = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.001, t)
    master.gain.linearRampToValueAtTime(0.055, t + 0.012)
    master.gain.linearRampToValueAtTime(0.001, t + 0.07)
    master.connect(ctx.destination)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, t)
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.05)
    osc.connect(master)
    osc.start(t)
    osc.stop(t + 0.08)
  } catch {
    /* ignore */
  }
}

/**
 * Changement de module (Dock) — ventilation courte + double cliquetis mécanique (cockpit HUD).
 * ~90 ms, niveau feutré haut de gamme.
 */
export const playCockpitModuleSwitch = () => {
  if (typeof window === 'undefined') return
  try {
    const ctx = getCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()

    const t = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.001, t)
    master.gain.linearRampToValueAtTime(0.085, t + 0.008)
    master.gain.exponentialRampToValueAtTime(0.001, t + 0.11)
    master.connect(ctx.destination)

    // ── Ventilation : bruit bande-passé très court (souffle conduit)
    const nSamples = Math.ceil(ctx.sampleRate * 0.055)
    const buf = ctx.createBuffer(1, nSamples, ctx.sampleRate)
    const ch = buf.getChannelData(0)
    for (let i = 0; i < nSamples; i++) ch[i] = Math.random() * 2 - 1
    const vent = ctx.createBufferSource()
    vent.buffer = buf
    const ventF = ctx.createBiquadFilter()
    ventF.type = 'bandpass'
    ventF.frequency.setValueAtTime(2200, t)
    ventF.frequency.exponentialRampToValueAtTime(900, t + 0.05)
    ventF.Q.setValueAtTime(0.9, t)
    const ventG = ctx.createGain()
    ventG.gain.setValueAtTime(0, t)
    ventG.gain.linearRampToValueAtTime(0.55, t + 0.01)
    ventG.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
    vent.connect(ventF)
    ventF.connect(ventG)
    ventG.connect(master)
    vent.start(t)
    vent.stop(t + 0.065)

    // ── Claquement mécanique 1 (latch)
    const latch1 = ctx.createOscillator()
    latch1.type = 'sine'
    latch1.frequency.setValueAtTime(1450, t + 0.018)
    latch1.frequency.exponentialRampToValueAtTime(380, t + 0.032)
    const g1 = ctx.createGain()
    g1.gain.setValueAtTime(0.001, t + 0.018)
    g1.gain.linearRampToValueAtTime(0.12, t + 0.022)
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.042)
    latch1.connect(g1)
    g1.connect(master)
    latch1.start(t + 0.018)
    latch1.stop(t + 0.044)

    // ── Claquement mécanique 2 (relais)
    const latch2 = ctx.createOscillator()
    latch2.type = 'sine'
    latch2.frequency.setValueAtTime(920, t + 0.038)
    latch2.frequency.exponentialRampToValueAtTime(240, t + 0.048)
    const g2 = ctx.createGain()
    g2.gain.setValueAtTime(0.001, t + 0.038)
    g2.gain.linearRampToValueAtTime(0.07, t + 0.041)
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.058)
    latch2.connect(g2)
    g2.connect(master)
    latch2.start(t + 0.038)
    latch2.stop(t + 0.06)
  } catch {
    /* ignore */
  }
}
