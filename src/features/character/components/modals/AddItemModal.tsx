import { useState } from 'react'
import Modal from '../../../../components/ui/Modal'
import type { InventoryItem, ItemEffect, ItemType, AttributeName, WeaponDetails, ArmorDetails, WeaponDamageRoll, WeaponAttributeScaling } from '../../../../types/game'
import { ATTRIBUTE_LABELS } from '../../../../types/game'
import type { DerivedStats } from '../../../../types/game'
import { useCharacterStore } from '../../store/characterStore'
import { ALL_SKILLS } from '../../../../data/skills'

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
  existing?: InventoryItem
}

export default function AddItemModal({ onClose, existing }: Props) {
  const addItem = useCharacterStore((s) => s.addItem)
  const updateItem = useCharacterStore((s) => s.updateItem)

  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [quantity, setQuantity] = useState(existing?.quantity ?? 1)
  const [type, setType] = useState<ItemType>(existing?.type ?? 'misc')
  const [effects, setEffects] = useState<ItemEffect[]>(existing?.effects ?? [])
  // old threat field removed from UI, keeping logic for compatibility below
  const [weight, setWeight] = useState<number>(existing?.weight ?? 0)

  // Weapon Details State
  const [weaponDamage, setWeaponDamage] = useState<WeaponDamageRoll[]>(existing?.weaponDetails?.damage ?? [])
  const [weaponScaling, setWeaponScaling] = useState<WeaponAttributeScaling[]>(existing?.weaponDetails?.scaling ?? [])
  const [critMult, setCritMult] = useState<number>(existing?.weaponDetails?.critical?.multiplier ?? 2)
  const [critRangeMin, setCritRangeMin] = useState<number>(existing?.weaponDetails?.critical?.rangeMin ?? 20)

  // Armor Details State
  const [armorHealth, setArmorHealth] = useState<number>(existing?.armorDetails?.currentHealth ?? 0)
  const [armorMaxHealth, setArmorMaxHealth] = useState<number>(existing?.armorDetails?.maxHealth ?? 0)

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

    const weaponDetails: WeaponDetails | undefined = type === 'weapon' ? {
      damage: weaponDamage,
      scaling: weaponScaling,
      critical: {
        multiplier: critMult,
        rangeMin: critRangeMin,
      },
    } : undefined

    const armorDetails: ArmorDetails | undefined = type === 'armor' ? {
      currentHealth: armorHealth,
      maxHealth: armorMaxHealth,
    } : undefined

    // Calculate derived threat string for displaybadge
    const derivedThreat = type === 'weapon'
      ? `${critRangeMin < 20 ? critRangeMin + '-20' : '20'}/x${critMult}`
      : undefined

    const base = {
      name: name.trim(),
      description: description.trim(),
      quantity,
      type,
      effects,
      weight: weight || undefined,
      threat: derivedThreat,
      weaponDetails,
      armorDetails,
    }
    if (existing) {
      updateItem({ ...existing, ...base })
    } else {
      addItem({ id: crypto.randomUUID(), equipped: false, ...base })
    }
    onClose()
  }

  const inputClass =
    'w-full rounded bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white focus:border-amber-600 focus:outline-none'

  return (
    <Modal title={existing ? 'Editar Item' : 'Adicionar Item'} onClose={onClose} size="lg">
      {/* Presets – only show when creating */}
      {!existing && (
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
      )}

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
          <label className="mb-1 block text-xs text-gray-400">Peso (carga)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={weight}
            onChange={(e) => setWeight(Math.max(0, parseFloat(e.target.value)))}
            className={inputClass}
          />
        </div>


        {/* Weapon Details Editor */}
        {type === 'weapon' && (
          <div className="space-y-3 rounded-lg border border-red-900/40 bg-red-950/20 p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-500">Detalhes de Combate</h3>

            {/* Damage Rolls */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs text-gray-400">Dados de Dano</label>
                <button
                  onClick={() => setWeaponDamage([...weaponDamage, { count: 1, die: 6 }])}
                  className="text-xs text-amber-500 hover:text-amber-400"
                >
                  + Dado
                </button>
              </div>

              {weaponDamage.map((dmg, idx) => (
                <div key={idx} className="mb-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    className="w-12 rounded bg-gray-700 px-2 py-1 text-xs text-white"
                    value={dmg.count}
                    onChange={(e) => {
                      const newDmg = [...weaponDamage]
                      newDmg[idx].count = Math.max(1, parseInt(e.target.value))
                      setWeaponDamage(newDmg)
                    }}
                  />
                  <span className="text-xs text-gray-400">d</span>
                  <select
                    className="w-16 rounded bg-gray-700 px-2 py-1 text-xs text-white"
                    value={dmg.die}
                    onChange={(e) => {
                      const newDmg = [...weaponDamage]
                      newDmg[idx].die = parseInt(e.target.value)
                      setWeaponDamage(newDmg)
                    }}
                  >
                    {[4, 6, 8, 10, 12, 20, 100].map((d) => (
                      <option key={d} value={d}>
                        d{d}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setWeaponDamage(weaponDamage.filter((_, i) => i !== idx))}
                    className="ml-auto text-red-500 hover:text-red-400"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>

            {/* Scaling */}
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs text-gray-400">Escala (V * Atributo)</label>
                <button
                  onClick={() => setWeaponScaling([...weaponScaling, { attribute: 'might', multiplier: 1 }])}
                  className="text-xs text-amber-500 hover:text-amber-400"
                >
                  + Atributo
                </button>
              </div>

              {weaponScaling.map((scale, idx) => (
                <div key={idx} className="mb-2 flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    className="w-16 rounded bg-gray-700 px-2 py-1 text-xs text-white"
                    value={scale.multiplier}
                    onChange={(e) => {
                      const newScale = [...weaponScaling]
                      newScale[idx].multiplier = parseFloat(e.target.value)
                      setWeaponScaling(newScale)
                    }}
                  />
                  <span className="text-xs text-gray-400">×</span>
                  <select
                    className="flex-1 rounded bg-gray-700 px-2 py-1 text-xs text-white"
                    value={scale.attribute}
                    onChange={(e) => {
                      const newScale = [...weaponScaling]
                      newScale[idx].attribute = e.target.value as AttributeName
                      setWeaponScaling(newScale)
                    }}
                  >
                    {Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setWeaponScaling(weaponScaling.filter((_, i) => i !== idx))}
                    className="ml-auto text-red-500 hover:text-red-400"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>

            {/* Critical */}
            <div className="mt-4 grid grid-cols-2 gap-4">
               <div>
                  <label className="mb-1 block text-xs text-gray-400">Margem de Ameaça (≥ X)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={critRangeMin}
                    onChange={(e) => setCritRangeMin(Math.max(1, Math.min(20, parseInt(e.target.value))))}
                    className={inputClass}
                  />
               </div>
               <div>
                  <label className="mb-1 block text-xs text-gray-400">Multiplicador Crítico (× X)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={critMult}
                    onChange={(e) => setCritMult(Math.max(1, parseFloat(e.target.value)))}
                    className={inputClass}
                  />
               </div>
            </div>
          </div>
        )}

        {/* Armor Health Editor */}
        {type === 'armor' && (
          <div className="space-y-3 rounded-lg border border-blue-900/40 bg-blue-950/20 p-3">
             <h3 className="text-xs font-bold uppercase tracking-wider text-blue-500">Integridade da Armadura</h3>
             <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Vida Atual</label>
                  <input
                    type="number"
                    min="0"
                    value={armorHealth}
                    onChange={(e) => setArmorHealth(Math.max(0, parseInt(e.target.value)))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Vida Máxima</label>
                  <input
                    type="number"
                    min="1"
                    value={armorMaxHealth}
                    onChange={(e) => setArmorMaxHealth(Math.max(1, parseInt(e.target.value)))}
                    className={inputClass}
                  />
                </div>
             </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-gray-400">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Efeitos */}
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
                    if (newType === 'skillBonus') patch.skillId = ef.skillId ?? ALL_SKILLS[0].id
                    if (newType === 'skillUnlock') patch.skillId = ef.skillId ?? ALL_SKILLS[0].id
                    updateEffect(i, patch)
                  }}
                  className="rounded bg-gray-700 border border-gray-600 px-1.5 py-1 text-xs text-gray-200 focus:outline-none"
                >
                  <option value="heal">Curar Vida</option>
                  <option value="restoreIep">Restaurar IEP</option>
                  <option value="statBonus">Bônus de Stat (passivo)</option>
                  <option value="attributeBonus">Bônus de Atributo (passivo)</option>
                  <option value="skillBonus">Bônus de Perícia (passivo)</option>
                  <option value="skillUnlock">Desbloquear Perícia (passivo)</option>
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

                {ef.type === 'skillBonus' && (
                  <>
                    <select
                      value={ef.skillId ?? ALL_SKILLS[0].id}
                      onChange={(e) => updateEffect(i, { skillId: e.target.value })}
                      className="rounded bg-gray-700 border border-gray-600 px-1.5 py-1 text-xs text-gray-200 focus:outline-none"
                    >
                      {ALL_SKILLS.map((sk) => (
                        <option key={sk.id} value={sk.id}>{sk.name}</option>
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

                {ef.type === 'skillUnlock' && (
                  <select
                    value={ef.skillId ?? ALL_SKILLS[0].id}
                    onChange={(e) => updateEffect(i, { skillId: e.target.value })}
                    className="rounded bg-gray-700 border border-gray-600 px-1.5 py-1 text-xs text-gray-200 focus:outline-none"
                  >
                    {ALL_SKILLS.map((sk) => (
                      <option key={sk.id} value={sk.id}>{sk.name}</option>
                    ))}
                  </select>
                )}

                {ef.type === 'custom' && (
                  <input
                    value={ef.description ?? ''}
                    onChange={(e) => updateEffect(i, { description: e.target.value })}
                    placeholder="Descrição do efeito"
                    className="flex-1 rounded bg-gray-700 border border-gray-600 px-1.5 py-1 text-xs text-white focus:outline-none"
                  />
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
          {existing ? 'Salvar' : 'Adicionar'}
        </button>
      </div>
    </Modal>
  )
}