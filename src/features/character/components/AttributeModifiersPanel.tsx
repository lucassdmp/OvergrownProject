import { ATTRIBUTE_LABELS, type AttributeName } from '../../../types/game'
import { useCharacterStats } from '../hooks/useCharacterStats'

const ATTRIBUTE_ORDER: AttributeName[] = ['might', 'grace', 'wisdom', 'sense', 'fortitude']

export default function AttributeModifiersPanel() {
  const { attributeModifiers } = useCharacterStats()

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
          Modificadores de Atributos
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {ATTRIBUTE_ORDER.map((attr) => (
          <div
            key={attr}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-center"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {ATTRIBUTE_LABELS[attr]}
            </div>
            <div className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {attributeModifiers[attr]}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
