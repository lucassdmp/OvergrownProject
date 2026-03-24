import { useRef, useState } from 'react'
import { useCharacterStore } from '../store/characterStore'
import { useCharacter } from '../hooks/useCharacter'
import { ALL_ORIGINS } from '../../../data/origins'
import { ALL_SKILLS } from '../../../data/skills'
import Modal from '../../../components/ui/Modal'

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
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={max}
          value={current}
          onChange={(e) => onCurrentChange(Math.max(0, Math.min(max, Number(e.target.value))))}
          className={`w-14 rounded bg-gray-100 dark:bg-gray-800 px-1 py-0.5 text-center text-lg font-bold ${color} border border-gray-300 dark:border-gray-700 focus:border-amber-500 focus:outline-none`}
        />
        <span className="text-gray-500">/</span>
        <span className="text-base font-semibold text-gray-600 dark:text-gray-300">{max}</span>
      </div>
    </div>
  )
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{value}</span>
    </div>
  )
}

export default function CharacterHeader() {
  const { character, derivedStats } = useCharacter()
  const store = useCharacterStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false)
  const [pendingAvatarBase64, setPendingAvatarBase64] = useState<string | null>(null)
  const [pendingAvatarX, setPendingAvatarX] = useState(50)
  const [pendingAvatarY, setPendingAvatarY] = useState(50)
  const [pendingAvatarScale, setPendingAvatarScale] = useState(1)

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
  const parseAvatarPosition = (position?: string) => {
    if (!position) return { x: 50, y: 50 }
    const match = position.trim().match(/^(-?\d+(?:\.\d+)?)%?\s+(-?\d+(?:\.\d+)?)%?$/)
    if (!match) return { x: 50, y: 50 }
    return {
      x: clamp(Number(match[1]), 0, 100),
      y: clamp(Number(match[2]), 0, 100),
    }
  }

  const currentAvatarPos = parseAvatarPosition(character.avatarPosition)
  const currentAvatarScale = clamp(character.avatarScale ?? 1, 0.5, 2.5)

  // ── Avatar ──────────────────────────────────────────────────────────────────
  function handleAvatarClick() {
    avatarInputRef.current?.click()
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      if (!base64) return
      setPendingAvatarBase64(base64)
      setPendingAvatarX(50)
      setPendingAvatarY(50)
      setPendingAvatarScale(1)
      setAvatarEditorOpen(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleOpenAvatarEditor() {
    if (!character.avatarBase64) return
    const pos = parseAvatarPosition(character.avatarPosition)
    setPendingAvatarBase64(character.avatarBase64)
    setPendingAvatarX(pos.x)
    setPendingAvatarY(pos.y)
    setPendingAvatarScale(clamp(character.avatarScale ?? 1, 0.5, 2.5))
    setAvatarEditorOpen(true)
  }

  function handleApplyAvatarEditor() {
    if (!pendingAvatarBase64) return
    store.setAvatarBase64(pendingAvatarBase64)
    store.setAvatarPosition(`${pendingAvatarX}% ${pendingAvatarY}%`)
    store.setAvatarScale(pendingAvatarScale)
    setAvatarEditorOpen(false)
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  function handleExport() {
    const json = JSON.stringify(character, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${character.name.replace(/\s+/g, '_') || 'personagem'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import ──────────────────────────────────────────────────────────────────
  function handleImportClick() {
    setImportError(null)
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (!parsed || typeof parsed !== 'object') throw new Error('JSON inválido')
        // Basic validation of required fields for a character file
        if (!parsed.name && !parsed.attributes) throw new Error('Formato inválido: nome ou atributos faltando')
        
        store.loadCharacter(parsed)
        setImportError(null)
      } catch {
        setImportError('Arquivo inválido. Use um JSON exportado desta ficha.')
      }
    }
    reader.readAsText(file)
    // reset so the same file can be re-imported
    e.target.value = ''
  }

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-900/30 bg-white dark:bg-gray-900/80 px-4 py-3 shadow-sm dark:shadow-lg">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-800">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Selecionar Ficha</label>
        <select
          value={character.id}
          onChange={(e) => {
            const val = e.target.value
            if (val === 'NEW') {
              store.createNewCharacter()
            } else {
              store.switchCharacter(val)
            }
          }}
          className="rounded bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm font-medium text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:border-amber-500 focus:outline-none min-w-[200px]"
        >
          {Object.values(store.characters || {}).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || 'Sem Nome'} {c.race ? `(${c.race})` : ''} - Nível {c.divinity}
            </option>
          ))}
          <option value="NEW">+ Criar Novo Personagem</option>
        </select>
        
        {Object.keys(store.characters || {}).length > 1 && (
          <button
            onClick={() => {
              if (window.confirm('Tem certeza que deseja apagar esta ficha?')) {
                store.deleteCharacter(character.id)
              }
            }}
            className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold transition"
          >
            Excluir Ficha
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        {/* Avatar */}
        <div className="flex flex-col gap-2 shrink-0 self-center md:self-stretch md:w-56 md:min-w-56">
          <div
            onClick={handleAvatarClick}
            className="group relative h-56 w-56 md:h-full md:w-full cursor-pointer overflow-hidden rounded-xl border-2 border-gray-300 bg-gray-100 transition hover:border-amber-500 dark:border-gray-700 dark:bg-gray-800 shadow-inner"
            title="Clique para alterar a foto (max 256x256)"
          >
            {character.avatarBase64 ? (
              <img 
                src={character.avatarBase64} 
                alt="Avatar" 
                className="h-full w-full object-cover transition-transform" 
                style={{
                  objectPosition: `${currentAvatarPos.x}% ${currentAvatarPos.y}%`,
                  transformOrigin: `${currentAvatarPos.x}% ${currentAvatarPos.y}%`,
                  transform: `scale(${currentAvatarScale})`
                }}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-gray-400 dark:text-gray-500 group-hover:opacity-90">
                <span className="text-4xl mb-2">📷</span>
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Foto</span>
              </div>
            )}
            {character.avatarBase64 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-bold tracking-wider">TROCAR FOTO</span>
              </div>
            )}
          </div>
          {character.avatarBase64 && (
            <button
              type="button"
              onClick={handleOpenAvatarEditor}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-gray-600 dark:text-gray-300 transition hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400"
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

        <div className="flex flex-1 flex-col gap-5 justify-center">
          {/* Top Row: Name, Race, Origin */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Name */}
            <div className="flex flex-col gap-0.5 min-w-[200px] flex-1">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Nome</label>
              <input
                value={character.name}
                onChange={(e) => store.setCharacterName(e.target.value)}
                placeholder="Nome do personagem"
                className="rounded bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-lg font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 border border-gray-300 dark:border-gray-700 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Race */}
            <div className="flex flex-col gap-0.5 min-w-[140px]">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Raça</label>
              <input
                value={character.race}
                onChange={(e) => store.setRace(e.target.value)}
                placeholder="Raça"
                className="rounded bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 border border-gray-300 dark:border-gray-700 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Origin */}
            <div className="flex flex-col gap-0.5 min-w-[180px]">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Origem
                {character.origin && (() => {
                  const originDef = ALL_ORIGINS.find((o) => o.id === character.origin)
                  const skillName = originDef ? (ALL_SKILLS.find((s) => s.id === originDef.skillId)?.name ?? originDef.skillId) : null
                  return skillName ? (
                    <span className="ml-1.5 normal-case font-normal text-violet-500 dark:text-violet-400">
                      → {skillName}
                    </span>
                  ) : null
                })()}
              </label>
              <select
                value={character.origin ?? ''}
                onChange={(e) => store.setOrigin(e.target.value)}
                className="rounded bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-base font-semibold text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:border-amber-500 focus:outline-none"
              >
                <option value="">Sem origem</option>
                {ALL_ORIGINS.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-800 w-full" />

          {/* Bottom Row: Stats and Resources */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-2 border border-gray-100 dark:border-gray-800/80">
              {/* Resistência */}
              <StatBadge label="Resistência" value={derivedStats.resistencia} />
              <div className="h-10 w-px bg-gray-200 dark:bg-gray-700" />
              {/* Esquiva */}
              <StatBadge label="Esquiva" value={derivedStats.esquiva} />
            </div>

            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-2 border border-gray-100 dark:border-gray-800/80">
              {/* Vida */}
              <ResourcePip
                label="Vida"
                current={character.currentResources.vida}
                max={derivedStats.vida}
                color="text-rose-400"
                onCurrentChange={store.setCurrentVida}
              />
              <div className="h-10 w-px bg-gray-200 dark:bg-gray-700" />
              {/* IEP */}
              <ResourcePip
                label="IEP"
                current={character.currentResources.iep}
                max={derivedStats.iep}
                color="text-sky-400"
                onCurrentChange={store.setCurrentIep}
              />
              <div className="h-10 w-px bg-gray-200 dark:bg-gray-700" />
              {/* PC */}
              <ResourcePip
                label="Pontos de Combate"
                current={character.currentResources.pc}
                max={derivedStats.pc}
                color="text-orange-400"
                onCurrentChange={store.setCurrentPc}
              />
            </div>
            
            <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-2 border border-gray-100 dark:border-gray-800/80 min-w-[120px] flex items-center justify-center">
              {/* Money */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 dark:text-amber-400">Ouro</span>
                <div className="relative flex items-center">
                  <span className="absolute left-2 text-sm z-10">🪙</span>
                  <input
                    type="number"
                    min={0}
                    value={character.money || 0}
                    onChange={(e) => store.setMoney(Math.max(0, Number(e.target.value)))}
                    className="w-full min-w-[80px] rounded-full bg-white dark:bg-amber-950/30 pl-7 pr-2 py-0.5 text-center text-lg font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      <hr className="border-gray-200 dark:border-gray-800 w-full my-4" />

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* Restore */}
        <button
          onClick={store.restoreAllResources}
          title="Descanso longo – restaurar todos os recursos"
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 transition hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400"
        >
          ⟳ Descanso
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />

        {/* Export */}
        <button
          onClick={handleExport}
          title="Exportar ficha como JSON"
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 transition hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400"
        >
          ↓ Exportar
        </button>

        {/* Import */}
        <button
          onClick={handleImportClick}
          title="Importar ficha de um JSON"
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 transition hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          ↑ Importar
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />

        {/* Reset */}
        {confirmReset ? (
          <span className="flex items-center gap-1.5">
            <span className="text-xs text-red-500 dark:text-red-400 font-semibold">Apagar ficha?</span>
            <button
              onClick={() => { store.resetCharacter(); setConfirmReset(false) }}
              className="rounded-lg border border-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/60"
            >
              Sim
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 transition hover:border-gray-400"
            >
              Não
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            title="Resetar ficha para o estado inicial"
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 transition hover:border-red-500 hover:text-red-500 dark:hover:text-red-400"
          >
            ✕ Resetar
          </button>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Import error */}
      {importError && (
        <p className="mt-2 text-xs text-red-400">{importError}</p>
      )}

      {avatarEditorOpen && pendingAvatarBase64 && (
        <Modal title="Ajustar Foto" onClose={() => setAvatarEditorOpen(false)} size="md">
          <div className="flex flex-col gap-4">
            <div className="mx-auto h-64 w-64 overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
              <img
                src={pendingAvatarBase64}
                alt="Pré-visualização"
                className="h-full w-full object-cover"
                style={{
                  objectPosition: `${pendingAvatarX}% ${pendingAvatarY}%`,
                  transformOrigin: `${pendingAvatarX}% ${pendingAvatarY}%`,
                  transform: `scale(${pendingAvatarScale})`,
                }}
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-300">
                  <span>Zoom</span>
                  <span>{Math.round(pendingAvatarScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={pendingAvatarScale}
                  onChange={(e) => setPendingAvatarScale(clamp(Number(e.target.value), 0.5, 2.5))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-300">
                  <span>Posição X</span>
                  <span>{pendingAvatarX}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={pendingAvatarX}
                  onChange={(e) => setPendingAvatarX(clamp(Number(e.target.value), 0, 100))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-300">
                  <span>Posição Y</span>
                  <span>{pendingAvatarY}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={pendingAvatarY}
                  onChange={(e) => setPendingAvatarY(clamp(Number(e.target.value), 0, 100))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAvatarEditorOpen(false)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:border-gray-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyAvatarEditor}
                className="rounded-lg border border-amber-700 bg-amber-900/30 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:border-amber-500"
              >
                Aplicar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
