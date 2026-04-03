/** @type {import('tailwindcss').Config} */
export default {
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
      },
      colors: {
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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Rajdhani', 'sans-serif'],
        /** Chiffres / HUD gaming (Orbitron + fallback display) */
        gaming: ['Orbitron', 'Rajdhani', 'system-ui', 'sans-serif'],
        /** Titres type science-fiction (Michroma en priorité) */
        scifi: ['Michroma', 'Rajdhani', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
