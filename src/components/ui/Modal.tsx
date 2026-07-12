import { type ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg' | 'xl'
}

export default function Modal({ title, onClose, children, size = 'md' }: ModalProps) {
  const widthClass = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-500/35 backdrop-blur-sm dark:bg-black/70"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`relative z-10 w-full ${widthClass} max-h-[90vh] overflow-y-auto rounded-xl border border-amber-200 bg-white text-gray-800 shadow-2xl dark:border-amber-900/40 dark:bg-gray-900 dark:text-gray-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-bold text-amber-700 dark:text-amber-400">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
