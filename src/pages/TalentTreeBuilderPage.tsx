import { useRef, useState } from 'react'
import TalentTreeCanvas, { type CanvasMode } from '../features/talentTree/components/TalentTreeCanvas'
import NodeEditPanel from '../features/talentTree/components/NodeEditPanel'
import { useTalentTreeStore, serializeTree } from '../features/talentTree/store/talentTreeStore'
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS, type TalentNodeType, type TalentTree } from '../types/talentTree'
import { useDarkMode } from '../hooks/useDarkMode'

// ── Toolbar button ────────────────────────────────────────────────────────────

const ADD_TYPES: TalentNodeType[] = ['player', 'attribute', 'magic', 'stat', 'combatAbility', 'extraDamage', 'healing']

const ADD_TYPE_ICONS: Record<TalentNodeType, string> = {
  player:        '👤',
  attribute:     'A',
  magic:         '✦',
  stat:          '★',
  combatAbility: '⚔',
  extraDamage:   '⊕',
  healing:       '✚',
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TalentTreeBuilderPage() {
  const { tree, setTreeName, setTreeDescription, importTree, resetTree } = useTalentTreeStore()
  const [isDark, toggleDark] = useDarkMode()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<CanvasMode>('select')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)

  // ── Export ─────────────────────────────────────────────────────────────────

  function handleExport() {
    const json = serializeTree(tree)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tree.name.replace(/\s+/g, '_') || 'arvore'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import ─────────────────────────────────────────────────────────────────

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
        const parsed = JSON.parse(ev.target?.result as string) as TalentTree
        if (!parsed.nodes || !parsed.edges || !parsed.name) throw new Error()
        importTree(parsed)
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
      <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <header className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm flex-wrap">

          {/* Back link */}
          <a
            href="/"
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline shrink-0"
          >← Ficha</a>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

          {/* Tree name */}
          <div className="flex items-center gap-1.5 min-w-0">
            {editingName ? (
              <input
                autoFocus
                type="text"
                value={tree.name}
                onChange={(e) => setTreeName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                className="rounded border border-amber-400 bg-transparent px-2 py-0.5 text-sm font-bold focus:outline-none min-w-0"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-sm font-bold truncate hover:text-amber-600 dark:hover:text-amber-400 transition"
                title="Clique para renomear"
              >
                {tree.name || 'Sem título'}
              </button>
            )}
            <span className="text-gray-300 dark:text-gray-700 text-xs shrink-0">✏</span>
          </div>

          {/* Desc */}
          <div className="flex items-center gap-1.5 min-w-0">
            {editingDesc ? (
              <input
                autoFocus
                type="text"
                value={tree.description}
                onChange={(e) => setTreeDescription(e.target.value)}
                onBlur={() => setEditingDesc(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingDesc(false)}
                placeholder="Descrição…"
                className="rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-0.5 text-xs focus:outline-none min-w-0 text-gray-500"
              />
            ) : (
              <button
                onClick={() => setEditingDesc(true)}
                className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 truncate max-w-[200px]"
                title="Clique para editar a descrição"
              >
                {tree.description || 'Sem descrição…'}
              </button>
            )}
          </div>

          {/* Node count badge */}
          <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            {tree.nodes.length} nós · {tree.edges.length} conexões
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button onClick={handleExport} className="rounded-lg border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/30 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition">
              ↓ Exportar
            </button>
            <button onClick={handleImportClick} className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition">
              ↑ Importar
            </button>
            {confirmReset ? (
              <span className="flex items-center gap-1">
                <span className="text-xs text-red-500">Apagar árvore?</span>
                <button onClick={handleReset} className="rounded px-2 py-1 text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition">Sim</button>
                <button onClick={() => setConfirmReset(false)} className="rounded px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">Não</button>
              </span>
            ) : (
              <button onClick={() => setConfirmReset(true)} className="rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-500 hover:border-red-400 hover:text-red-500 transition">
                ✕ Resetar
              </button>
            )}
            <button onClick={toggleDark} className="rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              {isDark ? '☀' : '🌙'}
            </button>
          </div>
        </header>

        {/* Import error */}
        {importError && (
          <div className="px-4 py-1.5 bg-red-50 dark:bg-red-950/30 text-xs text-red-500 border-b border-red-200 dark:border-red-900/40">
            {importError}
          </div>
        )}

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center gap-1 px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-wrap">

          {/* Select mode */}
          <button
            onClick={() => setMode('select')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold border transition ${
              mode === 'select'
                ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            ↖ Selecionar
          </button>

          {/* Connect mode */}
          <button
            onClick={() => setMode('connect')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold border transition ${
              mode === 'connect'
                ? 'bg-slate-600 text-white border-slate-600'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            ⟶ Conectar
          </button>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Add-type buttons */}
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mr-1">Adicionar:</span>
          {ADD_TYPES.map((t) => {
            const c = NODE_TYPE_COLORS[t]
            const active = mode === `add-${t}`
            return (
              <button
                key={t}
                onClick={() => setMode(`add-${t}` as CanvasMode)}
                title={`Adicionar nó: ${NODE_TYPE_LABELS[t]}`}
                className="rounded-lg px-2.5 py-1 text-xs font-bold border transition flex items-center gap-1"
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

          {/* Hint */}
          <span className="text-[10px] text-gray-300 dark:text-gray-700">
            Scroll = zoom · Arrastar fundo = mover · Del = remover selecionado · Click direito = menu
          </span>
        </div>

        {/* ── Main area ───────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 gap-0">

          {/* Canvas */}
          <div className="flex-1 min-w-0 p-3">
            <TalentTreeCanvas
              mode={mode}
              setMode={setMode}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={(id) => { setSelectedNodeId(id) }}
            />
          </div>

          {/* Edit panel */}
          <div className={`shrink-0 w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col overflow-hidden transition-all ${selectedNodeId ? 'opacity-100' : 'opacity-60'}`}>
            {selectedNodeId
              ? <NodeEditPanel nodeId={selectedNodeId} />
              : (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                  <span className="text-4xl opacity-20">🌳</span>
                  <p className="text-sm text-gray-400 dark:text-gray-600">
                    Selecione um nó para editar suas propriedades
                  </p>
                  <p className="text-xs text-gray-300 dark:text-gray-700">
                    Ou clique com o botão direito em qualquer nó para mais opções
                  </p>
                </div>
              )
            }
          </div>
        </div>

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />
      </div>
    </div>
  )
}
