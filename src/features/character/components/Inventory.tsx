import { useState } from 'react'
import { useCharacterStore } from '../store/characterStore'
import { ALL_SKILLS } from '../../../data/skills'
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
  const toggleEquipped = useCharacterStore((s) => s.toggleEquipped)
  const toggleBroken = useCharacterStore((s) => s.toggleBroken)
  const [expanded, setExpanded] = useState(false)
  const [usingItem, setUsingItem] = useState(false)
  const [editing, setEditing] = useState(false)

  const style = TYPE_STYLE[item.type]
  const isEquippable = item.type === 'weapon' || item.type === 'armor'
  const isConsumable = item.type === 'potion-vida' || item.type === 'potion-iep'
  const hasActiveEffects = item.effects.some((e) => e.type === 'heal' || e.type === 'restoreIep')
  const isBroken = isEquippable && item.broken === true

  return (
    <>
      {usingItem && <UseItemModal item={item} onClose={() => setUsingItem(false)} />}
      {editing && <AddItemModal existing={item} onClose={() => setEditing(false)} />}

      <div className={`rounded-xl border overflow-hidden ${
        isBroken
          ? 'border-gray-500/50 bg-gray-100/40 dark:bg-gray-900/40 opacity-75'
          : isEquippable && item.equipped
            ? 'border-amber-400/60 dark:border-amber-600/50 bg-amber-50/60 dark:bg-amber-950/20'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60'
      }`}>
        <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
          <span className="text-lg" title={item.type}>{style.icon}</span>
          <span className="flex-1 font-semibold text-gray-900 dark:text-white text-sm truncate">
            {item.name}
            {isBroken && (
              <span className="ml-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 border border-gray-400/50 rounded px-1">
                QUEBRADO
              </span>
            )}
          </span>

          {/* Weight badge */}
          {(item.weight ?? 0) > 0 && (
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5" title="Peso">
              ⚖ {item.weight}
            </span>
          )}

          {/* Weapon threat badge */}
          {item.type === 'weapon' && item.threat && (
            <span className="text-[10px] font-bold text-orange-400 border border-orange-700/40 rounded px-1.5 py-0.5" title="Ameaça (Crítico)">
              ⚡ {item.threat}
            </span>
          )}

          {/* Equip toggle for weapons/armor */}
          {isEquippable && (
            <button
              onClick={() => toggleEquipped(item.id)}
              title={item.equipped ? 'Desequipar' : 'Equipar'}
              className={`rounded px-2 py-0.5 text-xs font-bold transition border ${
                item.equipped
                  ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                  : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-amber-400 hover:text-amber-500'
              }`}
            >
              {item.equipped ? '✦ Equipado' : '◇ Equipar'}
            </button>
          )}

          {/* Broken toggle for weapons/armor */}
          {isEquippable && (
            <button
              onClick={() => toggleBroken(item.id)}
              title={item.broken ? 'Marcar como intacto' : 'Marcar como quebrado'}
              className={`rounded px-2 py-0.5 text-xs font-bold transition border ${
                item.broken
                  ? 'border-gray-500 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {item.broken ? '🔨 Quebrado' : '🔨'}
            </button>
          )}

          {/* Quantity controls for non-equippable */}
          {!isEquippable && (
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
          )}

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
            onClick={() => setEditing(true)}
            className="text-xs text-gray-400 dark:text-gray-500 transition hover:text-amber-400"
            title="Editar item"
          >
            ✎
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
                    {ef.type === 'skillBonus' && (
                      <span className="text-sky-400">⬡ +{ef.value} em {ALL_SKILLS.find((s) => s.id === ef.skillId)?.name ?? ef.skillId} (passivo)</span>
                    )}
                    {ef.type === 'skillUnlock' && (
                      <span className="text-sky-400">⬡ Desbloqueia {ALL_SKILLS.find((s) => s.id === ef.skillId)?.name ?? ef.skillId} (passivo)</span>
                    )}
                    {ef.type === 'custom' && <span className="text-gray-400">{ef.description}</span>}
                  </p>
                ))}
              </div>
            )}
            {isBroken && (
              <p className="text-xs text-gray-500 italic">⚠ Item quebrado — bônus passivos desativados.</p>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default function Inventory() {
  const character = useCharacterStore((s) => s.character)
  const inventory = character.inventory
  const [showModal, setShowModal] = useState(false)

  // Effective Might = base + attributeBonus('might') from active non-broken items.
  // Calculated once here so it is never double-counted.
  const baseMight = character.attributes.might
  const mightBonus = (inventory ?? [])
    .filter((it) =>
      it.type === 'weapon' || it.type === 'armor'
        ? it.equipped === true && !it.broken
        : it.quantity > 0,
    )
    .flatMap((it) => it.effects)
    .filter((ef) => ef.type === 'attributeBonus' && ef.attribute === 'might')
    .reduce((sum, ef) => sum + (ef.value ?? 0), 0)
  const effectiveMight = baseMight + mightBonus
  const carryCapacity = 10 + effectiveMight
  const totalWeight = inventory.reduce((sum, item) => sum + (item.weight ?? 0) * item.quantity, 0)
  const isOverencumbered = totalWeight > carryCapacity
  const hasWeight = inventory.some((it) => (it.weight ?? 0) > 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">
          ◈ Inventário
        </h2>
        <div className="flex items-center gap-3">
          {hasWeight && (
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
              isOverencumbered
                ? 'border-red-500/60 bg-red-100/60 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
            }`}>
              <span>{totalWeight} / {carryCapacity}</span>
              {isOverencumbered && <span className="text-[10px] font-bold uppercase tracking-wide">Sobrecarregado</span>}
            </div>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="rounded-full border border-gray-300 dark:border-gray-700 px-3 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 transition hover:border-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            + Adicionar Item
          </button>
        </div>
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
