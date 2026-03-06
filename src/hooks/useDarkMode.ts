import { useEffect, useState } from 'react'

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('overgrown-dark-mode')
    return stored ? stored === 'true' : false
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('overgrown-dark-mode', String(isDark))
  }, [isDark])

  return [isDark, () => setIsDark((v) => !v)] as const
}
