import { useState } from 'react'
import Modal from '../../../../components/ui/Modal'
import type { InventoryItem, ItemEffect, ItemType, AttributeName } from '../../../../types/game'
import { ATTRIBUTE_LABELS } from '../../../../types/game'
import type { DerivedStats } from '../../../../types/game'
import { useCharacterStore } from '../../store/characterStore'

const STAT_LABELS: Record<keyof DerivedStats, string> = {
  vida: 'Vida',
  iep: 'IEP',
  pc: 'Pontos de Combate',
  resistencia: 'Resistência',
  esquiva: 'Esquiva',
}

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  weapon: '⚔ Arma',
  armor: '🛡 Armadura',
  'potion-vida': '🧪 Poção de Vida',
  'potion-iep': '🔮 Poção de IEP',
  misc: '◆ Misc',
}

const PRESETS: { label: string; type: ItemType; effects: ItemEffect[]; description: string }[] = [
  {
    label: 'Poção de Vida Pequena',
    type: 'potion-vida',
    description: 'Restaura uma pequena quantidade de pontos de vida.',
    effects: [{ type: 'heal', value: 20 }],
  },
  {
    label: 'Poção de Vida Grande',
    type: 'potion-vida',
    description: 'Restaura uma grande quantidade de pontos de vida.',
    effects: [{ type: 'heal', value: 50 }],
  },
  {
    label: 'Poção de IEP Pequena',
    type: 'potion-iep',
    description: 'Restaura uma pequena quantidade de IEP.',
    effects: [{ type: 'restoreIep', value: 15 }],
  },
  {
    label: 'Poção de IEP Grande',
    type: 'potion-iep',
    description: 'Restaura uma grande quantidade de IEP.',
    effects: [{ type: 'restoreIep', value: 35 }],
  },
]

interface Props {
  onClose: () => void
}

export default function AddItemModal({ onClose }: Props) {
  const addItem = useCharacterStore((s) => s.addItem)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [type, setType] = useState<ItemType>('misc')
  const [effects, setEffects] = useState<ItemEffect[]>([])

  function applyPreset(preset: (typeof PRESETS)[0]) {
    setName(preset.label)
    setDescription(preset.description)
    setType(preset.type)
    setEffects(preset.effects)
  }

  function addEffect() {
    setEffects((prev) => [...prev, { type: 'custom', description: '' }])
  }

  function updateEffect(i: number, patch: Partial<ItemEffect>) {
    setEffects((prev) => prev.map((ef, idx) => (idx === i ? { ...ef, ...patch } : ef)))
  }

  function removeEffect(i: number) {
    setEffects((prev) => prev.filter((_, idx) => idx !== i))
  }

  function handleSave() {
    if (!name.trim()) return
    const item: InventoryItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      quantity,
      type,
      effects,
    }
    addItem(item)
    onClose()
  }

  const inputClass =
    'w-full rounded bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white focus:border-amber-600 focus:outline-none'

  return (
    <Modal title="Adicionar Item" onClose={onClose} size="lg">
      {/* Presets */}
      <div className="mb-4">
        <p className="mb-2 text-xs text-gray-500">Presets rápidos</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="rounded-full border border-gray-700 bg-gray-800 px-3 py-0.5 text-xs text-gray-300 transition hover:border-amber-600 hover:text-amber-400"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-400">Nome *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do item" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ItemType)}
              className={inputClass}
            >
              {(Object.keys(ITEM_TYPE_LABELS) as ItemType[]).map((t) => (
                <option key={t} value={t}>
                  {ITEM_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Quantidade</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-400">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Effects */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs text-gray-400">Efeitos</label>
            <button
              onClick={addEffect}
              className="text-xs text-amber-500 transition hover:text-amber-400"
            >
              + Adicionar efeito
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {effects.map((ef, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-gray-800 p-2">
                <select
                  value={ef.type}
                  onChange={(e) => {
                    const newType = e.target.value as ItemEffect['type']
                    const patch: Partial<ItemEffect> = { type: newType }
                    if (newType === 'statBonus') patch.stat = (ef.stat ?? 'vida')
                    if (newType === 'attributeBonus') patch.attribute = (ef.attribute ?? 'might')
                    updateEffect(i, patch)
                  }}
                  className="rounded bg-gray-700 border border-gray-600 px-1.5 py-1 text-xs text-gray-200 focus:outline-none"
                >
                  <option value="heal">Curar Vida</option>
                  <option value="restoreIep">Restaurar IEP</option>
                  <option value="statBonus">★ Bônus de Stat (passivo)</option>
                  <option value="attributeBonus">⬆ Bônus de Atributo (passivo)</option>
                  <option value="custom">Personalizado</option>
                </select>

                {(ef.type === 'heal' || ef.type === 'restoreIep') && (
                  <input
                    type="number"
                    value={ef.value ?? ''}
                    onChange={(e) => updateEffect(i, { value: Number(e.target.value) })}
                    placeholder="Valor"
                    className="w-20 rounded bg-gray-700 border border-gray-600 px-1.5 py-1 text-xs text-white focus:outline-none"
                  />
                )}

                {ef.type === 'statBonus' && (
                  <>
                    <select
                      value={ef.stat ?? 'vida'}
                      onChange={(e) => updateEffect(i, { stat: e.target.value as keyof DerivedStats })}
                      className="rounded bg-gray-700 border border-gray-600 px-1.5 py-1 text-xs text-gray-200 focus:outline-none"
                    >
                      {(Object.keys(STAT_LABELS) as (keyof DerivedStats)[]).map((s) => (
                        <option key={s} value={s}>{STAT_LABELS[s]}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={ef.value ?? ''}
                      onChange={(e) => updateEffect(i, { value: Number(e.target.value) })}
                      placeholder="+Valor"
                      className="w-16 rounded bg-gray-700 border border-gray-600 px-1.5 py-1 text-xs text-white focus:outline-none"
                    />
                  </>
                )}

                {ef.type === 'attributeBonus' && (
                  <>
                    <select
                      value={ef.attribute ?? 'might'}
                      onChange={(e) => updateEffect(i, { attribute: e.target.value as AttributeName })}
                      className="rounded bg-gray-700 border border-gray-600 px-1.5 py-1 text-xs text-gray-200 focus:outline-none"
                    >
                      {(Object.keys(ATTRIBUTE_LABELS) as AttributeName[]).map((a) => (
                        <option key={a} value={a}>{ATTRIBUTE_LABELS[a]}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={ef.value ?? ''}
                      onChange={(e) => updateEffect(i, { value: Number(e.target.value) })}
                      placeholder="Bônus"
                      className="w-16 rounded bg-gray-700 border border-gray-600 px-1.5 py-1 text-xs text-white focus:outline-none"
                    />
                  </>
                )}

                <button
                  onClick={() => removeEffect(i)}
                  className="ml-auto text-gray-600 transition hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-700 px-4 py-1.5 text-sm font-semibold text-gray-400 transition hover:border-gray-500 hover:text-white"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="rounded-lg bg-amber-800 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40"
        >
          Adicionar
        </button>
      </div>
    </Modal>
  )
}
