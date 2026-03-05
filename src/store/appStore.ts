import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface AppState {
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      theme: 'light',
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' }), false, 'toggleTheme'),
    }),
    { name: 'AppStore' },
  ),
)
