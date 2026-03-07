import { useEffect, useState } from 'react'
import { useTalentTreeStore } from '../store/talentTreeStore'
import {
  NODE_TYPE_LABELS,
  NODE_TYPE_COLORS,
  BASE_ATTACK_TARGETS,
  BASE_ATTACK_TARGET_LABELS,
  defaultNodeData,
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
} from '../../../types/talentTree'
import type { AttributeName, DerivedStats, ElementId, MagicTypeId, SpellLevelEntry } from '../../../types/game'
import { SPELL_LEVEL_LABELS } from '../../../types/game'
import { ELEMENTS } from '../../../data/elements'
import { MAGIC_TYPES } from '../../../data/magicTypes'
import { ALL_COMBAT_SKILLS } from '../../../data/combatSkills'

// ─────────────────────────────────────────────────────────────────────────────

const ATTR_OPTIONS: { value: AttributeName; label: string }[] = [
  { value: 'might',     label: 'Might' },
  { value: 'grace',     label: 'Grace' },
  { value: 'wisdom',    label: 'Wisdom' },
  { value: 'sense',     label: 'Sense' },
  { value: 'fortitude', label: 'Fortitude' },
]

const STAT_OPTIONS: { value: keyof DerivedStats; label: string }[] = [
  { value: 'vida',        label: 'Vida' },
  { value: 'iep',         label: 'IEP' },
  { value: 'pc',          label: 'Pontos de Combate' },
  { value: 'resistencia', label: 'Resistência' },
  { value: 'esquiva',     label: 'Esquiva' },
]

const NODE_TYPES: TalentNodeType[] = [
  'player', 'attribute', 'magic', 'stat', 'combatAbility', 'extraDamage', 'healing',
]

// ── Primitive field components ────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-0.5">
      {children}
    </label>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
    />
  )
}

function NumberInput({ value, onChange, min = 1 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      min={min}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none"
    />
  )
}

function TextArea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none resize-none"
    />
  )
}

function Select<T extends string>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ── Sub-editors ────────────────────────────────────────────────────────────────

function PlayerEditor({ data, onChange }: { data: PlayerNodeData; onChange: (d: PlayerNodeData) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Nome</Label>
        <TextInput value={data.name} onChange={(v) => onChange({ ...data, name: v })} placeholder="Jogador" />
      </div>
      <div>
        <Label>Descrição</Label>
        <TextArea value={data.description} onChange={(v) => onChange({ ...data, description: v })} />
      </div>
      <p className="text-[10px] text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-lg px-2.5 py-1.5 border border-blue-200 dark:border-blue-900/40">
        Este é o nó raiz da árvore — representa o personagem do jogador.
      </p>
    </div>
  )
}

