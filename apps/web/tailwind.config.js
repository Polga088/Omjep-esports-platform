/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['variant', '&[data-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        /** Brillance MVP dashboard — passage toutes les 5s */
        'dashboard-mvp-shimmer': {
          '0%, 12%': { transform: 'translateX(-120%) skewX(-12deg)', opacity: '0' },
          '14%': { opacity: '0.35' },
          '22%': { transform: 'translateX(120%) skewX(-12deg)', opacity: '0.2' },
          '24%, 100%': { transform: 'translateX(120%) skewX(-12deg)', opacity: '0' },
        },
        /** Anneau holographique */
        'holo-ring': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        /** Couronne prestige au-dessus de l’avatar */
        'crown-float': {
          '0%, 100%': { transform: 'translateY(0) rotateX(18deg) rotateZ(-2deg)' },
          '50%': { transform: 'translateY(-6px) rotateX(22deg) rotateZ(2deg)' },
        },
        /** Ligne de scan MVP — balayage vertical */
        scan: {
          '0%': { transform: 'translateY(-120%)' },
          '100%': { transform: 'translateY(420%)' },
        },
        /** Maillot Carbon Neon — pulsation luminosité néon */
        'jersey-glow': {
          '0%, 100%': {
            opacity: '0.88',
            filter: 'brightness(1) saturate(1)',
          },
          '50%': {
            opacity: '1',
            filter: 'brightness(1.32) saturate(1.12)',
          },
        },
        /** Particules aura — dérive douce (utilisable en complément des orbites CSS) */
        'storm-float': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.85' },
          '33%': { transform: 'translate(3px, -8px) scale(1.08)', opacity: '1' },
          '66%': { transform: 'translate(-4px, 5px) scale(0.96)', opacity: '0.9' },
        },
        /** Ken Burns (hero) scale 1.1 → 1 */
        'ken-burns-in': {
          '0%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'spin-slow': 'spin-slow 4s linear infinite',
        'dashboard-mvp-shimmer': 'dashboard-mvp-shimmer 5s ease-in-out infinite',
        'holo-ring': 'holo-ring 12s linear infinite',
        'crown-float': 'crown-float 3.2s ease-in-out infinite',
        scan: 'scan 3.2s linear infinite',
        'jersey-glow': 'jersey-glow 2s ease-in-out infinite',
        'storm-float': 'storm-float 4s ease-in-out infinite',
        /** Alias demandé : animate-float */
        float: 'storm-float 4s ease-in-out infinite',
        'ken-burns-in': 'ken-burns-in 28s ease-out forwards',
      },
      colors: {
        'omjep-bg': 'var(--omjep-bg)',
        'omjep-surface': 'var(--omjep-surface)',
        'omjep-gold': 'var(--omjep-gold)',
        'omjep-accent': 'var(--omjep-accent)',
        'omjep-neutral': 'var(--omjep-neutral)',
        'omjep-danger': 'var(--omjep-danger)',
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        /** Pixar-Sport Cinematic (landing) */
        pixar: {
          deep: '#020202',
          accent: '#22c55e',
          'accent-soft': 'rgba(34, 197, 94, 0.14)',
        },
        esport: {
          primary: '#00D4FF',
          secondary: '#FF6B35',
          dark: '#0A0E1A',
          surface: '#111827',
        },
        /** OMJEP premium gold — align with @omjep/ui */
        gold: {
          DEFAULT: '#D4AF37',
          light: '#E8C547',
          dark: '#9A7B1A',
          muted: 'rgba(212, 175, 55, 0.35)',
          fg: '#F5E6A3',
        },
        /** Theme-aware tokens */
        omjep: {
          bg: 'var(--omjep-bg)',
          'bg-elevated': 'var(--omjep-bg-elevated)',
          'bg-panel': 'var(--omjep-bg-panel)',
          'bg-panel-soft': 'var(--omjep-bg-panel-soft)',
          'text-primary': 'var(--omjep-text-primary)',
          'text-secondary': 'var(--omjep-text-secondary)',
          'text-muted': 'var(--omjep-text-muted)',
          mauve: 'var(--omjep-mauve)',
          brand: 'var(--omjep-brand)',
          gold: 'var(--omjep-accent-gold)',
          'gold-light': 'var(--omjep-accent-gold-light)',
          cobalt: 'var(--omjep-accent-cobalt)',
          border: 'var(--omjep-border)',
          'border-gold': 'var(--omjep-border-gold)',
          'border-cold': 'var(--omjep-border-cold)',
          focus: 'var(--omjep-focus-ring)',
          'focus-gold': 'var(--omjep-focus-ring-gold)',
          success: 'var(--omjep-success)',
          warning: 'var(--omjep-warning)',
          danger: 'var(--omjep-danger)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        display: ['Sora', 'Inter', 'sans-serif'],
        /** constrained to approved families only */
        gaming: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        /** constrained to approved families only */
        scifi: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        /** Typo technique aggressive pour les chiffres (Hub Athlète) */
        tech: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
