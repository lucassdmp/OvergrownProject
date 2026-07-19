import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { isFirebaseConfigured, useFirebaseSession } from './firebaseSessionContext'

interface Props {
  children: ReactNode
  requiredRole: 'viewer' | 'editor'
}

export default function FirebaseAccessGate({ children, requiredRole }: Props) {
  const { user, authReady, accessReady, signingIn, error, login, logout, hasRole } =
    useFirebaseSession()
  const authorized = hasRole(requiredRole)

  if (!isFirebaseConfigured) {
    return (
      <AccessScreen
        title="Firebase não configurado"
        description="Preencha as variáveis VITE_FIREBASE_* antes de acessar a árvore protegida."
      />
    )
  }

  if (!authReady || (user && !accessReady)) {
    return <AccessScreen title="Verificando acesso…" description="Consultando sua autorização." />
  }

  if (!user) {
    return (
      <AccessScreen
        title="Acesso protegido"
        description="Entre com uma conta Google autorizada para carregar a árvore."
        error={error}
      >
        <button
          type="button"
          disabled={signingIn}
          onClick={() => void login()}
          className="rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60"
        >
          {signingIn ? 'Entrando…' : 'Entrar com Google'}
        </button>
      </AccessScreen>
    )
  }

  if (!authorized) return <Navigate to="/" replace />

  return (
    <>
      {children}
      <div className="fixed right-3 bottom-3 z-50 flex items-center gap-2 rounded-full border border-gray-700 bg-gray-950/90 px-3 py-1.5 text-[10px] text-gray-400 shadow-lg backdrop-blur">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="h-5 w-5 rounded-full"
          />
        ) : null}
        <span className="max-w-40 truncate">{user.email}</span>
        <button
          type="button"
          onClick={() => void logout()}
          className="font-bold text-amber-500 hover:text-amber-400"
        >
          Sair
        </button>
      </div>
    </>
  )
}

function AccessScreen({
  title,
  description,
  error,
  children,
}: {
  title: string
  description: string
  error?: string | null
  children?: ReactNode
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-gray-100">
      <section className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-700/50 bg-amber-950/30 text-xl text-amber-500">
          ◈
        </div>
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          <p className="mt-1 text-sm text-gray-400">{description}</p>
        </div>
        {error && (
          <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}
        {children}
        <a href="/" className="text-xs text-amber-500 hover:underline">
          Voltar para a ficha
        </a>
      </section>
    </main>
  )
}
