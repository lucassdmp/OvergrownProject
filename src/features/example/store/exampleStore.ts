import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ExampleItem } from '../types'

interface ExampleState {
  items: ExampleItem[]
  addItem: (item: ExampleItem) => void
  removeItem: (id: string) => void
}

export const useExampleStore = create<ExampleState>()(
  devtools(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({ items: [...state.items, item] }), false, 'addItem'),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }), false, 'removeItem'),
    }),
    { name: 'ExampleStore' },
  ),
)
