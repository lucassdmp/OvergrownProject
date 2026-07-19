import { useRef, useState } from 'react'
import { useTalentTreeStore } from '../store/talentTreeStore'
import {
  NODE_TYPE_LABELS,
  NODE_TYPE_COLORS,
  BASE_ATTACK_TARGETS,
  BASE_ATTACK_TARGET_LABELS,
  WEAPON_BONUS_TYPE_LABELS,
  SPELL_MODIFIER_EFFECT_LABELS,
  defaultNodeData,
  defaultConditionalEffect,
  conditionalEffectSummary,
  talentNodeCost,
  CONDITIONAL_EFFECT_KIND_LABELS,
  type TalentNodeType,
  type TalentNodeData,
  type AttackTarget,
  type PlayerNodeData,
  type AttributeNodeData,
  type MagicNodeData,
  type StatNodeData,
  type CombatAbilityNodeData,
  type ExtraDamageNodeData,
  type HealingNodeData,
  type WeaponBonusNodeData,
  type WeaponBonusType,
  type SpellModifierNodeData,
  type SpellModifierEffectType,
  type DefenseBonusNodeData,
  type SkillBonusNodeData,
  type LinkNodeData,
  type ConditionalNodeData,
  type ConditionalEffect,
} from '../../../types/talentTree'
import type {
  AttributeName,
  DerivedStats,
  ElementId,
  MagicTypeId,
  SpellLevelEntry,
  CombatCategory,
} from '../../../types/game'
import ImageCropModal from '../../../components/ui/ImageCropModal'
import { optimizeEmbeddedImage } from '../../../utils/image'
import { SPELL_LEVEL_LABELS } from '../../../types/game'
import { ELEMENTS } from '../../../data/elements'
import { MAGIC_TYPES } from '../../../data/magicTypes'
import { ALL_COMBAT_SKILLS, combatSkillDependencyRequirement } from '../../../data/combatSkills'
import { ALL_SKILLS } from '../../../data/skills'
import {
  WEAPON_TAG_LABELS,
  WEAPON_TAGS_MELEE,
  WEAPON_TAGS_RANGED,
  WEAPON_TAGS_CATEGORY,
  ARMOR_TAG_LABELS,
  ARMOR_TAGS_SPECIFIC,
  ARMOR_TAGS_CATEGORY,
  type WeaponTag,
  type ArmorTag,
} from '../../../types/game'

// ─────────────────────────────────────────────────────────────────────────────

const ATTR_OPTIONS: { value: AttributeName; label: string }[] = [
  { value: 'might', label: 'Might' },
  { value: 'grace', label: 'Grace' },
  { value: 'wisdom', label: 'Wisdom' },
  { value: 'sense', label: 'Sense' },
  { value: 'fortitude', label: 'Fortitude' },
]

const STAT_OPTIONS: { value: keyof DerivedStats; label: string }[] = [
  { value: 'vida', label: 'Vida' },
  { value: 'iep', label: 'IEP' },
  { value: 'pc', label: 'Pontos de Combate' },
  { value: 'resistencia', label: 'Resistência' },
  { value: 'esquiva', label: 'Esquiva' },
]

const NODE_TYPES: TalentNodeType[] = [
  'player',
  'attribute',
  'magic',
  'stat',
  'combatAbility',
  'extraDamage',
  'healing',
  'weaponBonus',
  'spellModifier',
  'defenseBonus',
  'skillBonus',
  'link',
  'conditional',
]

const NODE_TYPES_EXTRA: TalentNodeType[] = [
  'weaponBonus',
  'spellModifier',
  'defenseBonus',
  'skillBonus',
  'link',
  'conditional',
]

// ── Primitive field components ────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-0.5 block text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
      {children}
    </label>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
    />
  )
}

function NumberInput({
  value,
  onChange,
  min = 1,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
}) {
  return (
    <input
      type="number"
      value={value ?? ''}
      min={min}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
    />
  )
}

function TextArea({
  value,
  onChange,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
    />
  )
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// ── Sub-editors ────────────────────────────────────────────────────────────────

function PlayerEditor({
  data,
  onChange,
}: {
  data: PlayerNodeData
  onChange: (d: PlayerNodeData) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Nome</Label>
        <TextInput
          value={data.name}
          onChange={(v) => onChange({ ...data, name: v })}
          placeholder="Jogador"
        />
      </div>
      <div>
        <Label>Descrição</Label>
        <TextArea
          value={data.description}
          onChange={(v) => onChange({ ...data, description: v })}
        />
      </div>
      <p className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] text-blue-500 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-400">
        Este é um ponto de partida da árvore. Você pode criar vários nós de Jogador para permitir
        múltiplos inícios.
      </p>
    </div>
  )
}

function AttributeEditor({
  data,
  onChange,
}: {
  data: AttributeNodeData
  onChange: (d: AttributeNodeData) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Atributo</Label>
        <select
          value={data.attribute ?? ''}
          onChange={(e) =>
            onChange({ ...data, attribute: (e.target.value as AttributeName) || null })
          }
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">— Jogador escolhe —</option>
          {ATTR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {!data.attribute && (
          <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">
            O jogador escolherá o atributo ao pegar este nó na árvore.
          </p>
        )}
      </div>
      <div>
        <Label>Valor (+)</Label>
        <NumberInput value={data.value} onChange={(v) => onChange({ ...data, value: v })} />
      </div>
    </div>
  )
}

function SpellLevelRow({
  entry,
  onChange,
}: {
  entry: SpellLevelEntry
  onChange: (e: SpellLevelEntry) => void
}) {
  const label = SPELL_LEVEL_LABELS[entry.level]
  const isDivino = entry.level === 'divino'
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/60">
      <div className="flex items-center gap-1.5">
        <span
          className="flex h-6 w-8 shrink-0 items-center justify-center rounded text-[10px] font-bold"
          style={{
            background: isDivino ? '#6d28d9' : '#374151',
            color: isDivino ? '#fff' : '#d1d5db',
          }}
        >
          {isDivino ? 'Div' : `Nv${label}`}
        </span>
        <input
          type="text"
          placeholder="Custo (ex: 6 IEP)"
          value={entry.cost}
          onChange={(e) => onChange({ ...entry, cost: e.target.value })}
          className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>
      <input
        type="text"
        placeholder="Escalonamento (ex: 2D8 + WIS)"
        value={entry.scaling}
        onChange={(e) => onChange({ ...entry, scaling: e.target.value })}
        className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
      <input
        type="text"
        placeholder="Habilidade especial (opcional)"
        value={entry.special ?? ''}
        onChange={(e) => onChange({ ...entry, special: e.target.value || null })}
        className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
    </div>
  )
}

