import { useState } from 'react'
import Modal from '../../../../components/ui/Modal'
import type { InventoryItem } from '../../../../types/game'
import { useCharacterStore } from '../../store/characterStore'

interface Props {
  item: InventoryItem
  onClose: () => void
}

export default function UseItemModal({ item, onClose }: Props) {
  const useItemWithValues = useCharacterStore((s) => s.useItemWithValues)

  // Collect the heal/restoreIep effects
  const healEffect = item.effects.find((e) => e.type === 'heal')
  const iepEffect = item.effects.find((e) => e.type === 'restoreIep')

  const [vidaRoll, setVidaRoll] = useState<string>(healEffect?.value != null ? String(healEffect.value) : '')
  const [iepRoll, setIepRoll] = useState<string>(iepEffect?.value != null ? String(iepEffect.value) : '')

  function handleConfirm() {
    const values: { vida?: number; iep?: number } = {}
    if (healEffect) values.vida = Math.max(0, Number(vidaRoll) || 0)
    if (iepEffect) values.iep = Math.max(0, Number(iepRoll) || 0)
    useItemWithValues(item.id, values)
    onClose()
  }

  const inputClass =
    'w-full rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-sm text-white focus:border-amber-600 focus:outline-none text-center font-bold tabular-nums'

  return (
    <Modal title={`Usar: ${item.name}`} onClose={onClose} size="md">
      <p className="mb-4 text-sm text-gray-400">
        Insira o resultado do rolamento para cada efeito da poção.
      </p>

      <div className="flex flex-col gap-4">
        {healEffect && (
          <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-3">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-rose-400">
              ❤ Pontos de Vida Recuperados
            </label>
            {healEffect.value != null && (
              <p className="mb-2 text-xs text-gray-500">
                Sugestão: <span className="text-rose-300 font-semibold">{healEffect.value}</span>
              </p>
            )}
            <input
              type="number"
              min={0}
              value={vidaRoll}
              onChange={(e) => setVidaRoll(e.target.value)}
              placeholder="0"
              className={inputClass}
              autoFocus
            />
          </div>
        )}

        {iepEffect && (
          <div className="rounded-lg border border-sky-900/40 bg-sky-950/20 p-3">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-sky-400">
              ✦ IEP Recuperado
            </label>
            {iepEffect.value != null && (
              <p className="mb-2 text-xs text-gray-500">
                Sugestão: <span className="text-sky-300 font-semibold">{iepEffect.value}</span>
              </p>
            )}
            <input
              type="number"
              min={0}
              value={iepRoll}
              onChange={(e) => setIepRoll(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-700 px-4 py-1.5 text-sm font-semibold text-gray-400 transition hover:border-gray-500 hover:text-white"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          className="rounded-lg bg-emerald-800 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Confirmar
        </button>
      </div>
    </Modal>
  )
}
