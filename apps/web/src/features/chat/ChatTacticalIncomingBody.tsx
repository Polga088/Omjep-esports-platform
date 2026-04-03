import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { EncryptedText } from '@/components/EncryptedText';

function TypewriterCyanGlow({
  text,
  onComplete,
}: {
  text: string;
  onComplete?: () => void;
}) {
  const chars = Array.from(text);
  const lastIndex = chars.length - 1;

  const handleLastComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  return (
    <span className="inline whitespace-pre-wrap break-words text-slate-100 [text-shadow:0_0_10px_rgba(34,211,238,0.55),0_0_22px_rgba(6,182,212,0.2)]">
      {chars.map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: 'blur(5px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ delay: i * 0.022, duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={i === lastIndex ? handleLastComplete : undefined}
          className="inline"
        >
          {ch === '\n' ? <br /> : ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}
    </span>
  );
}

type Phase = 'decrypt' | 'type';

/**
 * Nouveau message entrant : scramble 0,5s puis apparition lettre à lettre (lueur cyan).
 */
export function ChatTacticalIncomingBody({
  content,
  onAnimationEnd,
}: {
  content: string;
  onAnimationEnd?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('decrypt');

  const handleReveal = useCallback(() => {
    setPhase('type');
  }, []);

  if (phase === 'decrypt') {
    return (
      <EncryptedText
        text={content}
        durationMs={500}
        onReveal={handleReveal}
        className="text-sm text-cyan-200/90 [text-shadow:0_0_12px_rgba(34,211,238,0.35)]"
      />
    );
  }

  return <TypewriterCyanGlow text={content} onComplete={onAnimationEnd} />;
}
