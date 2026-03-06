import { useState } from 'react'
import { useCharacterStore } from '../store/characterStore'
import type { InventoryItem, ItemType } from '../../../types/game'
import AddItemModal from './modals/AddItemModal'
import UseItemModal from './modals/UseItemModal'

const TYPE_STYLE: Record<ItemType, { icon: string; color: string }> = {
  weapon:       { icon: '⚔',  color: 'text-red-400' },
  armor:        { icon: '🛡', color: 'text-sky-400' },
  'potion-vida':{ icon: '🧪', color: 'text-rose-400' },
  'potion-iep': { icon: '🔮', color: 'text-violet-400' },
  misc:         { icon: '◆',  color: 'text-gray-400' },
}

function ItemCard({ item }: { item: InventoryItem }) {
  const removeItem = useCharacterStore((s) => s.removeItem)
  const updateItemQuantity = useCharacterStore((s) => s.updateItemQuantity)
  const [expanded, setExpanded] = useState(false)
  const [usingItem, setUsingItem] = useState(false)

  const style = TYPE_STYLE[item.type]
  const isConsumable = item.type === 'potion-vida' || item.type === 'potion-iep'
  const hasActiveEffects = item.effects.some((e) => e.type === 'heal' || e.type === 'restoreIep')

  return (
    <>
      {usingItem && (
        <UseItemModal item={item} onClose={() => setUsingItem(false)} />
      )}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-lg" title={item.type}>{style.icon}</span>
          <span className="flex-1 font-semibold text-gray-900 dark:text-white text-sm truncate">{item.name}</span>

          {/* Quantity controls */}
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => updateItemQuantity(item.id, -1)}
              className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              −
            </button>
            <span className={`w-6 text-center font-bold ${item.quantity === 0 ? 'text-gray-600' : style.color}`}>
              {item.quantity}
            </span>
            <button
              onClick={() => updateItemQuantity(item.id, +1)}
              className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              +
            </button>
          </div>

          {/* Use button for consumables */}
          {isConsumable && hasActiveEffects && (
            <button
              onClick={() => setUsingItem(true)}
              disabled={item.quantity <= 0}
              className="rounded border border-emerald-800/50 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Usar
            </button>
          )}

          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-gray-400 dark:text-gray-500 transition hover:text-gray-900 dark:hover:text-white"
          >
            {expanded ? '▲' : '▼'}
          </button>
          <button
            onClick={() => removeItem(item.id)}
            className="text-xs text-gray-600 transition hover:text-red-400"
          >
            ✕
          </button>
        </div>

        {expanded && (
          <div className="px-3 pb-3 pt-0 border-t border-gray-200 dark:border-gray-700/40 space-y-1.5">
            {item.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 italic">{item.description}</p>
            )}
            {item.effects.length > 0 && (
              <div className="space-y-1">
                {item.effects.map((ef, i) => (
                  <p key={i} className="text-xs text-gray-500">
                    {ef.type === 'heal' && <span className="text-rose-400">❤ Restaura {ef.value} Vida</span>}
                    {ef.type === 'restoreIep' && <span className="text-sky-400">✦ Restaura {ef.value} IEP</span>}
                    {ef.type === 'statBonus' && (
                      <span className="text-violet-400">★ +{ef.value} {ef.stat?.toUpperCase()} (passivo)</span>
                    )}
                    {ef.type === 'attributeBonus' && (
                      <span className="text-amber-400">⬆ +{ef.value} em {ef.attribute} (passivo)</span>
                    )}
                    {ef.type === 'custom' && <span className="text-gray-400">{ef.description}</span>}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default function Inventory() {
  const inventory = useCharacterStore((s) => s.character.inventory)
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">
          ◈ Inventário
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-full border border-gray-300 dark:border-gray-700 px-3 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 transition hover:border-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          + Adicionar Item
        </button>
      </div>

      {inventory.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-600">
          Inventário vazio.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {inventory.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {showModal && <AddItemModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
