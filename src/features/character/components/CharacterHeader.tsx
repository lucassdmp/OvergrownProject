import { useRef, useState } from 'react'
import { useCharacterStore } from '../store/characterStore'
import { useCharacter } from '../hooks/useCharacter'
import type { Character } from '../../../types/game'
import { ALL_ORIGINS } from '../../../data/origins'
import { ALL_SKILLS } from '../../../data/skills'

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
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

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
      <div className="flex flex-wrap items-end gap-4">
        {/* Name */}
        <div className="flex flex-col gap-0.5 min-w-[160px] flex-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Nome</label>
          <input
            value={character.name}
            onChange={(e) => store.setCharacterName(e.target.value)}
            placeholder="Nome do personagem"
            className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 border border-gray-300 dark:border-gray-700 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Race */}
        <div className="flex flex-col gap-0.5 min-w-[120px]">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Raça</label>
          <input
            value={character.race}
            onChange={(e) => store.setRace(e.target.value)}
            placeholder="Raça"
            className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 border border-gray-300 dark:border-gray-700 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Origin */}
        <div className="flex flex-col gap-0.5 min-w-[150px]">
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
            className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-sm font-medium text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="">Sem origem</option>
            {ALL_ORIGINS.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div className="hidden h-10 w-px bg-gray-200 dark:bg-gray-700 sm:block" />

        {/* Resistência */}
        <StatBadge label="Resistência" value={derivedStats.resistencia} />

        {/* Esquiva */}
        <StatBadge label="Esquiva" value={derivedStats.esquiva} />

        {/* Divider */}
        <div className="hidden h-10 w-px bg-gray-200 dark:bg-gray-700 sm:block" />

        {/* Vida */}
        <ResourcePip
          label="Vida"
          current={character.currentResources.vida}
          max={derivedStats.vida}
          color="text-rose-400"
          onCurrentChange={store.setCurrentVida}
        />

        {/* IEP */}
        <ResourcePip
          label="IEP"
          current={character.currentResources.iep}
          max={derivedStats.iep}
          color="text-sky-400"
          onCurrentChange={store.setCurrentIep}
        />

        {/* PC */}
        <ResourcePip
          label="Pontos de Combate"
          current={character.currentResources.pc}
          max={derivedStats.pc}
          color="text-orange-400"
          onCurrentChange={store.setCurrentPc}
        />

        {/* Divider */}
        <div className="hidden h-10 w-px bg-gray-200 dark:bg-gray-700 sm:block" />

        {/* Money */}
        <div className="flex flex-col items-center gap-0.5 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 dark:text-amber-400">Ouro</span>
          <div className="relative flex items-center">
            <span className="absolute left-2 text-sm">🪙</span>
            <input
              type="number"
              min={0}
              value={character.money || 0}
              onChange={(e) => store.setMoney(Math.max(0, Number(e.target.value)))}
              className="w-20 rounded-full bg-amber-50 dark:bg-amber-950/30 pl-7 pr-2 py-0.5 text-center text-lg font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Restore */}
          <button
            onClick={store.restoreAllResources}
            title="Descanso longo – restaurar todos os recursos"
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 transition hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400"
          >
            ⟳ Descanso
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

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
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

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
      </div>

      {/* Import error */}
      {importError && (
        <p className="mt-2 text-xs text-red-400">{importError}</p>
      )}
    </div>
  )
}
