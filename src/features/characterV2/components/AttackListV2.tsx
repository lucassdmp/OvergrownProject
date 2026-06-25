import { useCharacterV2Stats } from '../hooks/useCharacterV2Stats'
import type { WeaponBonusNodeData } from '../../../types/talentTree'
import { WEAPON_BONUS_TYPE_LABELS } from '../../../types/talentTree'
import { WEAPON_TAG_LABELS } from '../../../types/gameV2'

function WeaponBonusTag({ bonus }: { bonus: WeaponBonusNodeData }) {
  const label = WEAPON_BONUS_TYPE_LABELS[bonus.bonusType]
  const valStr = bonus.bonusType === 'threatRange' ? `-${bonus.value}` : `+${bonus.value}`
  const diceStr = bonus.dice ? `${bonus.dice}+` : ''
  const tags = bonus.requiredTags.map((t) => WEAPON_TAG_LABELS[t] ?? t).join(', ')
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40"
      title={`Aplicado quando arma tem tag: ${tags || 'qualquer'}`}
    >
      {label}: {diceStr}{valStr}
    </span>
  )
}

export default function AttackListV2() {
  const { unlockedAttacks, weaponBonuses } = useCharacterV2Stats()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
          Habilidades de Combate
        </h2>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">da Árvore de Talento</span>
      </div>

      {/* Weapon bonuses from tree */}
      {weaponBonuses.length > 0 && (
        <div className="rounded-lg border border-rose-100 dark:border-rose-900/30 bg-rose-50/40 dark:bg-rose-950/10 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 dark:text-rose-400 mb-1.5">
            Bônus Passivos de Arma
          </p>
          <div className="flex flex-wrap gap-1">
            {weaponBonuses.map((b, i) => <WeaponBonusTag key={i} bonus={b} />)}
          </div>
        </div>
      )}

      {unlockedAttacks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-600">
            Nenhuma habilidade desbloqueada ainda.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
            Adquira nós de Habilidade de Combate na Árvore de Talento.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {unlockedAttacks.map((attack, i) => (
            <div
              key={attack.skillId + i}
              className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-gray-900/60 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{attack.skillName}</p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                    PC: {attack.skillCost}
                  </p>
                </div>
              </div>
              {attack.skillDescription && (
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
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
