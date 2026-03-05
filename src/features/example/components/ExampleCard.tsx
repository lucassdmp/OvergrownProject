import { cn } from '@/lib/utils'
import type { ExampleItem } from '../types'

interface ExampleCardProps {
  item: ExampleItem
  onRemove?: (id: string) => void
  className?: string
}

export function ExampleCard({ item, onRemove, className }: ExampleCardProps) {
  return (
    <div className={cn('rounded-lg border p-4 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">{item.title}</h3>
          {item.description && (
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          )}
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(item.id)}
            className="text-sm text-destructive hover:underline"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
