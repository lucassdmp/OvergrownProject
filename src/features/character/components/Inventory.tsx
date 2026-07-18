import { useState } from 'react'
import { useCharacterStore } from '../store/characterStore'
import type { InventoryItem } from '../../../types/game'
import type { ItemEffect, ItemType, AttributeName, WeaponDetails, ArmorDetails, WeaponDamageRoll, WeaponAttributeScaling } from '../../../types/game'
import type { WeaponTag, ArmorTag } from '../../../types/game'
import { ATTRIBUTE_LABELS, type DerivedStats } from '../../../types/game'
import {
  WEAPON_TAG_LABELS, WEAPON_TAGS_MELEE, WEAPON_TAGS_RANGED, WEAPON_TAGS_CATEGORY,
  ARMOR_TAG_LABELS, ARMOR_TAGS_SPECIFIC, ARMOR_TAGS_CATEGORY,
} from '../../../types/game'
import Modal from '../../../components/ui/Modal'
import { ALL_SKILLS } from '../../../data/skills'

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_STYLE: Record<ItemType, { icon: string; color: string }> = {
  weapon:        { icon: '⚔',  color: 'text-red-400' },
  armor:         { icon: '🛡', color: 'text-sky-400' },
  'potion-vida': { icon: '🧪', color: 'text-rose-400' },
  'potion-iep':  { icon: '🔮', color: 'text-violet-400' },
  misc:          { icon: '◆',  color: 'text-gray-400' },
}

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  weapon:        '⚔ Arma',
  armor:         '🛡 Armadura',
  'potion-vida': '🧪 Poção de Vida',
  'potion-iep':  '🔮 Poção de IEP',
  misc:          '◆ Misc',
}

const STAT_LABELS: Record<keyof DerivedStats, string> = {
  vida: 'Vida', iep: 'IEP', pc: 'PC', resistencia: 'Resistência', esquiva: 'Esquiva',
}

// ── Add/Edit Item Modal ───────────────────────────────────────────────────────

interface ModalProps {
  onClose: () => void
  existing?: InventoryItem
}