function MagicEditor({
  data,
  onChange,
}: {
  data: MagicNodeData
  onChange: (d: MagicNodeData) => void
}) {
  function toggleElement(id: ElementId) {
    const has = data.elements.includes(id)
    onChange({
      ...data,
      elements: has ? data.elements.filter((e) => e !== id) : [...data.elements, id],
    })
  }
  function toggleMagicType(id: MagicTypeId) {
    const has = data.magicTypes.includes(id)
    onChange({
      ...data,
      magicTypes: has ? data.magicTypes.filter((t) => t !== id) : [...data.magicTypes, id],
    })
  }
  function updateLevel(entry: SpellLevelEntry) {
    const next = data.levels.map((l) => (l.level === entry.level ? entry : l))
    onChange({ ...data, levels: next })
  }
  function addAttrBonus() {
    onChange({
      ...data,
      attributeBonuses: [...data.attributeBonuses, { attribute: 'might', value: 1 }],
    })
  }
  function addStatBonus() {
    onChange({ ...data, statBonuses: [...data.statBonuses, { stat: 'vida', value: 5 }] })
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Nome da Magia</Label>
        <TextInput value={data.name} onChange={(v) => onChange({ ...data, name: v })} />
      </div>
      <div>
        <Label>Categoria</Label>
        <TextInput
          value={data.category}
          onChange={(v) => onChange({ ...data, category: v })}
          placeholder="ex: Ataque, Cura, Alcance…"
        />
      </div>
      <div>
        <Label>Descrição</Label>
        <TextArea
          value={data.description}
          onChange={(v) => onChange({ ...data, description: v })}
        />
      </div>
      <div>
        <Label>Notas</Label>
        <TextInput
          value={data.notes ?? ''}
          onChange={(v) => onChange({ ...data, notes: v || undefined })}
        />
      </div>

      {/* Elements */}
      <div>
        <Label>Elementos</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {ELEMENTS.map((el) => {
            const active = data.elements.includes(el.id)
            return (
              <button
                key={el.id}
                onClick={() => toggleElement(el.id)}
                className="rounded border px-1.5 py-0.5 text-[10px] font-bold transition"
                style={{
                  background: active ? el.color : 'transparent',
                  borderColor: el.color,
                  color: active ? el.textColor : el.color,
                }}
              >
                {el.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Magic types */}
      <div>
        <Label>Tipos de Magia</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {MAGIC_TYPES.map((mt) => {
            const active = data.magicTypes.includes(mt.id)
            return (
              <button
                key={mt.id}
                onClick={() => toggleMagicType(mt.id)}
                className="rounded border px-1.5 py-0.5 text-[10px] font-bold transition"
                style={{
                  background: active ? mt.color : 'transparent',
                  borderColor: mt.color,
                  color: active ? mt.textColor : mt.color,
                }}
              >
                {mt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Levels table */}
      <div>
        <Label>Níveis (0 – Divino)</Label>
        <div className="mt-1 flex flex-col gap-1.5">
          {data.levels.map((entry) => (
            <SpellLevelRow key={String(entry.level)} entry={entry} onChange={updateLevel} />
          ))}
        </div>
      </div>

      {/* Attribute bonuses */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <Label>Bônus de Atributo</Label>
          <button
            onClick={addAttrBonus}
            className="text-[10px] text-amber-600 hover:underline dark:text-amber-400"
          >
            + Adicionar
          </button>
        </div>
        {data.attributeBonuses.map((b, i) => (
          <div key={i} className="mb-1 flex items-center gap-1.5">
            <Select<AttributeName>
              value={b.attribute}
              onChange={(v) => {
                const next = [...data.attributeBonuses]
                next[i] = { ...b, attribute: v }
                onChange({ ...data, attributeBonuses: next })
              }}
              options={ATTR_OPTIONS}
            />
            <input
              type="number"
              min={1}
              value={b.value}
              onChange={(e) => {
                const next = [...data.attributeBonuses]
                next[i] = { ...b, value: Number(e.target.value) }
                onChange({ ...data, attributeBonuses: next })
              }}
              className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={() =>
                onChange({
                  ...data,
                  attributeBonuses: data.attributeBonuses.filter((_, j) => j !== i),
                })
              }
              className="text-sm leading-none text-rose-400 hover:text-rose-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Stat bonuses */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <Label>Bônus de Stat</Label>
          <button
            onClick={addStatBonus}
            className="text-[10px] text-amber-600 hover:underline dark:text-amber-400"
          >
            + Adicionar
          </button>
        </div>
        {data.statBonuses.map((b, i) => (
          <div key={i} className="mb-1 flex items-center gap-1.5">
            <Select<keyof DerivedStats>
              value={b.stat}
              onChange={(v) => {
                const next = [...data.statBonuses]
                next[i] = { ...b, stat: v }
                onChange({ ...data, statBonuses: next })
              }}
              options={STAT_OPTIONS}
            />
            <input
              type="number"
              min={1}
              value={b.value}
              onChange={(e) => {
                const next = [...data.statBonuses]
                next[i] = { ...b, value: Number(e.target.value) }
                onChange({ ...data, statBonuses: next })
              }}
              className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={() =>
                onChange({ ...data, statBonuses: data.statBonuses.filter((_, j) => j !== i) })
              }
              className="text-sm leading-none text-rose-400 hover:text-rose-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatEditor({
  data,
  onChange,
}: {
  data: StatNodeData
  onChange: (d: StatNodeData) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Stat</Label>
        <Select<keyof DerivedStats>
          value={data.stat}
          onChange={(v) => onChange({ ...data, stat: v })}
          options={STAT_OPTIONS}
        />
      </div>
      <div>
        <Label>Valor (+)</Label>
        <NumberInput value={data.value} onChange={(v) => onChange({ ...data, value: v })} />
      </div>
    </div>
  )
}

function CombatAbilityEditor({
  data,
  onChange,
}: {
  data: CombatAbilityNodeData
  onChange: (d: CombatAbilityNodeData) => void
}) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | CombatCategory>('all')
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const filtered = ALL_COMBAT_SKILLS.filter(
    (skill) =>
      (categoryFilter === 'all' || skill.category === categoryFilter) &&
      (!normalizedSearch || skill.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch)),
  )
  const categoryFilters: Array<{ value: 'all' | CombatCategory; label: string }> = [
    { value: 'all', label: 'Todas' },
    { value: 'melee', label: 'Melee' },
    { value: 'ranged', label: 'Ranged' },
    { value: 'effort', label: 'Esforço' },
  ]
  const categoryLabels: Record<CombatCategory, string> = {
    melee: 'Melee',
    ranged: 'Ranged',
    effort: 'Esforço',
  }

  const attributeBonuses = data.attributeBonuses ?? []

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Buscar Habilidade</Label>
        <TextInput value={search} onChange={setSearch} placeholder="Nome da habilidade…" />
      </div>
      <div>
        <Label>Categoria</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {categoryFilters.map((filter) => {
            const active = categoryFilter === filter.value
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setCategoryFilter(filter.value)}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
                  active
                    ? 'border-rose-600 bg-rose-600 text-white'
                    : 'border-gray-300 text-gray-500 hover:border-rose-400 hover:text-rose-600 dark:border-gray-700 dark:text-gray-400'
                }`}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
        <p className="mt-1 text-[9px] text-gray-400">
          {filtered.length} {filtered.length === 1 ? 'habilidade encontrada' : 'habilidades encontradas'}
        </p>
      </div>
      <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
        {filtered.map((sk) => {
          const active = data.skillId === sk.id
          return (
            <button
              key={sk.id}
              onClick={() =>
                onChange({
                  ...data,
                  skillId: sk.id,
                  skillName: sk.name,
                  skillDescription: sk.description,
                  skillCost: sk.cost,
                  skillRequirement: combatSkillDependencyRequirement(sk),
                  skillAction: sk.action,
                  skillPurpose: sk.purpose,
                })
              }
              className={`w-full px-3 py-1.5 text-left text-xs transition ${active ? 'bg-rose-600 text-white' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}
            >
              <span className="font-semibold">{sk.name}</span>
              <span className="flex items-center justify-between gap-2">
                <span className={`text-[10px] ${active ? 'text-rose-100' : 'text-gray-400'}`}>
                  PC: {sk.cost}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    active
                      ? 'bg-white/15 text-white'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {categoryLabels[sk.category]}
                </span>
              </span>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="px-3 py-4 text-center text-[10px] text-gray-400">
            Nenhuma habilidade encontrada neste filtro.
          </p>
        )}
      </div>
      {data.skillName && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <p className="mb-0.5 font-bold">{data.skillName}</p>
          {data.skillRequirement && (
            <p>
              <strong>Requisito:</strong> {data.skillRequirement}
            </p>
          )}
          {data.skillAction && (
            <p>
              <strong>Ação:</strong> {data.skillAction}
            </p>
          )}
          <p>{data.skillDescription}</p>
        </div>
      )}

      {/* Bônus de atributo — toda habilidade deve dar atributos */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <Label>Bônus de Atributo</Label>
          <button
            onClick={() =>
              onChange({
                ...data,
                attributeBonuses: [...attributeBonuses, { attribute: 'might', value: 1 }],
              })
            }
            className="text-[10px] text-amber-600 hover:underline dark:text-amber-400"
          >
            + Adicionar
          </button>
        </div>
        <p className="mb-1 text-[10px] text-gray-400">
          Regra: toda habilidade dá atributos. Escale com o investimento necessário (~5 pts → +1,
          ~15 pts → +3).
        </p>
        {attributeBonuses.map((b, i) => (
          <div key={i} className="mb-1 flex items-center gap-1.5">
            <Select<AttributeName>
              value={b.attribute}
              onChange={(v) => {
                const next = [...attributeBonuses]
                next[i] = { ...b, attribute: v }
                onChange({ ...data, attributeBonuses: next })
              }}
              options={ATTR_OPTIONS}
            />
            <input
              type="number"
              min={1}
              value={b.value}
              onChange={(e) => {
                const next = [...attributeBonuses]
                next[i] = { ...b, value: Number(e.target.value) }
                onChange({ ...data, attributeBonuses: next })
              }}
              className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={() =>
                onChange({ ...data, attributeBonuses: attributeBonuses.filter((_, j) => j !== i) })
              }
              className="text-sm leading-none text-rose-400 hover:text-rose-600"
            >
              ✕
            </button>
          </div>
        ))}
        {attributeBonuses.length === 0 && (
          <p className="text-[10px] text-amber-500">⚠ Nenhum bônus de atributo definido.</p>
        )}
      </div>
    </div>
  )
}

function ExtraDamageEditor({
  data,
  onChange,
}: {
  data: ExtraDamageNodeData
  onChange: (d: ExtraDamageNodeData) => void
}) {
  function toggleTarget(id: AttackTarget) {
    const has = data.attackTargets.includes(id)
    onChange({
      ...data,
      attackTargets: has ? data.attackTargets.filter((t) => t !== id) : [...data.attackTargets, id],
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Dados (ex: 1d6, 2d8)</Label>
        <TextInput
          value={data.dice ?? ''}
          onChange={(v) => onChange({ ...data, dice: v || undefined })}
          placeholder="1d6"
        />
      </div>
      <div>
        <Label>Dano Fixo (+)</Label>
        <input
          type="number"
          min={0}
          value={data.flat ?? ''}
          onChange={(e) =>
            onChange({ ...data, flat: e.target.value ? Number(e.target.value) : undefined })
          }
          placeholder="0"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Base attack targets */}
      <div>
        <Label>Aplicar a – Físico / Geral</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {BASE_ATTACK_TARGETS.map((t) => {
            const active = data.attackTargets.includes(t)
            return (
              <button
                key={t}
                onClick={() => toggleTarget(t)}
                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition ${
                  active
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-orange-400 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                }`}
              >
                {BASE_ATTACK_TARGET_LABELS[t]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Magic types */}
      <div>
        <Label>Aplicar a – Tipos de Magia</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {MAGIC_TYPES.map((mt) => {
            const active = data.attackTargets.includes(mt.id as AttackTarget)
            return (
              <button
                key={mt.id}
                onClick={() => toggleTarget(mt.id as AttackTarget)}
                className="rounded border px-1.5 py-0.5 text-[10px] font-bold transition"
                style={{
                  background: active ? mt.color : 'transparent',
                  borderColor: mt.color,
                  color: active ? mt.textColor : mt.color,
                }}
              >
                {mt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Elements */}
      <div>
        <Label>Aplicar a – Elementos (dano)</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {ELEMENTS.map((el) => {
            const active = data.attackTargets.includes(el.id as AttackTarget)
            return (
              <button
                key={el.id}
                onClick={() => toggleTarget(el.id as AttackTarget)}
                className="rounded border px-1.5 py-0.5 text-[10px] font-bold transition"
                style={{
                  background: active ? el.color : 'transparent',
                  borderColor: el.color,
                  color: active ? el.textColor : el.color,
                }}
              >
                {el.label}
              </button>
            )
          })}
        </div>
      </div>

      {data.attackTargets.length === 0 && (
        <p className="text-[10px] text-gray-400">
          Nenhum alvo selecionado — selecione ao menos um acima.
        </p>
      )}
    </div>
  )
}

// ── V2 Editors ─────────────────────────────────────────────────────────────────

const WEAPON_BONUS_OPTIONS: { value: WeaponBonusType; label: string }[] = [
  { value: 'damage', label: WEAPON_BONUS_TYPE_LABELS['damage'] },
  { value: 'threatRange', label: WEAPON_BONUS_TYPE_LABELS['threatRange'] },
  { value: 'critMultiplier', label: WEAPON_BONUS_TYPE_LABELS['critMultiplier'] },
  { value: 'hitBonus', label: WEAPON_BONUS_TYPE_LABELS['hitBonus'] },
]

function WeaponBonusEditor({
  data,
  onChange,
}: {
  data: WeaponBonusNodeData
  onChange: (d: WeaponBonusNodeData) => void
}) {
  function toggleTag(tag: WeaponTag) {
    const has = data.requiredTags.includes(tag)
    onChange({
      ...data,
      requiredTags: has ? data.requiredTags.filter((t) => t !== tag) : [...data.requiredTags, tag],
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Tipo de Bônus</Label>
        <Select<WeaponBonusType>
          value={data.bonusType}
          onChange={(v) => onChange({ ...data, bonusType: v })}
          options={WEAPON_BONUS_OPTIONS}
        />
      </div>
      {data.bonusType === 'damage' && (
        <div>
          <Label>Dados de Dano (ex: 1d6)</Label>
          <TextInput
            value={data.dice ?? ''}
            onChange={(v) => onChange({ ...data, dice: v || undefined })}
            placeholder="1d6"
          />
        </div>
      )}
      <div>
        <Label>{data.bonusType === 'damage' ? 'Dano Fixo Adicional' : 'Valor'}</Label>
        <NumberInput value={data.value} onChange={(v) => onChange({ ...data, value: v })} min={0} />
      </div>
      <div>
        <Label>Tags de Arma Requeridas (pelo menos uma)</Label>
        <p className="mb-1 text-[10px] text-gray-400">Vazio = aplica a qualquer arma</p>
        <div className="mb-1">
          <p className="text-[9px] tracking-widest text-gray-500 uppercase">Corpo a Corpo</p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {WEAPON_TAGS_MELEE.map((tag) => {
              const active = data.requiredTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition ${active ? 'border-rose-600 bg-rose-600 text-white' : 'border-rose-400 text-rose-400 hover:bg-rose-900/20'}`}
                >
                  {WEAPON_TAG_LABELS[tag]}
                </button>
              )
            })}
          </div>
        </div>
        <div className="mb-1">
          <p className="text-[9px] tracking-widest text-gray-500 uppercase">Distância</p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {WEAPON_TAGS_RANGED.map((tag) => {
              const active = data.requiredTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition ${active ? 'border-sky-600 bg-sky-600 text-white' : 'border-sky-400 text-sky-400 hover:bg-sky-900/20'}`}
                >
                  {WEAPON_TAG_LABELS[tag]}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <p className="text-[9px] tracking-widest text-gray-500 uppercase">Categorias</p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {WEAPON_TAGS_CATEGORY.map((tag) => {
              const active = data.requiredTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition ${active ? 'border-amber-600 bg-amber-600 text-white' : 'border-amber-400 text-amber-400 hover:bg-amber-900/20'}`}
                >
                  {WEAPON_TAG_LABELS[tag]}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

const SPELL_MOD_OPTIONS: { value: SpellModifierEffectType; label: string }[] = [
  { value: 'costReduction', label: SPELL_MODIFIER_EFFECT_LABELS['costReduction'] },
  { value: 'extraProjectile', label: SPELL_MODIFIER_EFFECT_LABELS['extraProjectile'] },
  { value: 'duration', label: SPELL_MODIFIER_EFFECT_LABELS['duration'] },
  { value: 'damageBonus', label: SPELL_MODIFIER_EFFECT_LABELS['damageBonus'] },
]

function SpellModifierEditor({
  data,
  onChange,
}: {
  data: SpellModifierNodeData
  onChange: (d: SpellModifierNodeData) => void
}) {
  function toggleElement(id: ElementId) {
    const has = data.conditionElements.includes(id)
    onChange({
      ...data,
      conditionElements: has
        ? data.conditionElements.filter((e) => e !== id)
        : [...data.conditionElements, id],
    })
  }
  function toggleType(id: MagicTypeId) {
    const has = data.conditionTypes.includes(id)
    onChange({
      ...data,
      conditionTypes: has
        ? data.conditionTypes.filter((t) => t !== id)
        : [...data.conditionTypes, id],
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Efeito</Label>
        <Select<SpellModifierEffectType>
          value={data.effectType}
          onChange={(v) => onChange({ ...data, effectType: v })}
          options={SPELL_MOD_OPTIONS}
        />
      </div>
      {data.effectType === 'damageBonus' && (
        <div>
          <Label>Dados de Dano (ex: 1d6)</Label>
          <TextInput
            value={data.dice ?? ''}
            onChange={(v) => onChange({ ...data, dice: v || undefined })}
            placeholder="1d6"
          />
        </div>
      )}
      <div>
        <Label>
          Valor (
          {data.effectType === 'costReduction'
            ? 'IEP reduzido'
            : data.effectType === 'duration'
              ? 'rodadas extras'
              : 'bônus'}
          )
        </Label>
        <NumberInput value={data.value} onChange={(v) => onChange({ ...data, value: v })} min={0} />
      </div>
      <div>
        <Label>Condição – Elementos (vazio = todos)</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {ELEMENTS.map((el) => {
            const active = data.conditionElements.includes(el.id)
            return (
              <button
                key={el.id}
                onClick={() => toggleElement(el.id)}
                className="rounded border px-1.5 py-0.5 text-[10px] font-bold transition"
                style={{
                  background: active ? el.color : 'transparent',
                  borderColor: el.color,
                  color: active ? el.textColor : el.color,
                }}
              >
                {el.label}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <Label>Condição – Tipos de Magia (vazio = todos)</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {MAGIC_TYPES.map((mt) => {
            const active = data.conditionTypes.includes(mt.id)
            return (
              <button
                key={mt.id}
                onClick={() => toggleType(mt.id)}
                className="rounded border px-1.5 py-0.5 text-[10px] font-bold transition"
                style={{
                  background: active ? mt.color : 'transparent',
                  borderColor: mt.color,
                  color: active ? mt.textColor : mt.color,
                }}
              >
                {mt.label}
              </button>
            )
          })}
        </div>
      </div>
      <p className="rounded bg-gray-50 p-2 text-[10px] text-gray-400 dark:bg-gray-800/60">
        Este nó afeta magias que tenham <em>pelo menos um</em> dos elementos e{' '}
        <em>pelo menos um</em> dos tipos selecionados. Condições vazias aplicam a <em>todas</em> as
        magias.
      </p>
    </div>
  )
}

const DEFENSE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'physical', label: 'Físico' },
  { value: 'all', label: 'Todos os tipos' },
  ...ELEMENTS.map((el) => ({ value: el.id, label: `Elemental – ${el.label}` })),
]

function DefenseBonusEditor({
  data,
  onChange,
}: {
  data: DefenseBonusNodeData
  onChange: (d: DefenseBonusNodeData) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Tipo de Dano Reduzido</Label>
        <select
          value={data.damageType}
          onChange={(e) =>
            onChange({ ...data, damageType: e.target.value as DefenseBonusNodeData['damageType'] })
          }
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          {DEFENSE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Redução de Dano (valor fixo)</Label>
        <NumberInput value={data.value} onChange={(v) => onChange({ ...data, value: v })} min={1} />
      </div>
      <p className="rounded bg-gray-50 p-2 text-[10px] text-gray-400 dark:bg-gray-800/60">
        Reduz o dano recebido deste tipo em {data.value} pontos por ataque.
      </p>
    </div>
  )
}

function SkillBonusEditor({
  data,
  onChange,
}: {
  data: SkillBonusNodeData
  onChange: (d: SkillBonusNodeData) => void
}) {
  const [search, setSearch] = useState('')
  const filtered = search.trim()
    ? ALL_SKILLS.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : ALL_SKILLS

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Buscar Perícia</Label>
        <TextInput value={search} onChange={setSearch} placeholder="Nome da perícia…" />
      </div>
      <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
        {filtered.map((sk) => {
          const active = data.skillId === sk.id
          return (
            <button
              key={sk.id}
              onClick={() => onChange({ ...data, skillId: sk.id, skillName: sk.name })}
              className={`w-full px-3 py-1.5 text-left text-xs transition ${active ? 'bg-orange-600 text-white' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}
            >
              {sk.name}
            </button>
          )
        })}
      </div>
      {data.skillName && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300">
          Perícia selecionada: <strong>{data.skillName}</strong>
        </div>
      )}
      <div>
        <Label>Bônus (+X ao teste)</Label>
        <NumberInput value={data.value} onChange={(v) => onChange({ ...data, value: v })} min={1} />
      </div>
    </div>
  )
}

function HealingEditor({
  data,
  onChange,
}: {
  data: HealingNodeData
  onChange: (d: HealingNodeData) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Dados de Cura (ex: 1d6)</Label>
        <TextInput
          value={data.dice ?? ''}
          onChange={(v) => onChange({ ...data, dice: v || undefined })}
          placeholder="1d6"
        />
      </div>
      <div>
        <Label>Cura Fixa (+)</Label>
        <input
          type="number"
          min={0}
          value={data.flat ?? ''}
          onChange={(e) =>
            onChange({ ...data, flat: e.target.value ? Number(e.target.value) : undefined })
          }
          placeholder="0"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>
      <div>
        <Label>Escopo da Cura</Label>
        <select
          value={data.element ?? ''}
          onChange={(e) => onChange({ ...data, element: (e.target.value as ElementId) || null })}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">— Geral (toda cura) —</option>
          {ELEMENTS.map((el) => (
            <option key={el.id} value={el.id}>
              {el.label}
            </option>
          ))}
        </select>
        <p className="mt-0.5 text-[10px] text-gray-400">
          {data.element
            ? `Aumenta apenas curas do elemento: ${ELEMENTS.find((e) => e.id === data.element)?.label ?? data.element}`
            : 'Aumenta toda e qualquer cura (geral).'}
        </p>
      </div>
    </div>
  )
}

// ── Link editor ───────────────────────────────────────────────────────────────

function LinkEditor({
  data,
  onChange,
}: {
  data: LinkNodeData
  onChange: (d: LinkNodeData) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Nome</Label>
        <TextInput
          value={data.name}
          onChange={(v) => onChange({ ...data, name: v })}
          placeholder="Ligação"
        />
      </div>
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
        Nó de Ligação (custo 0): ponte rúnica entre ramificações distantes. Permite saltar entre
        especializações sem gastar pontos, facilitando builds híbridas.
      </p>
    </div>
  )
}

// ── Conditional editor ────────────────────────────────────────────────────────

const EFFECT_KIND_OPTIONS = (
  Object.keys(CONDITIONAL_EFFECT_KIND_LABELS) as ConditionalEffect['kind'][]
).map((k) => ({ value: k, label: CONDITIONAL_EFFECT_KIND_LABELS[k] }))

function ConditionalEffectRow({
  effect,
  onChange,
  onRemove,
}: {
  effect: ConditionalEffect
  onChange: (e: ConditionalEffect) => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-yellow-300 bg-yellow-50/60 p-2 dark:border-yellow-800/60 dark:bg-yellow-950/20">
      <div className="flex items-center gap-1.5">
        <Select<ConditionalEffect['kind']>
          value={effect.kind}
          onChange={(kind) => onChange(defaultConditionalEffect(kind))}
          options={EFFECT_KIND_OPTIONS}
        />
        <button
          onClick={onRemove}
          className="shrink-0 text-sm leading-none text-rose-400 hover:text-rose-600"
        >
          ✕
        </button>
      </div>

      {effect.kind === 'attributeBonus' && (
        <div className="flex gap-1.5">
          <Select<AttributeName>
            value={effect.attribute}
            onChange={(v) => onChange({ ...effect, attribute: v })}
            options={ATTR_OPTIONS}
          />
          <input
            type="number"
            value={effect.value}
            onChange={(e) => onChange({ ...effect, value: Number(e.target.value) })}
            className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      )}
      {effect.kind === 'statBonus' && (
        <div className="flex gap-1.5">
          <Select<keyof DerivedStats>
            value={effect.stat}
            onChange={(v) => onChange({ ...effect, stat: v })}
            options={STAT_OPTIONS}
          />
          <input
            type="number"
            value={effect.value}
            onChange={(e) => onChange({ ...effect, value: Number(e.target.value) })}
            className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      )}
      {effect.kind === 'extraDamage' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Dados (1d4)"
              value={effect.dice ?? ''}
              onChange={(e) => onChange({ ...effect, dice: e.target.value || undefined })}
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <input
              type="number"
              placeholder="Fixo"
              value={effect.flat ?? ''}
              onChange={(e) =>
                onChange({ ...effect, flat: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-xs text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {BASE_ATTACK_TARGETS.map((t) => {
              const active = effect.attackTargets.includes(t)
              return (
                <button
                  key={t}
                  onClick={() =>
                    onChange({
                      ...effect,
                      attackTargets: active
                        ? effect.attackTargets.filter((x) => x !== t)
                        : [...effect.attackTargets, t],
                    })
                  }
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition ${active ? 'border-orange-500 bg-orange-500 text-white' : 'border-orange-400 text-orange-500'}`}
                >
                  {BASE_ATTACK_TARGET_LABELS[t]}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {effect.kind === 'defense' && (
        <div className="flex gap-1.5">
          <select
            value={effect.damageType}
            onChange={(e) =>
              onChange({ ...effect, damageType: e.target.value as typeof effect.damageType })
            }
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="physical">Físico</option>
            <option value="all">Todos</option>
            {ELEMENTS.map((el) => (
              <option key={el.id} value={el.id}>
                {el.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={effect.value}
            onChange={(e) => onChange({ ...effect, value: Number(e.target.value) })}
            className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      )}
      {effect.kind === 'blockBonus' && (
        <input
          type="number"
          value={effect.value}
          onChange={(e) => onChange({ ...effect, value: Number(e.target.value) })}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      )}
      {effect.kind === 'healingBonus' && (
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="Dados (1d6)"
            value={effect.dice ?? ''}
            onChange={(e) => onChange({ ...effect, dice: e.target.value || undefined })}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <input
            type="number"
            placeholder="Fixo"
            value={effect.flat ?? ''}
            onChange={(e) =>
              onChange({ ...effect, flat: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-xs text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <select
            value={effect.element ?? ''}
            onChange={(e) => onChange({ ...effect, element: e.target.value || null })}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Geral</option>
            {ELEMENTS.map((el) => (
              <option key={el.id} value={el.id}>
                {el.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {effect.kind === 'spellModifier' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <Select<SpellModifierEffectType>
              value={effect.effectType}
              onChange={(v) => onChange({ ...effect, effectType: v })}
              options={SPELL_MOD_OPTIONS}
            />
            <input
              type="number"
              value={effect.value}
              onChange={(e) => onChange({ ...effect, value: Number(e.target.value) })}
              className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {MAGIC_TYPES.map((mt) => {
              const active = effect.conditionTypes.includes(mt.id)
              return (
                <button
                  key={mt.id}
                  onClick={() =>
                    onChange({
                      ...effect,
                      conditionTypes: active
                        ? effect.conditionTypes.filter((x) => x !== mt.id)
                        : [...effect.conditionTypes, mt.id],
                    })
                  }
                  className="rounded border px-1.5 py-0.5 text-[10px] font-bold transition"
                  style={{
                    background: active ? mt.color : 'transparent',
                    borderColor: mt.color,
                    color: active ? mt.textColor : mt.color,
                  }}
                >
                  {mt.label}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-1">
            {ELEMENTS.map((el) => {
              const active = effect.conditionElements.includes(el.id)
              return (
                <button
                  key={el.id}
                  onClick={() =>
                    onChange({
                      ...effect,
                      conditionElements: active
                        ? effect.conditionElements.filter((x) => x !== el.id)
                        : [...effect.conditionElements, el.id],
                    })
                  }
                  className="rounded border px-1.5 py-0.5 text-[10px] font-bold transition"
                  style={{
                    background: active ? el.color : 'transparent',
                    borderColor: el.color,
                    color: active ? el.textColor : el.color,
                  }}
                >
                  {el.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {effect.kind === 'custom' && (
        <TextArea
          value={effect.description}
          onChange={(v) => onChange({ ...effect, description: v })}
          rows={2}
        />
      )}

      <p className="font-mono text-[9px] text-gray-500">{conditionalEffectSummary(effect)}</p>
    </div>
  )
}

function ConditionalEditor({
  data,
  onChange,
}: {
  data: ConditionalNodeData
  onChange: (d: ConditionalNodeData) => void
}) {
  function toggleWeaponTag(tag: WeaponTag) {
    const has = data.conditions.weaponTagsAnyOf.includes(tag)
    onChange({
      ...data,
      conditions: {
        ...data.conditions,
        weaponTagsAnyOf: has
          ? data.conditions.weaponTagsAnyOf.filter((t) => t !== tag)
          : [...data.conditions.weaponTagsAnyOf, tag],
      },
    })
  }
  function toggleRequiredWeaponTag(tag: WeaponTag) {
    const requiredTags = data.conditions.weaponTagsAllOf ?? []
    const has = requiredTags.includes(tag)
    onChange({
      ...data,
      conditions: {
        ...data.conditions,
        weaponTagsAllOf: has
          ? requiredTags.filter((existingTag) => existingTag !== tag)
          : [...requiredTags, tag],
      },
    })
  }
  function toggleArmorTag(tag: ArmorTag) {
    const has = data.conditions.armorTagsAnyOf.includes(tag)
    onChange({
      ...data,
      conditions: {
        ...data.conditions,
        armorTagsAnyOf: has
          ? data.conditions.armorTagsAnyOf.filter((t) => t !== tag)
          : [...data.conditions.armorTagsAnyOf, tag],
      },
    })
  }

  const allWeaponTags: WeaponTag[] = [
    ...WEAPON_TAGS_CATEGORY,
    ...WEAPON_TAGS_MELEE,
    ...WEAPON_TAGS_RANGED,
  ]
  const allArmorTags: ArmorTag[] = [...ARMOR_TAGS_CATEGORY, ...ARMOR_TAGS_SPECIFIC]

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Nome</Label>
        <TextInput value={data.name} onChange={(v) => onChange({ ...data, name: v })} />
      </div>
      <div>
        <Label>Descrição</Label>
        <TextArea
          value={data.description}
          onChange={(v) => onChange({ ...data, description: v })}
        />
      </div>

      <div>
        <Label>Condição – Armas Equipadas (pelo menos uma)</Label>
        <p className="mb-1 text-[10px] text-gray-400">Vazio = ignora armas</p>
        <div className="flex flex-wrap gap-1">
          {allWeaponTags.map((tag) => {
            const active = data.conditions.weaponTagsAnyOf.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleWeaponTag(tag)}
                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition ${active ? 'border-rose-600 bg-rose-600 text-white' : 'border-rose-400 text-rose-400 hover:bg-rose-900/20'}`}
              >
                {WEAPON_TAG_LABELS[tag]}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <Label>Condição – Armas Obrigatórias (todas)</Label>
        <p className="mb-1 text-[10px] text-gray-400">
          Use para combinações, como espada de uma mão + escudo
        </p>
        <div className="flex flex-wrap gap-1">
          {allWeaponTags.map((tag) => {
            const active = (data.conditions.weaponTagsAllOf ?? []).includes(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleRequiredWeaponTag(tag)}
                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition ${active ? 'border-violet-600 bg-violet-600 text-white' : 'border-violet-400 text-violet-400 hover:bg-violet-900/20'}`}
              >
                {WEAPON_TAG_LABELS[tag]}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <Label>Condição – Armaduras Equipadas (pelo menos uma)</Label>
        <p className="mb-1 text-[10px] text-gray-400">Vazio = ignora armaduras</p>
        <div className="flex flex-wrap gap-1">
          {allArmorTags.map((tag) => {
            const active = data.conditions.armorTagsAnyOf.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleArmorTag(tag)}
                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition ${active ? 'border-sky-600 bg-sky-600 text-white' : 'border-sky-400 text-sky-400 hover:bg-sky-900/20'}`}
              >
                {ARMOR_TAG_LABELS[tag]}
              </button>
            )
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={data.conditions.requiresNoArmor ?? false}
          onChange={(event) =>
            onChange({
              ...data,
              conditions: { ...data.conditions, requiresNoArmor: event.target.checked },
            })
          }
          className="accent-amber-500"
        />
        Exigir que nenhuma armadura esteja equipada
      </label>

      {data.conditions.weaponTagsAnyOf.length === 0 &&
        (data.conditions.weaponTagsAllOf ?? []).length === 0 &&
        data.conditions.armorTagsAnyOf.length === 0 &&
        !data.conditions.requiresNoArmor && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
            Sem condições = sempre ativo (útil para Nós Supremos com múltiplos efeitos).
          </p>
        )}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <Label>Efeitos</Label>
          <button
            onClick={() =>
              onChange({
                ...data,
                effects: [...data.effects, defaultConditionalEffect('attributeBonus')],
              })
            }
            className="text-[10px] text-amber-600 hover:underline dark:text-amber-400"
          >
            + Adicionar efeito
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {data.effects.map((effect, i) => (
            <ConditionalEffectRow
              key={i}
              effect={effect}
              onChange={(e) => {
                const next = [...data.effects]
                next[i] = e
                onChange({ ...data, effects: next })
              }}
              onRemove={() =>
                onChange({ ...data, effects: data.effects.filter((_, j) => j !== i) })
              }
            />
          ))}
          {data.effects.length === 0 && (
            <p className="text-[10px] text-gray-400">Nenhum efeito — adicione ao menos um.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function NodeEditPanel({ nodeId }: { nodeId: string }) {
  const { tree, updateNodeData, updateNodeAppearance, updateNodeCost, removeNode } =
    useTalentTreeStore()
  const node = tree.nodes.find((n) => n.id === nodeId)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [imageEditorOpen, setImageEditorOpen] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [pendingImageX, setPendingImageX] = useState(50)
  const [pendingImageY, setPendingImageY] = useState(50)
  const [pendingImageScale, setPendingImageScale] = useState(1)

  // Local draft so edits aren't committed on every keystroke
  const [draftState, setDraftState] = useState<{ nodeId: string; data: TalentNodeData } | null>(
    node ? { nodeId, data: { ...node.data } } : null,
  )
  const draft = draftState?.nodeId === nodeId ? draftState.data : node ? { ...node.data } : null

  if (!node || !draft) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-400 dark:text-gray-600">
        Selecione um nó para editar suas propriedades
      </div>
    )
  }
  const selectedNode = node

  function save(data: TalentNodeData) {
    updateNodeData(nodeId, data)
    setDraftState({ nodeId, data })
  }

  function changeType(newType: TalentNodeType) {
    const newData = defaultNodeData(newType)
    save(newData)
  }

  function readImagePosition(position?: string) {
    const match = position?.match(/(-?\d+(?:\.\d+)?)%?\s+(-?\d+(?:\.\d+)?)%?/)
    const clamp = (value: number) => Math.min(100, Math.max(0, value))
    return match ? { x: clamp(Number(match[1])), y: clamp(Number(match[2])) } : { x: 50, y: 50 }
  }

  function openImageEditor(base64: string, reset = false) {
    const position = reset ? { x: 50, y: 50 } : readImagePosition(selectedNode.imagePosition)
    setPendingImage(base64)
    setPendingImageX(position.x)
    setPendingImageY(position.y)
    setPendingImageScale(reset ? 1 : Math.min(2.5, Math.max(0.5, selectedNode.imageScale ?? 1)))
    setImageEditorOpen(true)
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (loadEvent) => {
      const base64 = loadEvent.target?.result as string
      if (!base64) return
      openImageEditor(await optimizeEmbeddedImage(base64), true)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function applyNodeImage() {
    if (!pendingImage) return
    updateNodeAppearance(nodeId, {
      imageBase64: pendingImage,
      imagePosition: `${pendingImageX}% ${pendingImageY}%`,
      imageScale: pendingImageScale,
    })
    setImageEditorOpen(false)
  }

  const { stroke } = NODE_TYPE_COLORS[draft.type]

  return (
    <>
      {imageEditorOpen && pendingImage && (
        <ImageCropModal
          title="Ajustar imagem do nó"
          base64={pendingImage}
          x={pendingImageX}
          y={pendingImageY}
          scale={pendingImageScale}
          circular
          onX={setPendingImageX}
          onY={setPendingImageY}
          onScale={setPendingImageScale}
          onApply={applyNodeImage}
          onClose={() => setImageEditorOpen(false)}
        />
      )}

      <div className="flex h-full flex-col overflow-hidden">
        {/* Panel header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Editar Nó</h3>
          <button
            onClick={() => removeNode(nodeId)}
            className="rounded px-2 py-1 text-xs text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            ✕ Remover
          </button>
        </div>

        {/* Type selector */}
        <div className="shrink-0 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <Label>Tipo do Nó</Label>
          <div className="mt-1 flex flex-wrap gap-1">
            {NODE_TYPES.filter((t) => !NODE_TYPES_EXTRA.includes(t)).map((t) => {
              const active = draft.type === t
              const c = NODE_TYPE_COLORS[t]
              return (
                <button
                  key={t}
                  onClick={() => changeType(t)}
                  className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition"
                  style={{
                    background: active ? c.stroke : 'transparent',
                    borderColor: c.stroke,
                    color: active ? '#fff' : c.stroke,
                  }}
                >
                  {NODE_TYPE_LABELS[t]}
                </button>
              )
            })}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1 border-t border-gray-100 pt-1.5 dark:border-gray-800">
            <span className="mr-1 self-center text-[9px] font-bold tracking-widest text-amber-500 uppercase">
              ＋
            </span>
            {NODE_TYPES_EXTRA.map((t) => {
              const active = draft.type === t
              const c = NODE_TYPE_COLORS[t]
              return (
                <button
                  key={t}
                  onClick={() => changeType(t)}
                  className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition"
                  style={{
                    background: active ? c.stroke : 'transparent',
                    borderColor: c.stroke,
                    color: active ? '#fff' : c.stroke,
                  }}
                >
                  {NODE_TYPE_LABELS[t]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Node ID hint */}
        <div className="shrink-0 px-4 pt-2">
          <p className="truncate font-mono text-[9px] text-gray-300 dark:text-gray-700">
            id: {nodeId}
          </p>
        </div>

        {/* Optional node artwork */}
        <div className="shrink-0 px-4 pt-2">
          <Label>Imagem do nó</Label>
          <div className="mt-1 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-gray-400 bg-gray-900 transition hover:border-amber-600"
              title="Enviar outra imagem"
            >
              {node.imageBase64 ? (
                <img
                  src={node.imageBase64}
                  alt="Imagem do nó"
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: node.imagePosition ?? '50% 50%',
                    transformOrigin: node.imagePosition ?? '50% 50%',
                    transform: `scale(${node.imageScale ?? 1})`,
                  }}
                />
              ) : (
                <span className="flex h-full items-center justify-center text-lg text-gray-400">
                  ＋
                </span>
              )}
            </button>

            <div className="flex min-w-0 flex-col items-start gap-1">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="text-[11px] font-semibold text-amber-700 hover:underline dark:text-amber-500"
              >
                {node.imageBase64 ? 'Trocar imagem' : 'Enviar imagem'}
              </button>
              {node.imageBase64 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openImageEditor(node.imageBase64!)}
                    className="text-[10px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Ajustar recorte
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateNodeAppearance(nodeId, {
                        imageBase64: undefined,
                        imagePosition: undefined,
                        imageScale: undefined,
                      })
                    }
                    className="text-[10px] text-rose-500 hover:underline"
                  >
                    Remover
                  </button>
                </div>
              )}
              <span className="text-[9px] leading-tight text-gray-400">
                Otimizada automaticamente para o arquivo da árvore.
              </span>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
        </div>

        {/* Custo em pontos de talento */}
        <div className="flex shrink-0 items-center gap-2 px-4 pt-2">
          <Label>Custo (pontos)</Label>
          <input
            type="number"
            min={0}
            value={node.cost ?? talentNodeCost(node)}
            onChange={(e) => {
              const v = Number(e.target.value)
              updateNodeCost(nodeId, Number.isNaN(v) ? undefined : v)
            }}
            className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-center text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            onClick={() => updateNodeCost(nodeId, undefined)}
            title="Voltar ao custo padrão (1; jogador/ligação = 0)"
            className="text-[10px] text-gray-400 hover:text-amber-500"
          >
            padrão
          </button>
        </div>

        {/* Type-specific form */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 border-b-2 pb-1" style={{ borderColor: stroke }}>
            <span className="text-xs font-bold" style={{ color: stroke }}>
              {NODE_TYPE_LABELS[draft.type]}
            </span>
          </div>

          {draft.type === 'player' && <PlayerEditor data={draft} onChange={save} />}
          {draft.type === 'attribute' && <AttributeEditor data={draft} onChange={save} />}
          {draft.type === 'magic' && <MagicEditor data={draft} onChange={save} />}
          {draft.type === 'stat' && <StatEditor data={draft} onChange={save} />}
          {draft.type === 'combatAbility' && <CombatAbilityEditor data={draft} onChange={save} />}
          {draft.type === 'extraDamage' && <ExtraDamageEditor data={draft} onChange={save} />}
          {draft.type === 'healing' && <HealingEditor data={draft} onChange={save} />}
          {draft.type === 'weaponBonus' && <WeaponBonusEditor data={draft} onChange={save} />}
          {draft.type === 'spellModifier' && <SpellModifierEditor data={draft} onChange={save} />}
          {draft.type === 'defenseBonus' && <DefenseBonusEditor data={draft} onChange={save} />}
          {draft.type === 'skillBonus' && <SkillBonusEditor data={draft} onChange={save} />}
          {draft.type === 'link' && <LinkEditor data={draft} onChange={save} />}
          {draft.type === 'conditional' && <ConditionalEditor data={draft} onChange={save} />}
        </div>
      </div>
    </>
  )
}
