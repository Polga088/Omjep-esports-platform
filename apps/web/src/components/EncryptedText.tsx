import { useEffect, useRef, useState } from 'react';

const SCRAMBLE_SYMBOLS = '@#$%&*!?<>[]{}~^+=\\/|░▒';

function scramblePreserveNewlines(text: string): string {
  return text
    .split('')
    .map((c) => (c === '\n' ? '\n' : SCRAMBLE_SYMBOLS[Math.floor(Math.random() * SCRAMBLE_SYMBOLS.length)]))
    .join('');
}

export interface EncryptedTextProps {
  /** Texte final à révéler */
  text: string;
  /** Durée de la phase « decrypt » (ms) */
  durationMs?: number;
  className?: string;
  /** Appelé une fois le texte réel affiché */
  onReveal?: () => void;
}

/**
 * Affiche des symboles ASCII aléatoires puis révèle le contenu (effet « hacker decrypt »).
 */
export function EncryptedText({
  text,
  durationMs = 500,
  className = '',
  onReveal,
}: EncryptedTextProps) {
  const [display, setDisplay] = useState(() => scramblePreserveNewlines(text));
  const revealRef = useRef(onReveal);
  const firedRef = useRef(false);
  revealRef.current = onReveal;

  useEffect(() => {
    firedRef.current = false;
    setDisplay(scramblePreserveNewlines(text));
    const tick = window.setInterval(() => {
      setDisplay(scramblePreserveNewlines(text));
    }, 45);
    const done = window.setTimeout(() => {
      clearInterval(tick);
      setDisplay(text);
      if (!firedRef.current) {
        firedRef.current = true;
        revealRef.current?.();
      }
    }, durationMs);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [text, durationMs]);

  return (
    <span className={`whitespace-pre-wrap break-words font-mono tracking-wide ${className}`} aria-hidden={display !== text}>
      {display}
    </span>
  );
}
