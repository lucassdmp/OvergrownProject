import { Outlet } from 'react-router-dom'
import { useDarkMode } from '../hooks/useDarkMode'

export default function RootLayout() {
  const [isDark, toggleDark] = useDarkMode()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        title={isDark ? 'Modo claro' : 'Modo escuro'}
        className="fixed top-3 right-3 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-base shadow transition hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400"
      >
        {isDark ? '☀' : '🌙'}
      </button>
      <Outlet />
    </div>
  )
}
