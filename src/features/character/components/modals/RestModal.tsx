import { useState } from 'react'
import Modal from '../../../../components/ui/Modal'
import { calculateAttributeModifiers } from '../../../../config/gameConfig'
import { getMeal, MEAL_QUALITIES, rollDice, rollDie, sumRolls, type MealQuality } from '../../../../lib/restRules'
import { useCharacterStore } from '../../store/characterStore'

type RestKind = 'short' | 'full'
type ShortActivity = 'folego' | 'meditar' | 'vigilia'

interface ShortResult {
  pc: number[]
  iep: number[]
  d8: [number, number] | null
  meal: number
}

export default function RestModal({ onClose }: { onClose: () => void }) {
  const character = useCharacterStore((s) => s.character)
  const applyShortRest = useCharacterStore((s) => s.applyShortRest)
  const applyFullRest = useCharacterStore((s) => s.applyFullRest)
  const [kind, setKind] = useState<RestKind>('short')
  const [activity, setActivity] = useState<ShortActivity>('folego')
  const [mealQuality, setMealQuality] = useState<MealQuality>('none')
  const [shortResult, setShortResult] = useState<ShortResult | null>(null)
  const [fullResult, setFullResult] = useState<number[] | null>(null)
  const [hpGetsFirst, setHpGetsFirst] = useState(true)

  const senseMod = calculateAttributeModifiers(character.attributes).sense
  const meal = getMeal(mealQuality)
  const shortAvailable = character.shortRestsUsed < 2

  function resetResults() {
    setShortResult(null)
    setFullResult(null)
  }

  function rollShortRest() {
    if (!shortAvailable) return
    if (activity === 'vigilia') {
      setShortResult({ pc: [], iep: [], d8: null, meal: 0 })
      return
    }
    setShortResult({
      pc: rollDice(senseMod, 4),
      iep: activity === 'meditar' ? rollDice(senseMod, 6) : [],
      d8: activity === 'folego' ? [rollDie(8), rollDie(8)] : null,
      meal: meal.shortDie ? rollDie(meal.shortDie) : 0,
    })
  }

  function rollFullRest() {
    const dice = meal.fullDice
    setFullResult(dice ? rollDice(dice.count, dice.die) : [])
  }

  function confirmShortRest() {
    if (!shortResult) return
    if (activity === 'vigilia') {
      applyShortRest({ vida: 0, iep: 0, pc: 0 })
      onClose()
      return
    }

    const pc = sumRolls(shortResult.pc)
    if (activity === 'meditar') {
      applyShortRest({ vida: 0, iep: sumRolls(shortResult.iep) + shortResult.meal, pc })
    } else {
      const [first, second] = shortResult.d8 ?? [0, 0]
      applyShortRest({
        vida: (hpGetsFirst ? first : second) + shortResult.meal,
        iep: (hpGetsFirst ? second : first) + shortResult.meal,
        pc,
      })
    }
    onClose()
  }

  function confirmFullRest() {
    if (!fullResult) return
    const temporary = sumRolls(fullResult)
    applyFullRest({ vida: temporary, iep: temporary })
    onClose()
  }

  const tabClass = (active: boolean) =>
    `flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
      active
        ? 'border-amber-500 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
        : 'border-gray-300 text-gray-600 hover:border-gray-500 dark:border-gray-700 dark:text-gray-400'
    }`

  return (
    <Modal title="Descansar" onClose={onClose} size="lg">
      <div className="flex flex-col gap-5 text-gray-800 dark:text-gray-200">
        <div className="flex gap-2">
          <button className={tabClass(kind === 'short')} onClick={() => { setKind('short'); resetResults() }}>
            Pausa Breve, 30 min
          </button>
          <button className={tabClass(kind === 'full')} onClick={() => { setKind('full'); resetResults() }}>
            Descanso Pleno, 8 h
          </button>
        </div>

        {kind === 'short' ? (
          <>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-950/50">
              <div className="flex items-center justify-between gap-3">
                <span>Pausas usadas desde o último Descanso Pleno</span>
                <strong className={shortAvailable ? 'text-amber-700 dark:text-amber-300' : 'text-red-600 dark:text-red-400'}>{character.shortRestsUsed}/2</strong>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">MOD de SEN {senseMod}: recupera {senseMod}D4 PC.</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Atividade</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  ['folego', 'Recuperar o fôlego', '2D8 para HP e IEP'],
                  ['meditar', 'Meditar', `${senseMod}D6 de IEP`],
                  ['vigilia', 'Ficar de Vigília', 'Sem recuperação'],
                ] as const).map(([id, label, detail]) => (
                  <button
                    key={id}
                    onClick={() => { setActivity(id); resetResults() }}
                    className={tabClass(activity === id)}
                  >
                    <span className="block">{label}</span>
                    <span className="block text-[10px] font-normal text-gray-500">{detail}</span>
                  </button>
                ))}
              </div>
            </div>

            {activity !== 'vigilia' && (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Refeição</label>
                <select
                  value={mealQuality}
                  onChange={(event) => { setMealQuality(event.target.value as MealQuality); resetResults() }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  {MEAL_QUALITIES.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}{entry.shortDie ? `, +1D${entry.shortDie} (DT ${entry.difficulty})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!shortResult ? (
              <button
                onClick={rollShortRest}
                disabled={!shortAvailable}
                className="rounded-lg bg-amber-700 px-4 py-2 font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {activity === 'vigilia' ? 'Confirmar Vigília' : 'Rolar recuperação'}
              </button>
            ) : (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                {activity === 'vigilia' ? (
                  <p className="text-sm">Esta pausa será consumida sem recuperar HP, IEP ou PC.</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <p><strong>PC:</strong> {shortResult.pc.length ? shortResult.pc.join(' + ') : '0'} = {sumRolls(shortResult.pc)}</p>
                    {activity === 'meditar' && <p><strong>IEP:</strong> {shortResult.iep.length ? shortResult.iep.join(' + ') : '0'} = {sumRolls(shortResult.iep)}</p>}
                    {shortResult.d8 && (
                      <div>
                        <p className="mb-2"><strong>2D8:</strong> {shortResult.d8[0]} e {shortResult.d8[1]}</p>
                        <div className="flex gap-2">
                          <button className={tabClass(hpGetsFirst)} onClick={() => setHpGetsFirst(true)}>
                            HP +{shortResult.d8[0]} / IEP +{shortResult.d8[1]}
                          </button>
                          <button className={tabClass(!hpGetsFirst)} onClick={() => setHpGetsFirst(false)}>
                            HP +{shortResult.d8[1]} / IEP +{shortResult.d8[0]}
                          </button>
                        </div>
                      </div>
                    )}
                    {shortResult.meal > 0 && <p><strong>Refeição:</strong> +{shortResult.meal} {activity === 'folego' ? 'em HP e IEP' : 'em IEP'}</p>}
                  </div>
                )}
                <button onClick={confirmShortRest} className="mt-4 w-full rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-600">
                  Aplicar Pausa Breve
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-950/50">
              Restaura todo o HP, IEP e PC, remove recursos temporários antigos e reinicia as Pausas Breves.
              <p className="mt-1 text-xs text-amber-400">O benefício de Descanso Pleno só pode ser recebido uma vez por Dia; o controle do Dia é narrativo.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Refeição preparada</label>
              <select
                value={mealQuality}
                onChange={(event) => { setMealQuality(event.target.value as MealQuality); resetResults() }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {MEAL_QUALITIES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}{entry.fullDice ? `, +${entry.fullDice.count > 1 ? entry.fullDice.count : ''}D${entry.fullDice.die} temporário (DT ${entry.difficulty})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {!fullResult ? (
              <button onClick={rollFullRest} className="rounded-lg bg-amber-700 px-4 py-2 font-bold text-white hover:bg-amber-600">
                {mealQuality === 'none' ? 'Confirmar descanso' : 'Rolar refeição'}
              </button>
            ) : (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
                <p><strong>HP e IEP temporários:</strong> {fullResult.length ? `${fullResult.join(' + ')} = ${sumRolls(fullResult)}` : '0'}</p>
                <button onClick={confirmFullRest} className="mt-4 w-full rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-600">
                  Aplicar Descanso Pleno
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
