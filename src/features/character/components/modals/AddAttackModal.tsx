import { useState } from 'react'
import Modal from '../../../../components/ui/Modal'
import type { CharacterAttack, CombatCategory } from '../../../../types/game'
import { useCharacterStore } from '../../store/characterStore'

interface Props {
  onClose: () => void
}

export default function AddAttackModal({ onClose }: Props) {
  const addAttack = useCharacterStore((s) => s.addAttack)

  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [damage, setDamage] = useState('')
  const [category, setCategory] = useState<CombatCategory>('melee')
  const [description, setDescription] = useState('')

  function handleSave() {
    if (!name.trim()) return
    const attack: CharacterAttack = {
      id: crypto.randomUUID(),
      name: name.trim(),
      cost: cost.trim(),
      damage: damage.trim() || undefined,
      category,
      description: description.trim(),
    }
    addAttack(attack)
    onClose()
  }

  const inputClass =
    'w-full rounded bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white focus:border-amber-600 focus:outline-none'

  return (
    <Modal title="Adicionar Ataque / Habilidade" onClose={onClose} size="md">
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-400">Nome *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Fúria" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Custo de PC</label>
            <input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="ex: 2" className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Dano (opcional)</label>
            <input
              value={damage}
              onChange={(e) => setDamage(e.target.value)}
              placeholder="ex: 1D8 + FOR"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-400">Categoria</label>
          <div className="flex gap-2">
            {(['melee', 'ranged', 'effort'] as CombatCategory[]).map((cat) => {
              const labels = { melee: 'Corpo a Corpo', ranged: 'Distância', effort: 'Esforço' }
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex-1 rounded py-1.5 text-xs font-semibold transition border ${
                    category === cat
                      ? 'border-amber-600 bg-amber-900/30 text-amber-300'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {labels[cat]}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-400">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Descreva o efeito do ataque ou habilidade..."
            className={`${inputClass} resize-none`}
          />
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
