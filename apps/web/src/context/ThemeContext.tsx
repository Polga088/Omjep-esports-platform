import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'omjep-theme'
const DEFAULT_THEME: Theme = 'dark'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'dark' || stored === 'light') return stored
    } catch {
      return DEFAULT_THEME
    }
    return DEFAULT_THEME
  })

  useEffect(() => {
    const root = document.documentElement
    const isDark = theme === 'dark'
    root.setAttribute('data-theme', theme)
    root.classList.toggle('dark', isDark)
    /**
     * V2.1 : palette 100 % CSS (`index.css` — `:root` dark navy / `:root[data-theme='light']`).
     * Ne pas assigner --omjep-* en JS pour éviter les dérives vs tokens figés.
     */
    root.style.removeProperty('--omjep-bg')
    root.style.removeProperty('--omjep-accent')
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
