import React, { createContext, useContext, useEffect } from 'react'

// The app is dark-only by design — the light mode has been removed entirely.
// This provider remains so any consumer of useTheme() keeps compiling; it
// always reports 'dark' and toggle() is a no-op.
export type Theme = 'dark'

const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'dark', toggle: () => {} })

export function useTheme() {
  return useContext(Ctx)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark'
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')
    if (meta) meta.setAttribute('content', '#101311')
  }, [])

  return <Ctx.Provider value={{ theme: 'dark', toggle: () => {} }}>{children}</Ctx.Provider>
}
