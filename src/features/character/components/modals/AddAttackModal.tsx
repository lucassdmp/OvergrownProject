import { useMemo, useRef, useState } from 'react'
import Modal from '../../../../components/ui/Modal'
import type { CharacterAttack, CombatCategory } from '../../../../types/game'
import { COMBAT_CATEGORY_LABELS } from '../../../../types/game'
import { combatSkillToAttack, getBookCombatSkills, parseCombatSkills } from '../../../../lib/bookImport'
import { useCharacterStore } from '../../store/characterStore'

interface Props {
  onClose: () => void
  existing?: CharacterAttack
}

export default function AddAttackModal({ onClose, existing }: Props) {
  const addAttack = useCharacterStore((s) => s.addAttack)
  const updateAttack = useCharacterStore((s) => s.updateAttack)
  const importAttacks = useCharacterStore((s) => s.importAttacks)
  const existingAttacks = useCharacterStore((s) => s.character.characterAttacks)

  const isEditing = Boolean(existing)
  const [name, setName] = useState(existing?.name ?? '')
  const [cost, setCost] = useState(existing?.cost ?? '')
  const [damage, setDamage] = useState(existing?.damage ?? '')
  const [category, setCategory] = useState<CombatCategory>(existing?.category ?? 'melee')
  const [description, setDescription] = useState(existing?.description ?? '')

  const [activeTab, setActiveTab] = useState<'manual' | 'library' | 'import'>(isEditing ? 'manual' : 'library')
  const [libraryQuery, setLibraryQuery] = useState('')
  const [libraryCategory, setLibraryCategory] = useState<CombatCategory | 'all'>('all')
  const [selectedAttackIds, setSelectedAttackIds] = useState<string[]>([])
  const [importCategory, setImportCategory] = useState<CombatCategory>('melee')
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existingNames = useMemo(
    () => new Set((existingAttacks ?? []).map((attack) => attack.name.toLowerCase())),
    [existingAttacks],
  )

  const allCombatSkills = useMemo(() => getBookCombatSkills(), [])

  const filteredLibrary = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase()
    return allCombatSkills.filter((skill) => {
      const matchesCategory = libraryCategory === 'all' || skill.category === libraryCategory
      const matchesQuery = !query || skill.name.toLowerCase().includes(query)
      return matchesCategory && matchesQuery
    })
  }, [allCombatSkills, libraryCategory, libraryQuery])

  function handleSave() {
    if (!name.trim()) return
    const attack: CharacterAttack = {
      id: existing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      cost: cost.trim(),
      damage: damage.trim() || undefined,
      category,
      description: description.trim(),
    }
    if (existing) updateAttack(attack)
    else addAttack(attack)
    onClose()
  }

  function toggleSelected(id: string) {
    setSelectedAttackIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    )
  }

  function handleAddSelectedFromLibrary() {
    if (selectedAttackIds.length === 0) return
    const selected = allCombatSkills.filter((skill) => selectedAttackIds.includes(skill.id))
    importAttacks(selected.map((skill) => combatSkillToAttack(skill)))
    onClose()
  }

  function handleAddSingleFromLibrary(skillId: string) {
    const skill = allCombatSkills.find((entry) => entry.id === skillId)
    if (!skill) return
    importAttacks([combatSkillToAttack(skill)])
    onClose()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImportText((ev.target?.result as string) ?? '')
      setImportError(null)
    }
    reader.onerror = () => setImportError('Erro ao ler arquivo.')
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleImport() {
    if (!importText.trim()) return
    try {
      let list: CharacterAttack[] = []
      if (importText.includes('\\combatSkill')) {
        list = parseCombatSkills(importText, importCategory)
      } else {
        const data = JSON.parse(importText)
        list = Array.isArray(data) ? data : [data]
      }

      if (list.length === 0) throw new Error('Nenhum ataque encontrado.')
      importAttacks(list)
      onClose()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erro ao processar importação.')
    }
  }

  const inputClass =
    'w-full rounded bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white focus:border-amber-600 focus:outline-none'

  return (
    <Modal title={existing ? 'Editar Ataque / Habilidade' : 'Adicionar Ataque / Habilidade'} onClose={onClose} size="md">
      {!isEditing && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {([
            { id: 'library', label: 'Biblioteca' },
            { id: 'import', label: 'Importar Livro' },
            { id: 'manual', label: 'Manual' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
                activeTab === tab.id
                  ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'library' && !isEditing && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="Buscar habilidade..."
              className={inputClass}
            />
            <div className="flex gap-1">
              {(['all', 'melee', 'ranged', 'effort'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setLibraryCategory(cat)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition border ${
                    libraryCategory === cat
                      ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                      : 'border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {cat === 'all' ? 'Todos' : COMBAT_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-gray-800">
            {filteredLibrary.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-gray-500">Nenhuma habilidade encontrada.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {filteredLibrary.map((skill) => {
                  const selected = selectedAttackIds.includes(skill.id)
                  const alreadyAdded = existingNames.has(skill.name.toLowerCase())
                  return (
                    <div key={skill.id} className="flex items-start gap-3 px-3 py-2">
                      <button
                        onClick={() => toggleSelected(skill.id)}
                        className={`mt-1 h-4 w-4 rounded border ${
                          selected ? 'bg-amber-500 border-amber-400' : 'border-gray-600'
                        }`}
                        title={selected ? 'Selecionado' : 'Selecionar'}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-100">{skill.name}</span>
                          <span className="rounded-full border border-gray-700 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
                            {COMBAT_CATEGORY_LABELS[skill.category]}
                          </span>
                          {alreadyAdded && (
                            <span className="rounded-full border border-amber-700/40 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                              Já adicionada
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{skill.description}</p>
                      </div>
                      <button
                        onClick={() => handleAddSingleFromLibrary(skill.id)}
                        className="rounded-full border border-amber-500/50 px-2.5 py-0.5 text-xs font-semibold text-amber-400 hover:border-amber-400"
                      >
                        Adicionar
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-4 py-1.5 text-sm font-semibold text-gray-400 transition hover:border-gray-500 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddSelectedFromLibrary}
              disabled={selectedAttackIds.length === 0}
              className="rounded-lg bg-amber-800 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40"
            >
              Adicionar selecionadas
            </button>
          </div>
        </div>
      )}

      {activeTab === 'import' && !isEditing && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-300 hover:border-gray-500"
            >
              Selecionar arquivo
            </button>
            <span className="text-xs text-gray-500">.tex, .txt, .json</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tex,.txt,.json"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">Categoria:</label>
              <select
                value={importCategory}
                onChange={(e) => setImportCategory(e.target.value as CombatCategory)}
                className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-200"
              >
                {(['melee', 'ranged', 'effort'] as const).map((cat) => (
                  <option key={cat} value={cat}>
                    {COMBAT_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value)
              setImportError(null)
            }}
            rows={8}
            placeholder="Cole o conteudo do livro (\\combatSkill...)"
            className={`${inputClass} resize-none font-mono text-xs`}
          />

          {importError && <p className="text-xs text-red-400">{importError}</p>}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-4 py-1.5 text-sm font-semibold text-gray-400 transition hover:border-gray-500 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="rounded-lg bg-amber-800 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40"
            >
              Importar
            </button>
          </div>
        </div>
      )}

      {activeTab === 'manual' && (
        <>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Nome *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Fúria" className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Custo de PC</label>
                <input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="ex: 2" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Dano (opcional)</label>
                <input
                  value={damage}
                  onChange={(e) => setDamage(e.target.value)}
                  placeholder="ex: 1D8 + FOR"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400">Categoria</label>
              <div className="flex gap-2">
                {(['melee', 'ranged', 'effort'] as CombatCategory[]).map((cat) => {
                  const labels = { melee: 'Corpo a Corpo', ranged: 'Distância', effort: 'Esforço' }
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`flex-1 rounded py-1.5 text-xs font-semibold transition border ${
                        category === cat
                          ? 'border-amber-600 bg-amber-900/30 text-amber-300'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {labels[cat]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Descreva o efeito do ataque ou habilidade..."
                className={`${inputClass} resize-none`}
              />
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
        </>
      )}
    </Modal>
  )
}
