import { useCharacterStore } from '../store/characterStore'

export default function NotesPanel() {
  const notes = useCharacterStore((s) => s.character.notes ?? '')
  const setNotes = useCharacterStore((s) => s.setNotes)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">
          ✎ Notas
        </h2>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          Observações livres da ficha
        </span>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={8}
        placeholder="Anotações, lembretes, regras da mesa, efeitos temporários..."
        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-y focus:border-amber-500 focus:outline-none"
      />
    </div>
  )
}