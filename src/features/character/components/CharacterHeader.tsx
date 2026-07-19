import { useCallback, useMemo, useRef, useState } from 'react'
import { useCharacterStore } from '../store/characterStore'
import { useCharacterStats } from '../hooks/useCharacterStats'
import { ALL_ORIGINS } from '../../../data/origins'
import { ALL_SKILLS } from '../../../data/skills'
import Modal from '../../../components/ui/Modal'
import IntegerInput from '../../../components/ui/IntegerInput'
import { useSaveShortcut } from '../../../hooks/useSaveShortcut'
import { downloadTextFile, fileNamePart } from '../../../utils/downloadFile'
import { useTalentTreeStore } from '../../talentTree/store/talentTreeStore'
import { calculateEquipmentDefense } from '../../../lib/equipmentRules'
import { isCharacterFile, isCharacterData, serializeCharacterFile } from '../utils/characterFile'
import { useFirebaseSession } from '../../auth/firebaseSessionContext'
import { useFirebaseCharacters } from '../hooks/useFirebaseCharacters'

const HEADER_FIELD_DESCRIPTIONS = {
  sheet: 'Alterna entre as fichas salvas ou cria um novo personagem.',
  name: 'Nome usado para identificar o personagem.',
  race: 'Raça ou povo ao qual o personagem pertence.',
  origin: 'Passado do personagem, que define sua perícia de origem.',
  divinity: 'Nível de divindade atual do personagem.',
  vida: 'Pontos de Vida atuais e máximos. Ao chegar a zero, o personagem fica incapacitado.',
  iep: 'Energia Impossível atual e máxima, consumida para conjurar magias e usar efeitos arcanos.',
  pc: 'Pontos de Combate atuais e máximos, consumidos por técnicas e ações especiais.',
  resistencia:
    'Defesa passiva usada como valor-alvo de ataques e efeitos. É calculada principalmente pela Fortitude.',
  esquiva:
    'Defesa usada para evitar um ataque com uma reação. É calculada pela Graça e por bônus ativos.',
  bloqueio:
    'Valor de Bloqueio total dos equipamentos válidos. Reduz o dano de um ataque bloqueado.',
  platina: 'Quantidade de moedas de platina carregadas pelo personagem.',
  ouro: 'Quantidade de moedas de ouro carregadas pelo personagem.',
  prata: 'Quantidade de moedas de prata carregadas pelo personagem.',
  bronze: 'Quantidade de moedas de bronze carregadas pelo personagem.',
} as const

// ── Avatar resize helper ───────────────────────────────────────────────────────
const AVATAR_MAX_DIMENSION = 512
const AVATAR_JPEG_QUALITY = 0.85
const AVATAR_SIZE_THRESHOLD_BYTES = 300 * 1024

