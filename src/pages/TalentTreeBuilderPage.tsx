import { useCallback, useRef, useState } from 'react'
import TalentTreeCanvas, {
  type CanvasMode,
} from '../features/talentTree/components/TalentTreeCanvas'
import NodeEditPanel from '../features/talentTree/components/NodeEditPanel'
import { useTalentTreeStore } from '../features/talentTree/store/talentTreeStore'
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS, type TalentNodeType } from '../types/talentTree'
import { useDarkMode } from '../hooks/useDarkMode'
import { useSaveShortcut } from '../hooks/useSaveShortcut'
import { downloadTextFile, fileNamePart } from '../utils/downloadFile'
import { useCharacterStore } from '../features/character/store/characterStore'
import {
  isCharacterFile,
  isTalentTree,
  serializeCharacterFile,
} from '../features/character/utils/characterFile'
import { nodeMatchesSearch } from '../features/talentTree/nodeSearch'
import { useFirebaseTalentTreeSync } from '../features/talentTree/useFirebaseTalentTreeSync'

// ── Toolbar button ────────────────────────────────────────────────────────────

const ADD_TYPES: TalentNodeType[] = [
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

const ADD_TYPE_ICONS: Record<TalentNodeType, string> = {
  player: '👤',
  attribute: 'A',
  magic: '✦',
  stat: '★',
  combatAbility: '⚔',
  extraDamage: '⊕',
  healing: '✚',
  weaponBonus: '🗡',
  spellModifier: '✧',
  defenseBonus: '🛡',
  skillBonus: '📚',
  link: '⛓',
  conditional: '⚙',
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TalentTreeBuilderPage() {
  const { tree, setTreeName, setTreeDescription, importTree, resetTree } = useTalentTreeStore()
  const character = useCharacterStore((s) => s.character)
  const loadCharacter = useCharacterStore((s) => s.loadCharacter)
  const [isDark, toggleDark] = useDarkMode()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const playerNodeCount = tree.nodes.filter((node) => node.data.type === 'player').length

  const [mode, setMode] = useState<CanvasMode>('select')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchMatchCount = searchQuery.trim()
    ? tree.nodes.filter((node) => nodeMatchesSearch(node, searchQuery)).length
    : 0
  const { saveNow, status: saveStatus, error: saveError, lastSavedAt } = useFirebaseTalentTreeSync()

  // Grid & snap
  const [gridEnabled, setGridEnabled] = useState(false)
  const [gridSize, setGridSize] = useState(50)
  const [snapEnabled, setSnapEnabled] = useState(false)

  // ── Export ─────────────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    downloadTextFile(
      serializeCharacterFile(character, tree),
      `${fileNamePart(character.name, 'personagem')}.json`,
    )
  }, [character, tree])

  useSaveShortcut(() => {
    void saveNow()
  })

  // ── Sincronização e importação ─────────────────────────────────────────────
  // Importações também entram no fluxo de sincronização do Firebase.

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
        const parsed: unknown = JSON.parse(ev.target?.result as string)
        if (isCharacterFile(parsed)) {
          loadCharacter(parsed.character)
          importTree(parsed.talentTree)
        } else if (isTalentTree(parsed)) {
          importTree(parsed)
        } else {
          throw new Error()
        }
        setSelectedNodeId(null)
        setImportError(null)
      } catch {
        setImportError('Arquivo inválido. Use um JSON exportado desta ferramenta.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  function handleReset() {
    resetTree()
    setSelectedNodeId(null)
    setMode('select')
    setConfirmReset(false)
  }

  // ── layout ─────────────────────────────────────────────────────────────────

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="flex h-screen flex-col overflow-hidden bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-white">
        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {/* Back link */}
          <a
            href="/"
            className="shrink-0 text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400"
          >
            ← Ficha
          </a>

          <div className="h-5 w-px shrink-0 bg-gray-200 dark:bg-gray-700" />

          {/* Tree name */}
          <div className="flex min-w-0 items-center gap-1.5">
            {editingName ? (
              <input
                autoFocus
                type="text"
                value={tree.name}
                onChange={(e) => setTreeName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                className="min-w-0 rounded border border-amber-400 bg-transparent px-2 py-0.5 text-sm font-bold focus:outline-none"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="truncate text-sm font-bold transition hover:text-amber-600 dark:hover:text-amber-400"
                title="Clique para renomear"
              >
                {tree.name || 'Sem título'}
              </button>
            )}
            <span className="shrink-0 text-xs text-gray-300 dark:text-gray-700">✏</span>
          </div>

          {/* Desc */}
          <div className="flex min-w-0 items-center gap-1.5">
            {editingDesc ? (
              <input
                autoFocus
                type="text"
                value={tree.description}
                onChange={(e) => setTreeDescription(e.target.value)}
                onBlur={() => setEditingDesc(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingDesc(false)}
                placeholder="Descrição…"
                className="min-w-0 rounded border border-gray-300 bg-transparent px-2 py-0.5 text-xs text-gray-500 focus:outline-none dark:border-gray-700"
              />
            ) : (
              <button
                onClick={() => setEditingDesc(true)}
                className="max-w-[200px] truncate text-xs text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
                title="Clique para editar a descrição"
              >
                {tree.description || 'Sem descrição…'}
              </button>
            )}
          </div>

          {/* Node count badge */}
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {tree.nodes.length} nós · {tree.edges.length} conexões
          </span>

          <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
            {playerNodeCount} início{playerNodeCount === 1 ? '' : 's'}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons */}
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {/* Grid size slider — visible when grid is on */}
            {gridEnabled && (
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <span className="w-5 text-right font-mono">{gridSize}</span>
                <input
                  type="range"
                  min={20}
                  max={200}
                  step={10}
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="w-20 accent-blue-500"
                />
              </div>
            )}

            {/* Grid toggle switch */}
            <label
              className="group flex cursor-pointer items-center gap-1.5 select-none"
              title={gridEnabled ? 'Ocultar grid' : 'Mostrar grid'}
            >
              <span className="text-[11px] font-semibold text-gray-500 transition group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200">
                Grid
              </span>
              <div
                className={`relative h-[18px] w-8 rounded-full transition-colors duration-200 ${gridEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={gridEnabled}
                  onChange={(e) => {
                    setGridEnabled(e.target.checked)
                    if (!e.target.checked) setSnapEnabled(false)
                  }}
                />
                <span
                  className={`absolute top-[2px] left-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-transform duration-200 ${gridEnabled ? 'translate-x-[14px]' : ''}`}
                />
              </div>
            </label>

            {/* Snap toggle switch */}
            <label
              className="group flex cursor-pointer items-center gap-1.5 select-none"
              title="Encaixar nós nos cruzamentos do grid"
            >
              <span className="text-[11px] font-semibold text-gray-500 transition group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200">
                Snap
              </span>
              <div
                className={`relative h-[18px] w-8 rounded-full transition-colors duration-200 ${snapEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={snapEnabled}
                  onChange={(e) => {
                    setSnapEnabled(e.target.checked)
                    if (e.target.checked) setGridEnabled(true)
                  }}
                />
                <span
                  className={`absolute top-[2px] left-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-transform duration-200 ${snapEnabled ? 'translate-x-[14px]' : ''}`}
                />
              </div>
            </label>

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />

            <span
              title={
                saveError ??
                (lastSavedAt
                  ? `Último salvamento: ${lastSavedAt.toLocaleTimeString()}`
                  : saveStatus === 'disabled'
                    ? 'Configure o Firebase para ativar a colaboração em tempo real.'
                    : 'A árvore é sincronizada automaticamente pelo Firebase.')
              }
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                saveStatus === 'error'
                  ? 'border-red-400 bg-red-50 text-red-600 dark:bg-red-950/30'
                  : saveStatus === 'syncing' || saveStatus === 'connecting'
                    ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                    : saveStatus === 'disabled'
                      ? 'border-gray-300 text-gray-500 dark:border-gray-700'
                      : 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
              }`}
            >
              {saveStatus === 'error'
                ? '⚠ Erro ao salvar'
                : saveStatus === 'connecting'
                  ? '◌ Conectando ao Firebase…'
                  : saveStatus === 'syncing'
                    ? '● Sincronizando…'
                    : saveStatus === 'disabled'
                      ? 'Firebase não configurado · cópia local'
                      : '✓ Sincronizado em tempo real'}
            </span>
            <button
              onClick={handleExport}
              className="rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-600 transition hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-400 dark:hover:bg-sky-900/40"
            >
              ↓ Exportar Ficha + Árvore
            </button>
            <button
              onClick={handleImportClick}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
            >
              ↑ Importar
            </button>
            {confirmReset ? (
              <span className="flex items-center gap-1">
                <span className="text-xs text-red-500">Apagar árvore?</span>
                <button
                  onClick={handleReset}
                  className="rounded bg-red-500 px-2 py-1 text-xs font-bold text-white transition hover:bg-red-600"
                >
                  Sim
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="rounded border border-gray-300 px-2 py-1 text-xs transition hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  Não
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-500 transition hover:border-red-400 hover:text-red-500 dark:border-gray-700"
              >
                ✕ Resetar
              </button>
            )}
            <button
              onClick={toggleDark}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-500 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {isDark ? '☀' : '🌙'}
            </button>
          </div>
        </header>

        {/* Import error */}
        {importError && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-500 dark:border-red-900/40 dark:bg-red-950/30">
            {importError}
          </div>
        )}

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-gray-100 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
          {/* Select mode */}
          <button
            onClick={() => setMode('select')}
            className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
              mode === 'select'
                ? 'border-gray-800 bg-gray-800 text-white dark:border-gray-200 dark:bg-gray-200 dark:text-gray-900'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            ↖ Selecionar
          </button>

          {/* Connect mode */}
          <button
            onClick={() => setMode('connect')}
            className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
              mode === 'connect'
                ? 'border-slate-600 bg-slate-600 text-white'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            ⟶ Conectar
          </button>

          <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

          {/* Add-type buttons */}
          <span className="mr-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-600">
            Adicionar:
          </span>
          {ADD_TYPES.map((t) => {
            const c = NODE_TYPE_COLORS[t]
            const active = mode === `add-${t}`
            return (
              <button
                key={t}
                onClick={() => setMode(`add-${t}` as CanvasMode)}
                title={`Adicionar nó: ${NODE_TYPE_LABELS[t]}`}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition"
                style={{
                  background: active ? c.stroke : 'transparent',
                  borderColor: c.stroke,
                  color: active ? '#fff' : c.stroke,
                }}
              >
                {ADD_TYPE_ICONS[t]} {NODE_TYPE_LABELS[t]}
              </button>
            )
          })}

          <div className="flex-1" />

          <label className="relative flex w-64 shrink-0 items-center">
            <span className="pointer-events-none absolute left-2.5 text-xs text-gray-400">⌕</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar nós…"
              aria-label="Buscar nós da árvore"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1 pr-16 pl-7 text-xs text-gray-700 transition outline-none focus:border-amber-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            {searchQuery && (
              <span className="absolute right-2 flex items-center gap-1 text-[10px] text-gray-400">
                {searchMatchCount}
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar busca"
                  className="rounded px-0.5 text-sm leading-none hover:text-gray-700 dark:hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
          </label>

          {/* Hint */}
          <span className="text-[10px] text-gray-300 dark:text-gray-700">
            Scroll = zoom · Arrastar fundo = mover · Del = remover · Shift+Arrastar = selecionar
            área · Ctrl+Click = multi-selecionar · Ctrl+C/V = copiar/colar · Ctrl+Bot.Dir = conectar
            rápido
          </span>
        </div>

        {/* ── Main area ───────────────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1 gap-0">
          {/* Canvas */}
          <div className="min-w-0 flex-1 p-3">
            <TalentTreeCanvas
              mode={mode}
              setMode={setMode}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={(id) => {
                setSelectedNodeId(id)
              }}
              gridEnabled={gridEnabled}
              gridSize={gridSize}
              snapEnabled={snapEnabled}
              searchQuery={searchQuery}
            />
          </div>

          {/* Edit panel */}
          <div
            className={`flex w-80 shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white transition-all dark:border-gray-800 dark:bg-gray-900 ${selectedNodeId ? 'opacity-100' : 'opacity-60'}`}
          >
            {selectedNodeId ? (
              <NodeEditPanel nodeId={selectedNodeId} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="text-4xl opacity-20">🌳</span>
                <p className="text-sm text-gray-400 dark:text-gray-600">
                  Selecione um nó para editar suas propriedades
                </p>
                <p className="text-xs text-gray-300 dark:text-gray-700">
                  Ou clique com o botão direito em qualquer nó para mais opções
                </p>
              </div>
            )}
          </div>
        </div>

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
  )
}
