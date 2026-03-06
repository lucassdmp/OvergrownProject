import { useRef, useState } from 'react'
import { useCharacterStore } from '../store/characterStore'
import { useCharacter } from '../hooks/useCharacter'
import type { Character } from '../../../types/game'

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
        const parsed = JSON.parse(ev.target?.result as string) as Character
        if (!parsed.name || !parsed.attributes) throw new Error('Formato inválido')
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