function resizeAvatarImage(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const { width, height } = img
      const approxBytes = (base64.length * 3) / 4
      const needsResize = width > AVATAR_MAX_DIMENSION || height > AVATAR_MAX_DIMENSION
      if (!needsResize && approxBytes <= AVATAR_SIZE_THRESHOLD_BYTES) {
        resolve(base64)
        return
      }
      const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(width, height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(base64)
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', AVATAR_JPEG_QUALITY))
    }
    img.onerror = () => resolve(base64)
    img.src = base64
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResourcePip({
  label,
  description,
  current,
  max,
  color,
  onCurrentChange,
}: {
  label: string
  description: string
  current: number
  max: number
  color: string
  onCurrentChange: (v: number) => void
}) {
  return (
    <div className="flex min-w-0 cursor-help flex-col items-center gap-0.5" title={description}>
      <span className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <IntegerInput
          min={0}
          max={max}
          value={current}
          onChange={onCurrentChange}
          className={`w-14 rounded bg-gray-100 px-1 py-0.5 text-center text-lg font-bold dark:bg-gray-800 ${color} border border-gray-300 focus:border-amber-500 focus:outline-none dark:border-gray-700`}
        />
        <span className="text-gray-500">/</span>
        <span className="text-base font-semibold text-gray-600 dark:text-gray-300">{max}</span>
      </div>
    </div>
  )
}

function CoinField({
  label,
  description,
  value,
  onChange,
  labelColor,
  inputColor,
}: {
  label: string
  description: string
  value: number
  onChange: (v: number) => void
  labelColor: string
  inputColor: string
}) {
  return (
    <div className="flex cursor-help flex-col items-center gap-0.5" title={description}>
      <span className={`text-[10px] font-semibold tracking-widest uppercase ${labelColor}`}>
        {label}
      </span>
      <div className="relative flex items-center">
        <span className="absolute left-1.5 z-10 text-xs">🪙</span>
        <IntegerInput
          min={0}
          value={value}
          onChange={onChange}
          className={`w-[72px] rounded-full border py-0.5 pr-1 pl-5 text-center text-sm font-semibold focus:outline-none ${inputColor}`}
        />
      </div>
    </div>
  )
}

function StatBadge({
  label,
  value,
  description,
  detail,
  prominent = false,
}: {
  label: string
  value: number
  description: string
  detail?: string
  prominent?: boolean
}) {
  return (
    <div className="flex cursor-help flex-col items-center gap-0.5" title={description}>
      <span className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
        {label}
      </span>
      <span
        className={
          prominent
            ? 'text-xl leading-none font-bold text-gray-700 dark:text-gray-200'
            : 'text-base leading-none font-semibold text-gray-600 dark:text-gray-300'
        }
      >
        {value}
      </span>
      {detail && (
        <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500">{detail}</span>
      )}
    </div>
  )
}

// ── Avatar Editor Modal ───────────────────────────────────────────────────────

function AvatarEditorModal({
  base64,
  x,
  y,
  scale,
  aspectRatio,
  onX,
  onY,
  onScale,
  onApply,
  onClose,
}: {
  base64: string
  x: number
  y: number
  scale: number
  aspectRatio: number
  onX: (v: number) => void
  onY: (v: number) => void
  onScale: (v: number) => void
  onApply: () => void
  onClose: () => void
}) {
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
  return (
    <Modal title="Ajustar Foto" onClose={onClose} size="md">
      <div className="flex flex-col gap-4">
        <div
          className="mx-auto w-full max-w-xs overflow-hidden rounded-xl border border-gray-700 bg-gray-800"
          style={{ aspectRatio }}
        >
          <img
            src={base64}
            alt="Pré-visualização"
            className="h-full w-full object-cover"
            style={{
              objectPosition: `${x}% ${y}%`,
              transformOrigin: `${x}% ${y}%`,
              transform: `scale(${scale})`,
            }}
          />
        </div>
        <p className="text-center text-[10px] text-gray-500">
          A pré-visualização usa a mesma proporção do quadro da ficha.
        </p>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span>Zoom</span>
              <span>{Math.round(scale * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={scale}
              onChange={(e) => onScale(clamp(Number(e.target.value), 0.5, 2.5))}
              className="w-full accent-amber-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span>Posição X</span>
              <span>{Math.round(x)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={x}
              onChange={(e) => onX(clamp(Number(e.target.value), 0, 100))}
              className="w-full accent-amber-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span>Posição Y</span>
              <span>{Math.round(y)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={y}
              onChange={(e) => onY(clamp(Number(e.target.value), 0, 100))}
              className="w-full accent-amber-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:border-gray-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-lg border border-amber-700 bg-amber-900/30 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:border-amber-500"
          >
            Aplicar
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main Header ───────────────────────────────────────────────────────────────

export default function CharacterHeader() {
  const character = useCharacterStore((s) => s.character)
  const store = useCharacterStore()
  const { canSaveCharacters } = useFirebaseSession()
  const cloud = useFirebaseCharacters()
  const tree = useTalentTreeStore((s) => s.tree)
  const importTree = useTalentTreeStore((s) => s.importTree)
  const { derivedStats, attributes, conditionalBlockBonus } = useCharacterStats()
  const equipmentDefense = calculateEquipmentDefense(character.inventory ?? [], attributes)
  const totalBlockValue = equipmentDefense.blockValue + conditionalBlockBonus

  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const avatarBoxRef = useRef<HTMLDivElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false)
  const [pendingBase64, setPendingBase64] = useState<string | null>(null)
  const [pendingX, setPendingX] = useState(50)
  const [pendingY, setPendingY] = useState(50)
  const [pendingScale, setPendingScale] = useState(1)
  const [previewAspect, setPreviewAspect] = useState(1)

  const sheetOptions = useMemo(() => {
    const source = canSaveCharacters
      ? cloud.summaries.map((entry) => ({ ...entry, race: '' }))
      : Object.values(store.characters || {}).map((entry) => ({
          id: entry.id,
          name: entry.name || 'Sem nome',
          race: entry.race,
          divinity: entry.divinity,
        }))
    const current = {
      id: character.id,
      name: character.name || 'Novo Personagem',
      race: character.race,
      divinity: character.divinity,
    }
    return [current, ...source.filter((entry) => entry.id !== character.id)]
  }, [canSaveCharacters, character, cloud.summaries, store.characters])

  function selectSheet(value: string) {
    if (value === 'NEW') {
      store.createNewCharacter()
    } else if (value !== character.id) {
      if (canSaveCharacters) void cloud.loadRemoteCharacter(value)
      else store.switchCharacter(value)
    }
  }

  async function deleteCurrentSheet() {
    if (!window.confirm('Tem certeza que deseja excluir esta ficha?')) return
    if (canSaveCharacters) await cloud.deleteCharacter(character.id)
    else store.deleteCharacter(character.id)
  }

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

  function parsePos(pos?: string) {
    if (!pos) return { x: 50, y: 50 }
    const m = pos.trim().match(/^(-?\d+(?:\.\d+)?)%?\s+(-?\d+(?:\.\d+)?)%?$/)
    if (!m) return { x: 50, y: 50 }
    return { x: clamp(Number(m[1]), 0, 100), y: clamp(Number(m[2]), 0, 100) }
  }

  const avatarPos = parsePos(character.avatarPosition)
  const avatarScale = clamp(character.avatarScale ?? 1, 0.5, 2.5)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      if (!base64) return
      const resized = await resizeAvatarImage(base64)
      setPendingBase64(resized)
      setPendingX(50)
      setPendingY(50)
      setPendingScale(1)
      const box = avatarBoxRef.current
      if (box && box.offsetWidth > 0 && box.offsetHeight > 0)
        setPreviewAspect(box.offsetWidth / box.offsetHeight)
      setAvatarEditorOpen(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function applyAvatar() {
    if (!pendingBase64) return
    store.setAvatarBase64(pendingBase64)
    store.setAvatarPosition(`${pendingX}% ${pendingY}%`)
    store.setAvatarScale(pendingScale)
    setAvatarEditorOpen(false)
  }

  const handleExport = useCallback(() => {
    downloadTextFile(
      serializeCharacterFile(character, tree),
      `${fileNamePart(character.name, 'personagem')}_v2.json`,
    )
  }, [character, tree])

  useSaveShortcut(handleExport)

  function handleImport() {
    setImportError(null)
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed: unknown = JSON.parse(ev.target?.result as string)
        if (isCharacterFile(parsed)) {
          importTree(parsed.talentTree)
          store.loadCharacter(parsed.character)
        } else if (isCharacterData(parsed)) {
          store.loadCharacter(parsed)
        } else {
          throw new Error('JSON inválido')
        }
        setImportError(null)
      } catch {
        setImportError('Arquivo inválido. Use um JSON exportado da ficha.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <>
      {avatarEditorOpen && pendingBase64 && (
        <AvatarEditorModal
          base64={pendingBase64}
          x={pendingX}
          y={pendingY}
          scale={pendingScale}
          aspectRatio={previewAspect}
          onX={setPendingX}
          onY={setPendingY}
          onScale={setPendingScale}
          onApply={applyAvatar}
          onClose={() => setAvatarEditorOpen(false)}
        />
      )}

      <div className="rounded-xl border border-amber-200 bg-white px-4 py-3 shadow-sm dark:border-amber-900/30 dark:bg-gray-900/80 dark:shadow-lg">
        <div
          className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-3 dark:border-gray-800"
          title={HEADER_FIELD_DESCRIPTIONS.sheet}
        >
          <label className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
            Selecionar Ficha
          </label>
          <select
            value={character.id}
            disabled={cloud.loadingSummaries || cloud.loadingCharacterId !== null}
            onChange={(event) => selectSheet(event.target.value)}
            className="min-w-[200px] rounded border border-gray-300 bg-gray-100 px-3 py-1 text-sm font-medium text-gray-900 focus:border-amber-500 focus:outline-none disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {sheetOptions.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name || 'Sem Nome'}
                {entry.race ? `, ${entry.race}` : ''}. Nível {entry.divinity}
              </option>
            ))}
            <option value="NEW">+ Criar Novo Personagem</option>
          </select>
          <button
            type="button"
            disabled={cloud.loadingSummaries || cloud.saving || cloud.remainingSeconds > 0}
            onClick={() => void deleteCurrentSheet()}
            className="text-xs font-semibold text-red-500 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:text-red-300"
          >
            Excluir Ficha
          </button>
          {canSaveCharacters && (
            <button
              type="button"
              title={cloud.error || cloud.message || 'Salvar a ficha atual no Firebase'}
              disabled={cloud.loadingSummaries || cloud.saving || cloud.remainingSeconds > 0}
              onClick={() => void cloud.saveCharacter()}
              className="text-xs font-semibold text-emerald-600 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              {cloud.saving
                ? 'Salvando…'
                : cloud.remainingSeconds > 0
                  ? `Salvar em ${cloud.remainingSeconds}s`
                  : 'Salvar Ficha'}
            </button>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-6 md:flex-row">
          {/* Avatar */}
          <div className="flex shrink-0 flex-col gap-2 self-center md:w-56 md:min-w-56 md:self-stretch">
            <div
              ref={avatarBoxRef}
              onClick={() => avatarInputRef.current?.click()}
              className="group relative h-56 w-56 cursor-pointer overflow-hidden rounded-xl border-2 border-gray-300 bg-gray-100 shadow-inner transition hover:border-amber-500 md:h-full md:w-full dark:border-gray-700 dark:bg-gray-800"
              title="Clique para alterar a foto (max 256x256)"
            >
              {character.avatarBase64 ? (
                <img
                  src={character.avatarBase64}
                  alt="Avatar"
                  className="h-full w-full object-cover transition-transform"
                  style={{
                    objectPosition: `${avatarPos.x}% ${avatarPos.y}%`,
                    transformOrigin: `${avatarPos.x}% ${avatarPos.y}%`,
                    transform: `scale(${avatarScale})`,
                  }}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-gray-400 group-hover:opacity-90 dark:text-gray-500">
                  <span className="mb-2 text-4xl">📷</span>
                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">
                    Foto
                  </span>
                </div>
              )}
              {character.avatarBase64 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-xs font-bold tracking-wider text-white">TROCAR FOTO</span>
                </div>
              )}
            </div>
            {character.avatarBase64 && (
              <button
                onClick={() => {
                  const pos = parsePos(character.avatarPosition)
                  setPendingBase64(character.avatarBase64!)
                  setPendingX(pos.x)
                  setPendingY(pos.y)
                  setPendingScale(clamp(character.avatarScale ?? 1, 0.5, 2.5))
                  const box = avatarBoxRef.current
                  if (box && box.offsetWidth > 0 && box.offsetHeight > 0)
                    setPreviewAspect(box.offsetWidth / box.offsetHeight)
                  setAvatarEditorOpen(true)
                }}
                type="button"
                className="rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-gray-600 transition hover:border-amber-500 hover:text-amber-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-amber-400"
              >
                AJUSTAR ENQUADRAMENTO
              </button>
            )}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />

          {/* Character info */}
          <div className="flex flex-1 flex-col justify-center gap-5">
            {/* Top Row: Name, Race, Origin */}
            <div className="flex flex-wrap items-end gap-4">
              <div
                className="flex min-w-[200px] flex-1 cursor-help flex-col gap-0.5"
                title={HEADER_FIELD_DESCRIPTIONS.name}
              >
                <label className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
                  Nome
                </label>
                <input
                  value={character.name}
                  onChange={(e) => store.setCharacterName(e.target.value)}
                  placeholder="Nome do personagem"
                  title={HEADER_FIELD_DESCRIPTIONS.name}
                  className="rounded border border-gray-300 bg-gray-100 px-3 py-1.5 text-lg font-bold text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-600"
                />
              </div>
              <div
                className="flex min-w-[140px] cursor-help flex-col gap-0.5"
                title={HEADER_FIELD_DESCRIPTIONS.race}
              >
                <label className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
                  Raça
                </label>
                <input
                  value={character.race}
                  onChange={(e) => store.setRace(e.target.value)}
                  placeholder="Raça"
                  title={HEADER_FIELD_DESCRIPTIONS.race}
                  className="rounded border border-gray-300 bg-gray-100 px-3 py-1.5 text-base font-semibold text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-600"
                />
              </div>
              <div
                className="flex min-w-[180px] cursor-help flex-col gap-0.5"
                title={HEADER_FIELD_DESCRIPTIONS.origin}
              >
                <label className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
                  Origem
                  {character.origin &&
                    (() => {
                      const originDef = ALL_ORIGINS.find((origin) => origin.id === character.origin)
                      const skillName = originDef
                        ? (ALL_SKILLS.find((skill) => skill.id === originDef.skillId)?.name ??
                          originDef.skillId)
                        : null
                      return skillName ? (
                        <span className="ml-1.5 font-normal text-violet-500 normal-case dark:text-violet-400">
                          → {skillName}
                        </span>
                      ) : null
                    })()}
                </label>
                <select
                  value={character.origin ?? ''}
                  onChange={(e) => store.setOrigin(e.target.value)}
                  title={HEADER_FIELD_DESCRIPTIONS.origin}
                  className="rounded border border-gray-300 bg-gray-100 px-3 py-1.5 text-base font-semibold text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Sem origem</option>
                  {ALL_ORIGINS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <hr className="w-full border-gray-200 dark:border-gray-800" />

            {/* Bottom Row: Stats and Resources */}
            <div className="grid grid-cols-1 items-stretch gap-x-6 gap-y-2 sm:grid-cols-[max-content_minmax(280px,1fr)]">
              <div className="contents">
                <div className="flex items-center justify-center gap-4 px-3 py-2 sm:col-start-1 sm:row-start-1">
                  <StatBadge
                    label="Esquiva"
                    value={derivedStats.esquiva}
                    description={HEADER_FIELD_DESCRIPTIONS.esquiva}
                  />
                  <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
                  <StatBadge
                    label="Valor de Bloqueio"
                    value={totalBlockValue}
                    description={`${HEADER_FIELD_DESCRIPTIONS.bloqueio} Total atual: ${equipmentDefense.blockValue} dos equipamentos + ${conditionalBlockBonus} de bônus condicionais.`}
                  />
                </div>

                <div className="flex items-center justify-center gap-6 px-3 py-1.5 sm:col-start-1 sm:row-start-2">
                  <StatBadge
                    label="Resistência"
                    value={derivedStats.resistencia}
                    description={HEADER_FIELD_DESCRIPTIONS.resistencia}
                    detail="Defesa passiva"
                    prominent
                  />
                  <div className="h-10 w-px bg-gray-200 dark:bg-gray-700" />
                  <label
                    className="flex cursor-help flex-col items-center gap-0.5"
                    title={HEADER_FIELD_DESCRIPTIONS.divinity}
                  >
                    <span className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
                      Divindade
                    </span>
                    <IntegerInput
                      min={0}
                      max={100}
                      value={character.divinity}
                      onChange={store.setDivinity}
                      className="w-16 border-0 bg-transparent p-0 text-center text-xl leading-none font-bold text-gray-700 focus:outline-none dark:text-gray-200"
                    />
                    <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500">
                      Nível atual
                    </span>
                  </label>
                </div>
              </div>

              <div className="contents">
                <div className="flex items-center justify-center gap-4 px-4 py-2 sm:col-start-2 sm:row-start-1">
                  <ResourcePip
                    label="Vida"
                    description={HEADER_FIELD_DESCRIPTIONS.vida}
                    current={character.currentResources.vida}
                    max={derivedStats.vida}
                    color="text-rose-400"
                    onCurrentChange={store.setCurrentVida}
                  />
                  <div className="h-10 w-px bg-gray-200 dark:bg-gray-700" />
                  <ResourcePip
                    label="IEP"
                    description={HEADER_FIELD_DESCRIPTIONS.iep}
                    current={character.currentResources.iep}
                    max={derivedStats.iep}
                    color="text-sky-400"
                    onCurrentChange={store.setCurrentIep}
                  />
                  <div className="h-10 w-px bg-gray-200 dark:bg-gray-700" />
                  <ResourcePip
                    label="Pontos de Combate"
                    description={HEADER_FIELD_DESCRIPTIONS.pc}
                    current={character.currentResources.pc}
                    max={derivedStats.pc}
                    color="text-orange-400"
                    onCurrentChange={store.setCurrentPc}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2 sm:col-start-2 sm:row-start-2">
                  <CoinField
                    label="Platina"
                    description={HEADER_FIELD_DESCRIPTIONS.platina}
                    value={character.money.platina}
                    onChange={(v) => store.setMoney('platina', v)}
                    labelColor="text-cyan-500 dark:text-cyan-400"
                    inputColor="bg-white dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/50 focus:border-cyan-500"
                  />
                  <CoinField
                    label="Ouro"
                    description={HEADER_FIELD_DESCRIPTIONS.ouro}
                    value={character.money.ouro}
                    onChange={(v) => store.setMoney('ouro', v)}
                    labelColor="text-amber-500 dark:text-amber-400"
                    inputColor="bg-white dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50 focus:border-amber-500"
                  />
                  <CoinField
                    label="Prata"
                    description={HEADER_FIELD_DESCRIPTIONS.prata}
                    value={character.money.prata}
                    onChange={(v) => store.setMoney('prata', v)}
                    labelColor="text-gray-500 dark:text-gray-400"
                    inputColor="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 focus:border-gray-500"
                  />
                  <CoinField
                    label="Bronze"
                    description={HEADER_FIELD_DESCRIPTIONS.bronze}
                    value={character.money.bronze}
                    onChange={(v) => store.setMoney('bronze', v)}
                    labelColor="text-orange-700 dark:text-orange-400"
                    inputColor="bg-white dark:bg-orange-950/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800/50 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr className="my-4 w-full border-gray-200 dark:border-gray-800" />

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() =>
              store.restoreAllResources(derivedStats.vida, derivedStats.iep, derivedStats.pc)
            }
            title="Restaurar Vida, IEP e Pontos de Combate"
            className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-amber-500 hover:text-amber-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-amber-400"
          >
            ⟳ Descansar
          </button>

          <div className="hidden h-5 w-px bg-gray-200 sm:block dark:bg-gray-700" />

          <button
            onClick={handleExport}
            title="Exportar ficha como JSON"
            className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-sky-500 hover:text-sky-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-sky-400"
          >
            ↓ Exportar
          </button>
          <button
            onClick={handleImport}
            title="Importar ficha de um JSON"
            className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-emerald-500 hover:text-emerald-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-emerald-400"
          >
            ↑ Importar
          </button>

          <div className="hidden h-5 w-px bg-gray-200 sm:block dark:bg-gray-700" />

          {confirmReset ? (
            <span className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-red-500 dark:text-red-400">
                Apagar ficha?
              </span>
              <button
                onClick={() => {
                  store.resetCharacter()
                  setConfirmReset(false)
                }}
                className="rounded-lg border border-red-400 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60"
              >
                Sim
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="rounded-lg border border-gray-300 bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                Não
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              title="Resetar ficha para o estado inicial"
              className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-red-500 hover:text-red-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-red-400"
            >
              ✕ Resetar
            </button>
          )}
        </div>
        {importError && <p className="mt-2 text-xs text-red-400">{importError}</p>}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  )
}