function AddItemModal({ onClose, existing }: ModalProps) {
  const addItem = useCharacterStore((s) => s.addItem)
  const updateItem = useCharacterStore((s) => s.updateItem)

  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [quantity, setQuantity] = useState(existing?.quantity ?? 1)
  const [type, setType] = useState<ItemType>(existing?.type ?? 'misc')
  const [effects, setEffects] = useState<ItemEffect[]>(existing?.effects ?? [])
  const [weight, setWeight] = useState<number>(existing?.weight ?? 0)
  const [weaponTags, setWeaponTags] = useState<WeaponTag[]>(existing?.weaponTags ?? [])
  const [armorTags, setArmorTags] = useState<ArmorTag[]>(existing?.armorTags ?? [])

  // Weapon details
  const [weaponDamage, setWeaponDamage] = useState<WeaponDamageRoll[]>(existing?.weaponDetails?.damage ?? [])
  const [weaponScaling, setWeaponScaling] = useState<WeaponAttributeScaling[]>(existing?.weaponDetails?.scaling ?? [])
  const [critMult, setCritMult] = useState<number>(existing?.weaponDetails?.critical?.multiplier ?? 2)
  const [critRangeMin, setCritRangeMin] = useState<number>(existing?.weaponDetails?.critical?.rangeMin ?? 20)

  // Armor details
  const [armorHealth, setArmorHealth] = useState<number>(existing?.armorDetails?.currentHealth ?? 0)
  const [armorMaxHealth, setArmorMaxHealth] = useState<number>(existing?.armorDetails?.maxHealth ?? 0)

  function toggleWeaponTag(tag: WeaponTag) {
    setWeaponTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  function toggleArmorTag(tag: ArmorTag) {
    setArmorTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
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
      critical: { multiplier: critMult, rangeMin: critRangeMin },
    } : undefined
    const armorDetails: ArmorDetails | undefined = type === 'armor' ? {
      currentHealth: armorHealth,
      maxHealth: armorMaxHealth,
    } : undefined
    const derivedThreat = type === 'weapon'
      ? `${critRangeMin < 20 ? critRangeMin + '-20' : '20'}/x${critMult}`
      : undefined

    const base: Omit<InventoryItem, 'id'> = {
      name: name.trim(),
      description: description.trim(),
      quantity,
      type,
      effects,
      weight: weight || undefined,
      threat: derivedThreat,
      weaponDetails,
      armorDetails,
      weaponTags: type === 'weapon' ? weaponTags : undefined,
      armorTags: type === 'armor' ? armorTags : undefined,
    }
    if (existing) {
      updateItem({ ...existing, ...base })
    } else {
      addItem({ id: crypto.randomUUID(), equipped: false, ...base })
    }
    onClose()
  }

  const inp = 'w-full rounded bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white focus:border-amber-600 focus:outline-none'

  return (
    <Modal title={existing ? 'Editar Item' : 'Adicionar Item'} onClose={onClose} size="lg">
      <div className="flex flex-col gap-3">
        {/* Basic fields */}
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Nome</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="Nome do item" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value as ItemType)} className={inp}>
              {(Object.keys(ITEM_TYPE_LABELS) as ItemType[]).map((t) => (
                <option key={t} value={t}>{ITEM_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          {(type === 'weapon' || type === 'armor') ? (
            <div className="flex items-end">
              <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest block mb-1">Peso (carga)</label>
              <input type="number" min={0} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className={inp + ' w-20'} />
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Quantidade</label>
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={inp} />
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Descrição</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inp + ' resize-none'} />
        </div>

        {/* Weapon Tags */}
        {type === 'weapon' && (
          <div className="border border-gray-700 rounded-lg p-3 flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Tags da Arma</p>
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Corpo a Corpo</p>
              <div className="flex flex-wrap gap-1">
                {WEAPON_TAGS_MELEE.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleWeaponTag(tag)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold border transition ${
                      weaponTags.includes(tag)
                        ? 'bg-rose-600 border-rose-600 text-white'
                        : 'border-rose-500/50 text-rose-400 hover:bg-rose-900/20'
                    }`}
                  >
                    {WEAPON_TAG_LABELS[tag]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Distância</p>
              <div className="flex flex-wrap gap-1">
                {WEAPON_TAGS_RANGED.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleWeaponTag(tag)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold border transition ${
                      weaponTags.includes(tag)
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'border-sky-500/50 text-sky-400 hover:bg-sky-900/20'
                    }`}
                  >
                    {WEAPON_TAG_LABELS[tag]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Categorias</p>
              <div className="flex flex-wrap gap-1">
                {WEAPON_TAGS_CATEGORY.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleWeaponTag(tag)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold border transition ${
                      weaponTags.includes(tag)
                        ? 'bg-amber-600 border-amber-600 text-white'
                        : 'border-amber-500/50 text-amber-400 hover:bg-amber-900/20'
                    }`}
                  >
                    {WEAPON_TAG_LABELS[tag]}
                  </button>
                ))}
              </div>
            </div>

            {/* Weapon damage stats */}
            <div className="grid grid-cols-2 gap-2 border-t border-gray-700 pt-2">
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Dano (dados)</p>
                {weaponDamage.map((d, i) => (
                  <div key={i} className="flex items-center gap-1 mb-1">
                    <input type="number" min={1} value={d.count} onChange={(e) => { const n = [...weaponDamage]; n[i] = {...d, count: Number(e.target.value)}; setWeaponDamage(n) }} className={inp + ' w-12'} />
                    <span className="text-gray-400 text-xs">D</span>
                    <input type="number" min={2} value={d.die} onChange={(e) => { const n = [...weaponDamage]; n[i] = {...d, die: Number(e.target.value)}; setWeaponDamage(n) }} className={inp + ' w-12'} />
                    <button onClick={() => setWeaponDamage(weaponDamage.filter((_,j)=>j!==i))} className="text-rose-400 text-xs">✕</button>
                  </div>
                ))}
                <button onClick={() => setWeaponDamage([...weaponDamage, {count:1,die:6}])} className="text-xs text-amber-400 hover:underline">+ Dado</button>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Crítico</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">Min:</span>
                  <input type="number" min={1} max={20} value={critRangeMin} onChange={(e) => setCritRangeMin(Number(e.target.value))} className={inp + ' w-12'} />
                  <span className="text-xs text-gray-400">x</span>
                  <input type="number" min={1} value={critMult} onChange={(e) => setCritMult(Number(e.target.value))} className={inp + ' w-10'} />
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">Escalonamento (Atributo + multiplicador)</p>
              {weaponScaling.map((sc, i) => (
                <div key={i} className="flex items-center gap-1 mb-1">
                  <select value={sc.attribute} onChange={(e) => { const n=[...weaponScaling]; n[i]={...sc,attribute:e.target.value as AttributeName}; setWeaponScaling(n) }} className="min-w-0 flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white focus:border-amber-600 focus:outline-none">
                    {(Object.keys(ATTRIBUTE_LABELS) as AttributeName[]).map((a) => <option key={a} value={a}>{ATTRIBUTE_LABELS[a]}</option>)}
                  </select>
                  <span className="text-gray-400 text-xs shrink-0">×</span>
                  <input type="number" min={0} step={0.5} value={sc.multiplier} onChange={(e) => { const n=[...weaponScaling]; n[i]={...sc,multiplier:Number(e.target.value)}; setWeaponScaling(n) }} className="w-14 shrink-0 rounded bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white focus:border-amber-600 focus:outline-none" />
                  <button onClick={() => setWeaponScaling(weaponScaling.filter((_,j)=>j!==i))} className="text-rose-400 text-xs shrink-0">✕</button>
                </div>
              ))}
              <button onClick={() => setWeaponScaling([...weaponScaling, {attribute:'might',multiplier:1}])} className="text-xs text-amber-400 hover:underline">+ Escalonamento</button>
            </div>
          </div>
        )}

        {/* Armor Tags */}
        {type === 'armor' && (
          <div className="border border-gray-700 rounded-lg p-3 flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">Tags da Armadura</p>
            <div className="flex flex-wrap gap-1">
              {ARMOR_TAGS_SPECIFIC.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleArmorTag(tag)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold border transition ${
                    armorTags.includes(tag)
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'border-sky-500/50 text-sky-400 hover:bg-sky-900/20'
                  }`}
                >
                  {ARMOR_TAG_LABELS[tag]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {ARMOR_TAGS_CATEGORY.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleArmorTag(tag)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold border transition ${
                    armorTags.includes(tag)
                      ? 'bg-amber-600 border-amber-600 text-white'
                      : 'border-amber-500/50 text-amber-400 hover:bg-amber-900/20'
                  }`}
                >
                  {ARMOR_TAG_LABELS[tag]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Vida Atual da Armadura</p>
                <input type="number" min={0} value={armorHealth} onChange={(e) => setArmorHealth(Number(e.target.value))} className={inp} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Vida Máxima da Armadura</p>
                <input type="number" min={0} value={armorMaxHealth} onChange={(e) => setArmorMaxHealth(Number(e.target.value))} className={inp} />
              </div>
            </div>
          </div>
        )}

        {/* Effects */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Efeitos Passivos</p>
            <button onClick={addEffect} className="text-xs text-amber-400 hover:underline">+ Adicionar</button>
          </div>
          {effects.map((ef, i) => (
            <div key={i} className="flex flex-col gap-1.5 border border-gray-700 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <select value={ef.type} onChange={(e) => updateEffect(i, { type: e.target.value as ItemEffect['type'], attribute: undefined, stat: undefined, skillId: undefined, value: undefined, description: undefined })} className={inp + ' flex-1'}>
                  <option value="custom">Custom</option>
                  <option value="attributeBonus">Bônus de Atributo</option>
                  <option value="statBonus">Bônus de Stat</option>
                  <option value="skillBonus">Bônus de Perícia</option>
                  <option value="skillUnlock">Desbloquear Perícia</option>
                  <option value="heal">Cura (consumível)</option>
                  <option value="restoreIep">Restaurar IEP (consumível)</option>
                </select>
                <button onClick={() => removeEffect(i)} className="text-rose-400 hover:text-rose-300 text-xs shrink-0">✕</button>
              </div>
              {ef.type === 'attributeBonus' && (
                <div className="flex gap-2">
                  <select value={ef.attribute ?? ''} onChange={(e) => updateEffect(i, { attribute: e.target.value as AttributeName })} className={inp + ' flex-1'}>
                    <option value="">— Selecionar —</option>
                    {(Object.keys(ATTRIBUTE_LABELS) as AttributeName[]).map((a) => <option key={a} value={a}>{ATTRIBUTE_LABELS[a]}</option>)}
                  </select>
                  <input type="number" value={ef.value ?? ''} onChange={(e) => updateEffect(i, { value: Number(e.target.value) })} className={inp + ' w-16'} placeholder="+X" />
                </div>
              )}
              {ef.type === 'statBonus' && (
                <div className="flex gap-2">
                  <select value={ef.stat ?? ''} onChange={(e) => updateEffect(i, { stat: e.target.value as keyof DerivedStats })} className={inp + ' flex-1'}>
                    <option value="">— Selecionar —</option>
                    {(Object.keys(STAT_LABELS) as (keyof DerivedStats)[]).map((s) => <option key={s} value={s}>{STAT_LABELS[s]}</option>)}
                  </select>
                  <input type="number" value={ef.value ?? ''} onChange={(e) => updateEffect(i, { value: Number(e.target.value) })} className={inp + ' w-16'} placeholder="+X" />
                </div>
              )}
              {(ef.type === 'skillBonus' || ef.type === 'skillUnlock') && (
                <div className="flex gap-2">
                  <select value={ef.skillId ?? ''} onChange={(e) => updateEffect(i, { skillId: e.target.value })} className={inp + ' flex-1'}>
                    <option value="">— Selecionar Perícia —</option>
                    {ALL_SKILLS.map((sk) => <option key={sk.id} value={sk.id}>{sk.name}</option>)}
                  </select>
                  {ef.type === 'skillBonus' && (
                    <input type="number" value={ef.value ?? ''} onChange={(e) => updateEffect(i, { value: Number(e.target.value) })} className={inp + ' w-16'} placeholder="+X" />
                  )}
                </div>
              )}
              {(ef.type === 'heal' || ef.type === 'restoreIep') && (
                <input type="number" min={0} value={ef.value ?? ''} onChange={(e) => updateEffect(i, { value: Number(e.target.value) })} className={inp} placeholder="Valor" />
              )}
              {ef.type === 'custom' && (
                <input type="text" value={ef.description ?? ''} onChange={(e) => updateEffect(i, { description: e.target.value })} className={inp} placeholder="Descrição do efeito" />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
          <button onClick={onClose} className="rounded px-4 py-1.5 text-sm text-gray-400 hover:text-white transition">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-lg px-4 py-1.5 text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40 transition"
          >
            {existing ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Item Card ─────────────────────────────────────────────────────────────────

function ItemCard({ item }: { item: InventoryItem }) {
  const removeItem = useCharacterStore((s) => s.removeItem)
  const updateItemQuantity = useCharacterStore((s) => s.updateItemQuantity)
  const toggleEquipped = useCharacterStore((s) => s.toggleEquipped)
  const toggleBroken = useCharacterStore((s) => s.toggleBroken)
  const useItem = useCharacterStore((s) => s.useItem)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)

  const style = TYPE_STYLE[item.type]
  const isEquippable = item.type === 'weapon' || item.type === 'armor'
  const isConsumable = item.type === 'potion-vida' || item.type === 'potion-iep'
  const isBroken = isEquippable && item.broken === true

  function handleUse() {
    const healVal = item.effects.find((e) => e.type === 'heal')?.value
    const iepVal = item.effects.find((e) => e.type === 'restoreIep')?.value
    useItem(item.id, { vida: healVal, iep: iepVal })
  }

  return (
    <>
      {editing && <AddItemModal existing={item} onClose={() => setEditing(false)} />}

      <div className={`rounded-xl border overflow-hidden ${
        isBroken
          ? 'border-gray-500/50 bg-gray-100/40 dark:bg-gray-900/40 opacity-75'
          : isEquippable && item.equipped
            ? 'border-amber-400/60 dark:border-amber-600/50 bg-amber-50/60 dark:bg-amber-950/20'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60'
      }`}>
        <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
          <span className="text-lg">{style.icon}</span>
          <span className="flex-1 font-semibold text-gray-900 dark:text-white text-sm truncate">
            {item.name}
            {isBroken && (
              <span className="ml-1.5 text-[10px] font-bold text-gray-500 border border-gray-400/50 rounded px-1">
                QUEBRADO
              </span>
            )}
          </span>

          {/* Weapon tags */}
          {item.weaponTags && item.weaponTags.length > 0 && (
            <div className="flex flex-wrap gap-0.5">
              {item.weaponTags.map((tag) => (
                <span key={tag} className="text-[9px] font-bold rounded px-1 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200/50">
                  {WEAPON_TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}

          {/* Armor tags */}
          {item.armorTags && item.armorTags.length > 0 && (
            <div className="flex flex-wrap gap-0.5">
              {item.armorTags.map((tag) => (
                <span key={tag} className="text-[9px] font-bold rounded px-1 py-0.5 bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 border border-sky-200/50">
                  {ARMOR_TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}

          {/* Threat badge */}
          {item.type === 'weapon' && item.threat && (
            <span className="text-[10px] font-bold text-orange-400 border border-orange-700/40 rounded px-1.5 py-0.5">
              ⚡ {item.threat}
            </span>
          )}

          {/* Equip toggle */}
          {isEquippable && (
            <button
              onClick={() => toggleEquipped(item.id)}
              className={`rounded px-2 py-0.5 text-xs font-bold transition border ${
                item.equipped
                  ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                  : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-amber-400 hover:text-amber-500'
              }`}
            >
              {item.equipped ? '✦ Equipado' : '◇ Equipar'}
            </button>
          )}

          {/* Broken toggle */}
          {isEquippable && (
            <button
              onClick={() => toggleBroken(item.id)}
              className={`rounded px-2 py-0.5 text-xs font-bold transition border ${
                item.broken
                  ? 'border-gray-500 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              🔨
            </button>
          )}

          {/* Quantity controls */}
          {!isEquippable && (
            <div className="flex items-center gap-1 text-sm">
              <button onClick={() => updateItemQuantity(item.id, -1)} className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600">−</button>
              <span className={`w-6 text-center font-bold ${item.quantity === 0 ? 'text-gray-600' : style.color}`}>{item.quantity}</span>
              <button onClick={() => updateItemQuantity(item.id, +1)} className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600">+</button>
            </div>
          )}

          {/* Use button */}
          {isConsumable && (
            <button
              onClick={handleUse}
              disabled={item.quantity === 0}
              className="rounded px-2 py-0.5 text-xs font-bold bg-emerald-600 text-white disabled:opacity-40 hover:bg-emerald-500 transition"
            >
              Usar
            </button>
          )}

          <button onClick={() => setExpanded((e) => !e)} className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</button>
          <button onClick={() => setEditing(true)} className="text-gray-400 text-xs hover:text-amber-400">✎</button>
          <button onClick={() => removeItem(item.id)} className="text-gray-400 text-xs hover:text-rose-400">✕</button>
        </div>

        {expanded && (item.description || item.effects.length > 0) && (
          <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 flex flex-col gap-1.5">
            {item.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400">{item.description}</p>
            )}
            {item.effects.filter((e) => !['heal', 'restoreIep'].includes(e.type)).map((ef, i) => (
              <div key={i} className="text-xs text-gray-500 dark:text-gray-400">
                {ef.type === 'attributeBonus' && ef.attribute && ef.value != null && (
                  <span className="text-emerald-600 dark:text-emerald-400">+{ef.value} {ATTRIBUTE_LABELS[ef.attribute as AttributeName]}</span>
                )}
                {ef.type === 'statBonus' && ef.stat && ef.value != null && (
                  <span className="text-emerald-600 dark:text-emerald-400">+{ef.value} {STAT_LABELS[ef.stat as keyof DerivedStats]}</span>
                )}
                {ef.type === 'skillBonus' && ef.skillId && ef.value != null && (
                  <span className="text-sky-600 dark:text-sky-400">+{ef.value} {ALL_SKILLS.find(s=>s.id===ef.skillId)?.name ?? ef.skillId}</span>
                )}
                {ef.type === 'skillUnlock' && ef.skillId && (
                  <span className="text-violet-600 dark:text-violet-400">Desbloqueia {ALL_SKILLS.find(s=>s.id===ef.skillId)?.name ?? ef.skillId}</span>
                )}
                {ef.type === 'custom' && ef.description && (
                  <span>{ef.description}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ── Main Inventory V2 ─────────────────────────────────────────────────────────

export default function Inventory() {
  const inventory = useCharacterStore((s) => s.character.inventory ?? [])
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<ItemType | 'all'>('all')

  const filtered = filter === 'all' ? inventory : inventory.filter((it) => it.type === filter)
  const totalWeight = inventory.reduce((sum, it) => sum + (it.weight ?? 0) * (it.quantity || 1), 0)

  return (
    <div className="flex flex-col gap-3">
      {adding && <AddItemModal onClose={() => setAdding(false)} />}

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">Inventário</h2>
        <span className="text-[10px] text-gray-400 dark:text-gray-600">⚖ {totalWeight} carga</span>
        <div className="ml-auto flex items-center gap-1.5">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ItemType | 'all')}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs text-gray-800 dark:text-gray-200 focus:border-amber-500 focus:outline-none"
          >
            <option value="all">Todos</option>
            {(Object.keys(ITEM_TYPE_LABELS) as ItemType[]).map((t) => (
              <option key={t} value={t}>{ITEM_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <button
            onClick={() => setAdding(true)}
            className="rounded-lg border border-amber-400/60 dark:border-amber-700/50 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition"
          >
            + Item
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-600">
            {filter === 'all' ? 'Inventário vazio.' : 'Nenhum item deste tipo.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
