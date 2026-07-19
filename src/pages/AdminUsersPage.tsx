import { useMemo, type ComponentType } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminUsersSection from '../features/admin/AdminUsersSection'

interface AdminSectionDefinition {
  id: string
  label: string
  description: string
  icon: string
  component: ComponentType
}

// New administration modules only need a component and one registry entry.
// Keeping navigation metadata here avoids coupling future settings to users.
const ADMIN_SECTIONS: AdminSectionDefinition[] = [
  {
    id: 'usuarios',
    label: 'Usuários',
    description: 'Acessos, papéis e fichas',
    icon: '♟',
    component: AdminUsersSection,
  },
]

export default function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedSection = searchParams.get('secao')
  const activeSection = useMemo(
    () => ADMIN_SECTIONS.find((section) => section.id === requestedSection) ?? ADMIN_SECTIONS[0],
    [requestedSection],
  )
  const ActiveSection = activeSection.component

  function selectSection(sectionId: string) {
    setSearchParams(sectionId === ADMIN_SECTIONS[0].id ? {} : { secao: sectionId })
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-6 lg:py-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-fit overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-20 dark:border-gray-800 dark:bg-gray-900/80">
          <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-800">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-600 uppercase dark:text-amber-400">
              Administração
            </p>
            <h1 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">Painel</h1>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Gerencie os módulos administrativos do projeto.
            </p>
          </div>

          <nav
            className="flex gap-2 overflow-x-auto p-2 lg:flex-col"
            aria-label="Seções administrativas"
          >
            {ADMIN_SECTIONS.map((section) => {
              const selected = section.id === activeSection.id
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => selectSection(section.id)}
                  className={`flex min-w-52 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition lg:min-w-0 ${
                    selected
                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/35 dark:text-amber-300'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
                      selected
                        ? 'bg-amber-700 text-white'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                    aria-hidden="true"
                  >
                    {section.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold">{section.label}</span>
                    <span className="block truncate text-[10px] opacity-70">
                      {section.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          <ActiveSection />
        </div>
      </div>
    </main>
  )
}
