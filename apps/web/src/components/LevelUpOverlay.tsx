import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GoldConfetti from './GoldConfetti';

interface LevelUpOverlayProps {
  active: boolean;
  newLevel: number;
  onDone?: () => void;
}

const LEVEL_UP_SOUND_FREQUENCY = 880;
const LEVEL_UP_SOUND_DURATION = 0.35;

function playLevelUpSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + LEVEL_UP_SOUND_DURATION);

    osc1.frequency.setValueAtTime(LEVEL_UP_SOUND_FREQUENCY, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

    osc2.frequency.setValueAtTime(440, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.1);
    osc1.stop(ctx.currentTime + LEVEL_UP_SOUND_DURATION);
    osc2.stop(ctx.currentTime + LEVEL_UP_SOUND_DURATION + 0.1);

    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Web Audio not available
  }
}

export default function LevelUpOverlay({ active, newLevel, onDone }: LevelUpOverlayProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (active) {
      playLevelUpSound();
      timerRef.current = setTimeout(() => onDone?.(), 4000);
      return () => clearTimeout(timerRef.current);
    }
  }, [active, onDone]);

  return (
    <>
      <GoldConfetti active={active} />

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none"
          >
            <div className="relative px-8 py-4 rounded-2xl border border-amber-400/30 shadow-2xl shadow-amber-500/20 backdrop-blur-xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(13,18,33,0.95) 0%, rgba(30,20,5,0.95) 100%)',
              }}
            >
              {/* Shimmer */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.5, ease: 'easeInOut' }}
                  className="absolute inset-y-0 w-1/3"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.1), transparent)',
                  }}
                />
              </div>

              <div className="relative flex items-center gap-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 5, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center shadow-lg border border-amber-400/40"
                >
                  <span className="text-xl font-black text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                    {newLevel}
                  </span>
                </motion.div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400/70">Level Up!</p>
                  <p className="text-lg font-black text-white">
                    Niveau <span className="text-amber-400">{newLevel}</span> atteint
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
