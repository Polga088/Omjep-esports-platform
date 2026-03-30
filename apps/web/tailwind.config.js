/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
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
      },
    },
  },
  plugins: [],
};
