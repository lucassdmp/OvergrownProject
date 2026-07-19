import { useCharacterStats } from '../hooks/useCharacterStats'
import type { ExtraDamageNodeData, WeaponBonusNodeData } from '../../../types/talentTree'
import { WEAPON_BONUS_TYPE_LABELS, conditionalEffectSummary } from '../../../types/talentTree'
import { WEAPON_TAG_LABELS } from '../../../types/game'

function WeaponBonusTag({ bonus }: { bonus: WeaponBonusNodeData }) {
  const label = WEAPON_BONUS_TYPE_LABELS[bonus.bonusType]
  const valStr = bonus.bonusType === 'threatRange' ? `-${bonus.value}` : `+${bonus.value}`
  const diceStr = bonus.dice ? `${bonus.dice}+` : ''
  const tags = bonus.requiredTags.map((t) => WEAPON_TAG_LABELS[t] ?? t).join(', ')
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:border-rose-800/40 dark:bg-rose-900/40 dark:text-rose-300"
      title={`Aplicado quando arma tem tag: ${tags || 'qualquer'}`}
    >
      {label}: {diceStr}
      {valStr}
    </span>
  )
}

function ExtraDamageTag({ bonus }: { bonus: ExtraDamageNodeData }) {
  const amount = [bonus.dice, bonus.flat ? `+${bonus.flat}` : null].filter(Boolean).join(' ') || '—'
  return (
    <span className="inline-flex rounded border border-orange-800/40 bg-orange-950/20 px-1.5 py-0.5 text-[10px] font-bold text-orange-300">
      +{amount} · {bonus.attackTargets.join(', ') || 'todos os ataques'}
    </span>
  )
}

export default function AttackList() {
  const { unlockedAttacks, weaponBonuses, extraDamageBonuses, defenseBonuses, conditionalNodes } =
    useCharacterStats()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-wider text-gray-700 uppercase dark:text-gray-200">
          Habilidades de Combate
        </h2>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">da Árvore de Talento</span>
      </div>

      {/* Weapon bonuses from tree */}
      {weaponBonuses.length > 0 && (
        <div className="rounded-lg border border-rose-100 bg-rose-50/40 px-3 py-2 dark:border-rose-900/30 dark:bg-rose-950/10">
          <p className="mb-1.5 text-[10px] font-bold tracking-widest text-rose-500 uppercase dark:text-rose-400">
            Bônus Passivos de Arma
          </p>
          <div className="flex flex-wrap gap-1">
            {weaponBonuses.map((b, i) => (
              <WeaponBonusTag key={i} bonus={b} />
            ))}
          </div>
        </div>
      )}

      {(extraDamageBonuses.length > 0 ||
        defenseBonuses.length > 0 ||
        conditionalNodes.length > 0) && (
        <div className="rounded-lg border border-orange-900/30 bg-orange-950/10 px-3 py-2">
          <p className="mb-1.5 text-[10px] font-bold tracking-widest text-orange-400 uppercase">
            Passivos de Combate
          </p>
          {extraDamageBonuses.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {extraDamageBonuses.map((bonus, index) => (
                <ExtraDamageTag key={index} bonus={bonus} />
              ))}
            </div>
          )}
          {defenseBonuses.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {defenseBonuses.map((bonus, index) => (
                <span
                  key={index}
                  className="rounded border border-sky-800/40 bg-sky-950/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300"
                >
                  RD {bonus.damageType}: +{bonus.value}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-1">
            {conditionalNodes.map(({ data, active }, index) => (
              <div
                key={`${data.name}-${index}`}
                className={`rounded border px-2 py-1.5 text-[10px] ${
                  active
                    ? 'border-amber-700/40 bg-amber-950/20 text-amber-200'
                    : 'border-gray-700 bg-gray-900/40 text-gray-500'
                }`}
              >
                <p className="font-bold">
                  {active ? '●' : '○'} {data.name}
                </p>
                {data.description && <p className="mt-0.5">{data.description}</p>}
                <p className="mt-0.5">{data.effects.map(conditionalEffectSummary).join(' · ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {unlockedAttacks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
          <p className="text-sm text-gray-400 dark:text-gray-600">
            Nenhuma habilidade desbloqueada ainda.
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
            Adquira nós de Habilidade de Combate na Árvore de Talento.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {unlockedAttacks.map((attack, i) => (
            <div
              key={attack.skillId + i}
              className="rounded-xl border border-rose-200 bg-white px-3 py-2.5 dark:border-rose-900/40 dark:bg-gray-900/60"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {attack.skillName}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    PC: {attack.skillCost}
                  </p>
                  {attack.skillRequirement && (
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      <strong>Requisito:</strong> {attack.skillRequirement}
                    </p>
                  )}
                  {attack.skillAction && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      <strong>Ação:</strong> {attack.skillAction}
                    </p>
                  )}
                </div>
              </div>
              {attack.skillDescription && (
                <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                  {attack.skillDescription}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
