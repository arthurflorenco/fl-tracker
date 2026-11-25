'use client'
import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'

// Tema: o escuro é o padrão e não seguimos o tema do sistema (ver script anti-flash em app/layout.tsx).
type Theme = 'dark' | 'light'
interface ThemeCtx {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', toggle: () => {} })

// Fonte de verdade: o atributo data-theme no <html>.
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'dark' as Theme)

  const toggle = () => {
    const next: Theme = readTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('fl-theme', next)
    } catch {}
    emit()
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