function AttributeEditor({ data, onChange }: { data: AttributeNodeData; onChange: (d: AttributeNodeData) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Atributo</Label>
        <select
          value={data.attribute ?? ''}
          onChange={(e) => onChange({ ...data, attribute: (e.target.value as AttributeName) || null })}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none"
        >
          <option value="">— Jogador escolhe —</option>
          {ATTR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {!data.attribute && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
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
  entry, onChange,
}: {
  entry: SpellLevelEntry
  onChange: (e: SpellLevelEntry) => void
}) {
  const label = SPELL_LEVEL_LABELS[entry.level]
  const isDivino = entry.level === 'divino'
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span
          className="shrink-0 w-8 h-6 rounded flex items-center justify-center text-[10px] font-bold"
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
          className="flex-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none"
        />
      </div>
      <input
        type="text"
        placeholder="Escalonamento (ex: 2D8 + WIS)"
        value={entry.scaling}
        onChange={(e) => onChange({ ...entry, scaling: e.target.value })}
        className="w-full rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none"
      />
      <input
        type="text"
        placeholder="Habilidade especial (opcional)"
        value={entry.special ?? ''}
        onChange={(e) => onChange({ ...entry, special: e.target.value || null })}
        className="w-full rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
      />
    </div>
  )
}

function MagicEditor({ data, onChange }: { data: MagicNodeData; onChange: (d: MagicNodeData) => void }) {
  function toggleElement(id: ElementId) {
    const has = data.elements.includes(id)
    onChange({ ...data, elements: has ? data.elements.filter((e) => e !== id) : [...data.elements, id] })
  }
  function toggleMagicType(id: MagicTypeId) {
    const has = data.magicTypes.includes(id)
    onChange({ ...data, magicTypes: has ? data.magicTypes.filter((t) => t !== id) : [...data.magicTypes, id] })
  }
  function updateLevel(entry: SpellLevelEntry) {
    const next = data.levels.map((l) => (l.level === entry.level ? entry : l))
    onChange({ ...data, levels: next })
  }
  function addAttrBonus() {
    onChange({ ...data, attributeBonuses: [...data.attributeBonuses, { attribute: 'might', value: 1 }] })
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
        <TextInput value={data.category} onChange={(v) => onChange({ ...data, category: v })} placeholder="ex: Ataque, Cura, Alcance…" />
      </div>
      <div>
        <Label>Descrição</Label>
        <TextArea value={data.description} onChange={(v) => onChange({ ...data, description: v })} />
      </div>
      <div>
        <Label>Notas</Label>
        <TextInput value={data.notes ?? ''} onChange={(v) => onChange({ ...data, notes: v || undefined })} />
      </div>

      {/* Elements */}
      <div>
        <Label>Elementos</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {ELEMENTS.map((el) => {
            const active = data.elements.includes(el.id)
            return (
              <button
                key={el.id}
                onClick={() => toggleElement(el.id)}
                className="rounded px-1.5 py-0.5 text-[10px] font-bold border transition"
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
        <div className="flex flex-wrap gap-1 mt-1">
          {MAGIC_TYPES.map((mt) => {
            const active = data.magicTypes.includes(mt.id)
            return (
              <button
                key={mt.id}
                onClick={() => toggleMagicType(mt.id)}
                className="rounded px-1.5 py-0.5 text-[10px] font-bold border transition"
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
        <div className="flex flex-col gap-1.5 mt-1">
          {data.levels.map((entry) => (
            <SpellLevelRow key={String(entry.level)} entry={entry} onChange={updateLevel} />
          ))}
        </div>
      </div>

      {/* Attribute bonuses */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Bônus de Atributo</Label>
          <button onClick={addAttrBonus} className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline">+ Adicionar</button>
        </div>
        {data.attributeBonuses.map((b, i) => (
          <div key={i} className="flex gap-1.5 mb-1 items-center">
            <Select<AttributeName>
              value={b.attribute}
              onChange={(v) => {
                const next = [...data.attributeBonuses]; next[i] = { ...b, attribute: v }
                onChange({ ...data, attributeBonuses: next })
              }}
              options={ATTR_OPTIONS}
            />
            <input
              type="number" min={1} value={b.value}
              onChange={(e) => {
                const next = [...data.attributeBonuses]; next[i] = { ...b, value: Number(e.target.value) }
                onChange({ ...data, attributeBonuses: next })
              }}
              className="w-16 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-sm text-center text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={() => onChange({ ...data, attributeBonuses: data.attributeBonuses.filter((_, j) => j !== i) })}
              className="text-rose-400 hover:text-rose-600 text-sm leading-none"
            >✕</button>
          </div>
        ))}
      </div>

      {/* Stat bonuses */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Bônus de Stat</Label>
          <button onClick={addStatBonus} className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline">+ Adicionar</button>
        </div>
        {data.statBonuses.map((b, i) => (
          <div key={i} className="flex gap-1.5 mb-1 items-center">
            <Select<keyof DerivedStats>
              value={b.stat}
              onChange={(v) => {
                const next = [...data.statBonuses]; next[i] = { ...b, stat: v }
                onChange({ ...data, statBonuses: next })
              }}
              options={STAT_OPTIONS}
            />
            <input
              type="number" min={1} value={b.value}
              onChange={(e) => {
                const next = [...data.statBonuses]; next[i] = { ...b, value: Number(e.target.value) }
                onChange({ ...data, statBonuses: next })
              }}
              className="w-16 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-sm text-center text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={() => onChange({ ...data, statBonuses: data.statBonuses.filter((_, j) => j !== i) })}
              className="text-rose-400 hover:text-rose-600 text-sm leading-none"
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatEditor({ data, onChange }: { data: StatNodeData; onChange: (d: StatNodeData) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Stat</Label>
        <Select<keyof DerivedStats> value={data.stat} onChange={(v) => onChange({ ...data, stat: v })} options={STAT_OPTIONS} />
      </div>
      <div>
        <Label>Valor (+)</Label>
        <NumberInput value={data.value} onChange={(v) => onChange({ ...data, value: v })} />
      </div>
    </div>
  )
}

function CombatAbilityEditor({ data, onChange }: { data: CombatAbilityNodeData; onChange: (d: CombatAbilityNodeData) => void }) {
  const [search, setSearch] = useState('')
  const filtered = search.trim()
    ? ALL_COMBAT_SKILLS.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : ALL_COMBAT_SKILLS

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Buscar Habilidade</Label>
        <TextInput value={search} onChange={setSearch} placeholder="Nome da habilidade…" />
      </div>
      <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
        {filtered.map((sk) => {
          const active = data.skillId === sk.id
          return (
            <button
              key={sk.id}
              onClick={() => onChange({ ...data, skillId: sk.id, skillName: sk.name, skillDescription: sk.description, skillCost: sk.cost })}
              className={`w-full text-left px-3 py-1.5 text-xs transition ${active ? 'bg-rose-600 text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              <span className="font-semibold">{sk.name}</span>
              <span className={`ml-1.5 text-[10px] ${active ? 'text-rose-100' : 'text-gray-400'}`}>PC: {sk.cost}</span>
            </button>
          )
        })}
      </div>
      {data.skillName && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          <p className="font-bold mb-0.5">{data.skillName}</p>
          <p>{data.skillDescription}</p>
        </div>
      )}
    </div>
  )
}

function ExtraDamageEditor({ data, onChange }: { data: ExtraDamageNodeData; onChange: (d: ExtraDamageNodeData) => void }) {
  function toggleTarget(id: AttackTarget) {
    const has = data.attackTargets.includes(id)
    onChange({ ...data, attackTargets: has ? data.attackTargets.filter((t) => t !== id) : [...data.attackTargets, id] })
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
          onChange={(e) => onChange({ ...data, flat: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="0"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none"
        />
      </div>

      {/* Base attack targets */}
      <div>
        <Label>Aplicar a – Físico / Geral</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {BASE_ATTACK_TARGETS.map((t) => {
            const active = data.attackTargets.includes(t)
            return (
              <button
                key={t}
                onClick={() => toggleTarget(t)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold border transition ${
                  active
                    ? 'bg-orange-500 border-orange-500 text-white'
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
        <div className="flex flex-wrap gap-1 mt-1">
          {MAGIC_TYPES.map((mt) => {
            const active = data.attackTargets.includes(mt.id as AttackTarget)
            return (
              <button
                key={mt.id}
                onClick={() => toggleTarget(mt.id as AttackTarget)}
                className="rounded px-1.5 py-0.5 text-[10px] font-bold border transition"
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
        <div className="flex flex-wrap gap-1 mt-1">
          {ELEMENTS.map((el) => {
            const active = data.attackTargets.includes(el.id as AttackTarget)
            return (
              <button
                key={el.id}
                onClick={() => toggleTarget(el.id as AttackTarget)}
                className="rounded px-1.5 py-0.5 text-[10px] font-bold border transition"
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
        <p className="text-[10px] text-gray-400">Nenhum alvo selecionado — selecione ao menos um acima.</p>
      )}
    </div>
  )
}

function HealingEditor({ data, onChange }: { data: HealingNodeData; onChange: (d: HealingNodeData) => void }) {
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
          onChange={(e) => onChange({ ...data, flat: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="0"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none"
        />
      </div>
      <div>
        <Label>Escopo da Cura</Label>
        <select
          value={data.element ?? ''}
          onChange={(e) => onChange({ ...data, element: (e.target.value as ElementId) || null })}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none"
        >
          <option value="">— Geral (toda cura) —</option>
          {ELEMENTS.map((el) => (
            <option key={el.id} value={el.id}>{el.label}</option>
          ))}
        </select>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {data.element
            ? `Aumenta apenas curas do elemento: ${ELEMENTS.find((e) => e.id === data.element)?.label ?? data.element}`
            : 'Aumenta toda e qualquer cura (geral).'}
        </p>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function NodeEditPanel({ nodeId }: { nodeId: string }) {
  const { tree, updateNodeData, removeNode } = useTalentTreeStore()
  const node = tree.nodes.find((n) => n.id === nodeId)

  // Local draft so edits aren't committed on every keystroke
  const [draft, setDraft] = useState<TalentNodeData | null>(null)

  useEffect(() => {
    setDraft(node ? { ...node.data } : null)
  }, [nodeId]) // reset draft when different node is selected

  if (!node || !draft) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400 dark:text-gray-600 px-4 text-center">
        Selecione um nó para editar suas propriedades
      </div>
    )
  }

  function save(data: TalentNodeData) {
    updateNodeData(nodeId, data)
    setDraft(data)
  }

  function changeType(newType: TalentNodeType) {
    const newData = defaultNodeData(newType)
    save(newData)
  }

  const { stroke } = NODE_TYPE_COLORS[draft.type]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Editar Nó</h3>
        <button
          onClick={() => removeNode(nodeId)}
          className="rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
        >✕ Remover</button>
      </div>

      {/* Type selector */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <Label>Tipo do Nó</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {NODE_TYPES.map((t) => {
            const active = draft.type === t
            const c = NODE_TYPE_COLORS[t]
            return (
              <button
                key={t}
                onClick={() => changeType(t)}
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition"
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
      <div className="px-4 pt-2 shrink-0">
        <p className="text-[9px] text-gray-300 dark:text-gray-700 font-mono truncate">id: {nodeId}</p>
      </div>

      {/* Type-specific form */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="pb-1 mb-3 border-b-2" style={{ borderColor: stroke }}>
          <span className="text-xs font-bold" style={{ color: stroke }}>{NODE_TYPE_LABELS[draft.type]}</span>
        </div>

        {draft.type === 'player' && (
          <PlayerEditor data={draft} onChange={save} />
        )}
        {draft.type === 'attribute' && (
          <AttributeEditor data={draft} onChange={save} />
        )}
        {draft.type === 'magic' && (
          <MagicEditor data={draft} onChange={save} />
        )}
        {draft.type === 'stat' && (
          <StatEditor data={draft} onChange={save} />
        )}
        {draft.type === 'combatAbility' && (
          <CombatAbilityEditor data={draft} onChange={save} />
        )}
        {draft.type === 'extraDamage' && (
          <ExtraDamageEditor data={draft} onChange={save} />
        )}
        {draft.type === 'healing' && (
          <HealingEditor data={draft} onChange={save} />
        )}
      </div>
    </div>
  )
}
