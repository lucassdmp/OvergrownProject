import { Outlet } from 'react-router-dom'
import AppNavbar from '../features/auth/AppNavbar'
import { useDarkMode } from '../hooks/useDarkMode'

export default function RootLayout() {
  const [isDark, toggleDark] = useDarkMode()

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <AppNavbar isDark={isDark} toggleDark={toggleDark} />
      <Outlet />
    </div>
  )
}
