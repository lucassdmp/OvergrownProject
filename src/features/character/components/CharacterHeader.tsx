import { useCallback, useRef, useState } from 'react'
import { useCharacterStore } from '../store/characterStore'
import { useCharacterStats } from '../hooks/useCharacterStats'
import { ALL_ORIGINS } from '../../../data/origins'
import Modal from '../../../components/ui/Modal'
import IntegerInput from '../../../components/ui/IntegerInput'
import { useSaveShortcut } from '../../../hooks/useSaveShortcut'
import { downloadTextFile, fileNamePart } from '../../../utils/downloadFile'
import { useTalentTreeStore } from '../../talentTree/store/talentTreeStore'
import { calculateEquipmentDefense } from '../../../lib/equipmentRules'
import { isCharacterFile, isCharacterData, serializeCharacterFile } from '../utils/characterFile'

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
  current,
  max,
  color,
  onCurrentChange,
}: {
  label: string
  current: number
  max: number
  color: string
  onCurrentChange: (v: number) => void
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5">
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
  value,
  onChange,
  labelColor,
  inputColor,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  labelColor: string
  inputColor: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-[10px] font-semibold tracking-widest uppercase ${labelColor}`}>
        {label}
      </span>
      <div className="relative flex items-center">
        <span className="absolute left-2 z-10 text-sm">🪙</span>
        <IntegerInput
          min={0}
          value={value}
          onChange={onChange}
          className={`w-full min-w-[80px] rounded-full border py-0.5 pr-2 pl-7 text-center text-lg font-bold focus:outline-none ${inputColor}`}
        />
      </div>
    </div>
  )
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
        {label}
      </span>
      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{value}</span>
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
    <Modal title="Ajustar Avatar" onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <div
          className="mx-auto overflow-hidden rounded-xl border-2 border-gray-600"
          style={{ width: '240px', height: `${240 / aspectRatio}px` }}
        >
          <img
            src={base64}
            alt="preview"
            className="h-full w-full object-cover"
            style={{
              objectPosition: `${x}% ${y}%`,
              transformOrigin: `${x}% ${y}%`,
              transform: `scale(${scale})`,
            }}
          />
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-gray-400">Posição Horizontal: {Math.round(x)}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={x}
              onChange={(e) => onX(clamp(Number(e.target.value), 0, 100))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Posição Vertical: {Math.round(y)}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={y}
              onChange={(e) => onY(clamp(Number(e.target.value), 0, 100))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Zoom: {scale.toFixed(2)}×</label>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.05}
              value={scale}
              onChange={(e) => onScale(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded px-4 py-1.5 text-sm text-gray-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={onApply}
            className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-amber-500"
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
  const characters = useCharacterStore((s) => s.characters)
  const store = useCharacterStore()
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

  const inpBase =
    'rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none'

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
        {/* Character selector */}
        <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
          <label className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
            Ficha
          </label>
          <select
            value={character.id}
            onChange={(e) => {
              const val = e.target.value
              if (val === 'NEW') store.createNewCharacter()
              else store.switchCharacter(val)
            }}
            className={inpBase + ' min-w-[200px]'}
          >
            {Object.values(characters || {}).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || 'Sem Nome'} {c.race ? `(${c.race})` : ''}
              </option>
            ))}
            <option value="NEW">+ Criar Novo Personagem</option>
          </select>
          {Object.keys(characters || {}).length > 1 && (
            <button
              onClick={() => {
                if (window.confirm('Apagar esta ficha?')) store.deleteCharacter(character.id)
              }}
              className="text-xs font-semibold text-red-500 hover:text-red-700 dark:text-red-400"
            >
              Excluir
            </button>
          )}
        </div>

        <div className="flex flex-col items-stretch gap-6 md:flex-row">
          {/* Avatar */}
          <div className="flex shrink-0 flex-col gap-2 self-center md:w-56 md:min-w-56 md:self-stretch">
            <div
              ref={avatarBoxRef}
              onClick={() => avatarInputRef.current?.click()}
              className="group relative h-56 w-56 cursor-pointer overflow-hidden rounded-xl border-2 border-gray-300 bg-gray-100 transition hover:border-amber-500 md:h-full md:w-full dark:border-gray-700 dark:bg-gray-800"
            >
              {character.avatarBase64 ? (
                <img
                  src={character.avatarBase64}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: `${avatarPos.x}% ${avatarPos.y}%`,
                    transformOrigin: `${avatarPos.x}% ${avatarPos.y}%`,
                    transform: `scale(${avatarScale})`,
                  }}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                  <span className="mb-2 text-4xl">📷</span>
                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">
                    Foto
                  </span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                <span className="text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                  Alterar
                </span>
              </div>
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
                className="text-center text-[10px] text-amber-500 hover:underline"
              >
                Ajustar posição
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Character info */}
          <div className="flex flex-1 flex-col gap-4">
            {/* Name, race, origin */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <div>
                <label className="mb-0.5 block text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
                  Nome
                </label>
                <input
                  type="text"
                  value={character.name}
                  onChange={(e) => store.setCharacterName(e.target.value)}
                  className={inpBase + ' w-full'}
                  placeholder="Nome do personagem"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
                  Raça
                </label>
                <input
                  type="text"
                  value={character.race}
                  onChange={(e) => store.setRace(e.target.value)}
                  className={inpBase + ' w-full'}
                  placeholder="Raça"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
                  Origem
                </label>
                <select
                  value={character.origin ?? ''}
                  onChange={(e) => store.setOrigin(e.target.value)}
                  className={inpBase + ' w-full'}
                >
                  <option value="">— Selecionar —</option>
                  {ALL_ORIGINS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
                  Divindade
                </label>
                <IntegerInput
                  min={0}
                  max={100}
                  value={character.divinity}
                  onChange={store.setDivinity}
                  className={inpBase + ' w-full'}
                />
              </div>
            </div>

            {/* Resources */}
            <div className="flex flex-wrap items-center gap-4">
              <ResourcePip
                label="Vida"
                current={character.currentResources.vida}
                max={derivedStats.vida}
                color="text-rose-600 dark:text-rose-400"
                onCurrentChange={(v) => store.setCurrentVida(v)}
              />
              <ResourcePip
                label="IEP"
                current={character.currentResources.iep}
                max={derivedStats.iep}
                color="text-violet-600 dark:text-violet-400"
                onCurrentChange={(v) => store.setCurrentIep(v)}
              />
              <ResourcePip
                label="PC"
                current={character.currentResources.pc}
                max={derivedStats.pc}
                color="text-amber-600 dark:text-amber-400"
                onCurrentChange={(v) => store.setCurrentPc(v)}
              />
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
              <StatBadge label="Resistência" value={derivedStats.resistencia} />
              <StatBadge label="Esquiva" value={derivedStats.esquiva} />
              <StatBadge label="VB" value={totalBlockValue} />
            </div>

            {/* Money */}
            <div className="flex flex-wrap items-center gap-3">
              <CoinField
                label="Platina"
                value={character.money.platina}
                labelColor="text-slate-300 dark:text-slate-400"
                inputColor="text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60"
                onChange={(v) => store.setMoney('platina', v)}
              />
              <CoinField
                label="Ouro"
                value={character.money.ouro}
                labelColor="text-yellow-600 dark:text-yellow-400"
                inputColor="text-yellow-700 dark:text-yellow-200 border-yellow-400 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30"
                onChange={(v) => store.setMoney('ouro', v)}
              />
              <CoinField
                label="Prata"
                value={character.money.prata}
                labelColor="text-gray-400 dark:text-gray-300"
                inputColor="text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60"
                onChange={(v) => store.setMoney('prata', v)}
              />
              <CoinField
                label="Bronze"
                value={character.money.bronze}
                labelColor="text-orange-600 dark:text-orange-400"
                inputColor="text-orange-700 dark:text-orange-200 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20"
                onChange={(v) => store.setMoney('bronze', v)}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  store.restoreAllResources(derivedStats.vida, derivedStats.iep, derivedStats.pc)
                }
                className="rounded-lg border border-emerald-400/60 px-3 py-1 text-xs font-bold text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              >
                🌿 Descanso
              </button>
              <button
                onClick={handleExport}
                className="rounded-lg border border-amber-400/60 px-3 py-1 text-xs font-bold text-amber-600 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
              >
                ↓ Exportar
              </button>
              <button
                onClick={handleImport}
                className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-bold text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                ↑ Importar
              </button>
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-400 transition hover:border-red-300 hover:text-red-500 dark:border-gray-700"
                >
                  Resetar
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-red-500">Confirmar?</span>
                  <button
                    onClick={() => {
                      store.resetCharacter()
                      setConfirmReset(false)
                    }}
                    className="text-xs font-bold text-red-500 hover:text-red-700"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Não
                  </button>
                </div>
              )}
            </div>
            {importError && <p className="text-xs text-red-500">{importError}</p>}
          </div>
        </div>
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
