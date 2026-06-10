const PDF_URL = '/overgrown-project.pdf'

export default function PdfPage() {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2">
        <h1 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
          Overgrown Project
        </h1>
        <a
          href={PDF_URL}
          download
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 transition hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400"
        >
          ↓ Baixar PDF
        </a>
      </div>
      <iframe
        src={PDF_URL}
        title="Overgrown Project"
        className="flex-1 w-full border-0"
      />
    </div>
  )
}
