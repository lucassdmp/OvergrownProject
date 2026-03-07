import { useState } from 'react'
import { useCharacterStore } from '../store/characterStore'
import { ALL_SKILLS } from '../../../data/skills'
import { ALL_ORIGINS } from '../../../data/origins'
import type { MasteryLevel } from '../../../types/game'
import { MASTERY_LABELS, MASTERY_BONUS } from '../../../types/game'
import {
  getMasteryCapForDivinity,
  getSkillBudget,
  getSkillCost,
  getSkillPointsSpent,
  getItemSkillEffects,
} from '../../../lib/skillUtils'

const MASTERY_LEVELS: MasteryLevel[] = [0, 1, 2, 3, 4]

const MASTERY_DIV_REQ: Record<MasteryLevel, string | null> = {
  0: null, 1: null, 2: null, 3: 'Div. 20', 4: 'Div. 40',
}

function SkillRow({
  name,
  description,
  requiresTraining,
  mastery,
  isOriginSkill,
  itemBonus,
  itemUnlocked,
  maxMastery,
  budgetForSkill,
  onChange,
}: {
  name: string
  description: string
  requiresTraining: boolean
  mastery: MasteryLevel
  isOriginSkill: boolean
  itemBonus: number
  itemUnlocked: boolean
  maxMastery: MasteryLevel
  budgetForSkill: number
  onChange: (m: MasteryLevel) => void
}) {
  const effectiveMastery = Math.max(
    mastery,
    isOriginSkill ? 1 : 0,
    itemUnlocked ? 1 : 0,
  ) as MasteryLevel
  const trained = effectiveMastery > 0
  const displayBonus = MASTERY_BONUS[effectiveMastery] + itemBonus

  function isButtonDisabled(lvl: MasteryLevel): boolean {
    if (lvl === 0 && (isOriginSkill || itemUnlocked)) return true
    if (lvl > maxMastery) return true
    return getSkillCost(lvl, isOriginSkill) > budgetForSkill
  }

  const borderClass = isOriginSkill
    ? 'bg-violet-50 dark:bg-violet-900/15 border border-violet-200 dark:border-violet-800/40'
    : itemUnlocked
    ? 'bg-sky-50 dark:bg-sky-900/15 border border-sky-200 dark:border-sky-800/40'
    : trained
    ? 'bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40'
    : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800'

  return (
    <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition ${borderClass}`} title={description}>
      {/* Mastery buttons */}
      <div className="flex shrink-0 gap-px">
        {MASTERY_LEVELS.map((lvl) => {
          const disabled = isButtonDisabled(lvl)
          const isActive = effectiveMastery === lvl
          const isFreeLocked = isActive && mastery < lvl
          return (
            <button
              key={lvl}
              onClick={() => !disabled && onChange(lvl)}
              disabled={disabled}
              title={lvl > maxMastery && MASTERY_DIV_REQ[lvl] ? `Requer ${MASTERY_DIV_REQ[lvl]}` : undefined}
              className={`h-5 min-w-[18px] px-1 rounded text-[10px] font-bold transition ${
                isActive
                  ? isFreeLocked
                    ? isOriginSkill
                      ? 'bg-violet-600 dark:bg-violet-500 text-white'
                      : 'bg-sky-600 dark:bg-sky-500 text-white'
                    : 'bg-amber-600 dark:bg-amber-500 text-white'
                  : disabled
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-700 cursor-not-allowed'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {MASTERY_LABELS[lvl]}
            </button>
          )
        })}
      </div>

      {/* Name */}
      <span className={`flex-1 truncate text-sm ${trained ? 'font-semibold text-gray-900 dark:text-white' : 'font-normal text-gray-500 dark:text-gray-500'}`}>
        {name}
        {requiresTraining && (
          <span className="ml-0.5 text-[9px] font-bold text-rose-500 dark:text-rose-400 align-super">✦</span>
        )}
        {isOriginSkill && (
          <span className="ml-1 rounded bg-violet-100 dark:bg-violet-900/40 px-1 py-px text-[9px] font-bold text-violet-600 dark:text-violet-400">★ Origem</span>
        )}
        {itemUnlocked && !isOriginSkill && (
          <span className="ml-1 rounded bg-sky-100 dark:bg-sky-900/40 px-1 py-px text-[9px] font-bold text-sky-600 dark:text-sky-400">⬡ Item</span>
        )}
      </span>

      {/* Bonus badge */}
      <div className="shrink-0 flex items-center gap-1">
        {itemBonus > 0 && (
          <span className="rounded bg-sky-100 dark:bg-sky-900/30 px-1 py-px text-[9px] font-bold text-sky-600 dark:text-sky-400">+{itemBonus}⬡</span>
        )}
        <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
          isOriginSkill && effectiveMastery === 1 && mastery === 0
            ? 'bg-violet-600 dark:bg-violet-500 text-white'
            : itemUnlocked && effectiveMastery === 1 && mastery === 0
            ? 'bg-sky-600 dark:bg-sky-500 text-white'
            : trained
            ? 'bg-amber-600 dark:bg-amber-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
        }`}>
          {trained ? `+${displayBonus}` : '—'}
        </span>
      </div>
    </div>
  )
}

export default function SkillList() {
  const character = useCharacterStore((s) => s.character)
  const setSkillMastery = useCharacterStore((s) => s.setSkillMastery)
  const [search, setSearch] = useState('')

  const skills = character.skills ?? {}
  const divinity = character.divinity
  const originSkillId = ALL_ORIGINS.find((o) => o.id === character.origin)?.skillId ?? null

  const maxMastery = getMasteryCapForDivinity(divinity)
  const budget = getSkillBudget(divinity)
  const spent = getSkillPointsSpent(skills, originSkillId)
  const { bonuses: itemBonuses, unlocked: itemUnlocked } = getItemSkillEffects(character)

  const trainedCount = ALL_SKILLS.filter(
    (sk) => (skills[sk.id] ?? 0) > 0 || sk.id === originSkillId || itemUnlocked.has(sk.id),
  ).length

  const filtered = search.trim()
    ? ALL_SKILLS.filter((sk) => sk.name.toLowerCase().includes(search.toLowerCase()))
    : ALL_SKILLS

  const budgetOver = spent > budget
  const budgetPct = Math.min(100, budget > 0 ? (spent / budget) * 100 : 0)

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-wide">Perícias</h2>
        <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          {trainedCount} treinadas
        </span>
        <div className="ml-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar perícia…"
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:border-amber-500 focus:outline-none w-40"
          />
        </div>
      </div>

      {/* Budget bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-gray-600 dark:text-gray-400">Pontos de Perícia</span>
          <span className={`font-bold tabular-nums ${budgetOver ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {spent} / {budget}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${budgetOver ? 'bg-red-500' : 'bg-amber-500'}`}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
        {budgetOver && (
          <p className="text-[10px] text-red-500 dark:text-red-400">Excedendo o limite — remova perícias ou aumente a Divindade.</p>
        )}
        <p className="text-[10px] text-gray-400 dark:text-gray-600">
          A cada 5 Divindades: +2 novas perícias (I) ou +1 nível em uma existente.
          Maestria III requer Div.&nbsp;20 · IV requer Div.&nbsp;40.
        </p>
      </div>

      {/* Legend */}
      <p className="text-[10px] text-gray-400 dark:text-gray-600">
        <span className="font-bold text-rose-500 dark:text-rose-400 align-super text-[8px]">✦</span> Requer treinamento formal.&ensp;
        Cinza escuro = bloqueado pela Divindade.&ensp;
        <span className="text-sky-500">⬡</span> = bônus de item.
      </p>

      {/* Two-column grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-600 italic">Nenhuma perícia encontrada.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {filtered.map((sk) => {
            const isOriginSkill = sk.id === originSkillId
            const currentMastery = (skills[sk.id] ?? 0) as MasteryLevel
            const spentOnOthers = spent - getSkillCost(currentMastery, isOriginSkill)
            return (
              <SkillRow
                key={sk.id}
                name={sk.name}
                description={sk.description}
                requiresTraining={sk.requiresTraining}
                mastery={currentMastery}
                isOriginSkill={isOriginSkill}
                itemBonus={itemBonuses[sk.id] ?? 0}
                itemUnlocked={itemUnlocked.has(sk.id)}
                maxMastery={maxMastery}
                budgetForSkill={budget - spentOnOthers}
                onChange={(m) => setSkillMastery(sk.id, m)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
