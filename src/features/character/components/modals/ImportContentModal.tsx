import { useState, useRef } from 'react'
import Modal from '../../../../components/ui/Modal'

interface ImportContentModalProps {
  title: string
  onClose: () => void
  onImport: (content: string) => void
  acceptedFormats?: string
}

export default function ImportContentModal({ title, onClose, onImport, acceptedFormats = '.json,.txt,.tex' }: ImportContentModalProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    readFile(file)
    e.target.value = '' // reset
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      readFile(file)
    }
  }

  function readFile(file: File) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      setText(ev.target?.result as string)
      setError(null)
    }
    reader.onerror = () => setError('Erro ao ler arquivo')
    reader.readAsText(file)
  }

  function handleSubmit() {
    if (!text.trim()) {
      setError('O conteúdo está vazio.')
      return
    }
    try {
      onImport(text)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar importação.')
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6 transition hover:bg-gray-100 dark:hover:bg-gray-800"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
            onDrop={handleDrop}
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Arraste um arquivo aqui ({acceptedFormats})
            </p>
            <span className="my-2 text-xs text-gray-400">OU</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded bg-white dark:bg-gray-700 px-3 py-1 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Selecionar arquivo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFormats}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Text Area */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Ou cole o conteúdo aqui:
            </label>
            <textarea
              className="h-40 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none font-mono"
              placeholder="Cole o JSON ou texto..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50 transition"
            >
              Importar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
