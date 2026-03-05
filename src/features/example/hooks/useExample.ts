import { useExampleStore } from '../store/exampleStore'
import type { ExampleItem } from '../types'

export function useExample() {
  const { items, addItem, removeItem } = useExampleStore()

  function createItem(title: string, description?: string): void {
    const item: ExampleItem = {
      id: crypto.randomUUID(),
      title,
      description,
    }
    addItem(item)
  }

  return { items, createItem, removeItem }
}
