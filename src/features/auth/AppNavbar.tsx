import { Link } from 'react-router-dom'
import { isFirebaseConfigured, useFirebaseSession } from './firebaseSessionContext'

interface Props {
  isDark: boolean
  toggleDark: () => void
}

export default function AppNavbar({ isDark, toggleDark }: Props) {
  const {
    user,
    access,
    authReady,
    accessReady,
    authorized,
    canSaveCharacters,
    signingIn,
    error,
    login,
    logout,
  } = useFirebaseSession()
  return (
    <header className="sticky top-0 z-40 border-b border-amber-200/70 bg-white/95 shadow-sm backdrop-blur dark:border-amber-900/30 dark:bg-gray-950/95">
      <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center gap-3 px-4 py-2">
        <Link to="/" className="mr-2 font-bold tracking-wide text-amber-700 dark:text-amber-400">
          Overgrown
        </Link>

        <nav className="flex items-center gap-3 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <Link to="/" className="hover:text-amber-600 dark:hover:text-amber-400">
            Ficha
          </Link>
          <Link to="/livro" className="hover:text-amber-600 dark:hover:text-amber-400">
            Livro
          </Link>
          <Link to="/arvore" className="hover:text-amber-600 dark:hover:text-amber-400">
            Árvore
          </Link>
          {authorized && (access?.role === 'editor' || access?.role === 'admin') && (
            <Link
              to="/talent-tree-builder"
              className="text-amber-700 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
            >
              Builder
            </Link>
          )}
        </nav>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggleDark}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-base transition hover:border-amber-400 hover:text-amber-600 dark:border-gray-700 dark:bg-gray-800 dark:hover:text-amber-400"
          >
            {isDark ? '☀' : '🌙'}
          </button>

          {!isFirebaseConfigured ? (
            <span className="text-[11px] text-red-500">Firebase não configurado</span>
          ) : !authReady || (user && !accessReady) ? (
            <span className="text-[11px] text-gray-500">Verificando acesso…</span>
          ) : user ? (
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 py-1 pr-2 pl-1 dark:border-gray-700 dark:bg-gray-900">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuário Google'}
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white">
                  {(user.displayName || user.email || '?')[0].toUpperCase()}
                </span>
              )}
              <span className="hidden max-w-32 truncate text-[11px] sm:block">
                {user.displayName || user.email}
                <span className="block text-[9px] text-gray-500">
                  {authorized
                    ? `${access?.role}${canSaveCharacters ? ' · jogador' : ''}`
                    : 'Sem permissão'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-500 dark:text-amber-400"
              >
                Sair
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={signingIn}
              onClick={() => void login()}
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60"
            >
              {signingIn ? 'Entrando…' : 'Entrar com Google'}
            </button>
          )}
        </div>

        {error && <p className="w-full text-right text-[10px] text-red-500">{error}</p>}
      </div>
    </header>
  )
}
