import { useCharacterStore } from '../store/characterStore'

export default function NotesPanel() {
  const notes = useCharacterStore((s) => s.character.notes ?? '')
  const setNotes = useCharacterStore((s) => s.setNotes)

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
        Anotações
      </h2>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
        placeholder="Escreva notas sobre o personagem…"
        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 focus:border-amber-500 focus:outline-none resize-none leading-relaxed"
      />
    </div>
  )
}
