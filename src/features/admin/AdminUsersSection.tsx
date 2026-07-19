import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, Timestamp, updateDoc } from 'firebase/firestore'
import { getFirebaseServices } from '../../services/firebase'
import {
  firebaseErrorMessage,
  useFirebaseSession,
  type FirebaseUserRole,
} from '../auth/firebaseSessionContext'

interface AdminUserRecord {
  id: string
  active: boolean
  role: FirebaseUserRole
  canSaveCharacters: boolean
  email: string
  displayName: string
  photoURL: string
  createdAt: Timestamp | null
  lastLoginAt: Timestamp | null
}

interface PermissionDraft {
  active: boolean
  role: FirebaseUserRole
  canSaveCharacters: boolean
}

const ROLE_LABELS: Record<FirebaseUserRole, string> = {
  viewer: 'Viewer',
  editor: 'Editor',
  admin: 'Admin',
}

function timestampFrom(value: unknown) {
  return value instanceof Timestamp ? value : null
}

function formatTimestamp(value: Timestamp | null) {
  if (!value) return 'Não registrado'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value.toDate())
}

function permissionDraft(record: AdminUserRecord): PermissionDraft {
  return {
    active: record.active,
    role: record.role,
    canSaveCharacters: record.canSaveCharacters,
  }
}

export default function AdminUsersSection() {
  const { user: currentUser } = useFirebaseSession()
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [drafts, setDrafts] = useState<Record<string, PermissionDraft>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    const services = getFirebaseServices()
    if (!services) return

    setLoading(true)
    setError(null)
    try {
      const snapshot = await getDocs(collection(services.firestore, 'users'))
      const nextUsers = snapshot.docs
        .map((userDocument): AdminUserRecord => {
          const data = userDocument.data()
          const role =
            data.role === 'editor' || data.role === 'admin' ? data.role : ('viewer' as const)
          return {
            id: userDocument.id,
            active: data.active === true,
            role,
            canSaveCharacters: data.canSaveCharacters === true,
            email: typeof data.email === 'string' ? data.email : '',
            displayName: typeof data.displayName === 'string' ? data.displayName : '',
            photoURL: typeof data.photoURL === 'string' ? data.photoURL : '',
            createdAt: timestampFrom(data.createdAt),
            lastLoginAt: timestampFrom(data.lastLoginAt),
          }
        })
        .sort((left, right) =>
          (left.displayName || left.email || left.id).localeCompare(
            right.displayName || right.email || right.id,
            'pt-BR',
          ),
        )
      setUsers(nextUsers)
      setDrafts(Object.fromEntries(nextUsers.map((record) => [record.id, permissionDraft(record)])))
      setMessage(null)
    } catch (loadError) {
      setError(firebaseErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    if (!term) return users
    return users.filter((record) =>
      `${record.displayName} ${record.email} ${record.id} ${record.role}`
        .toLocaleLowerCase('pt-BR')
        .includes(term),
    )
  }, [search, users])

  function updateDraft(userId: string, patch: Partial<PermissionDraft>) {
    setDrafts((current) => ({
      ...current,
      [userId]: { ...current[userId], ...patch },
    }))
    setMessage(null)
  }

  async function savePermissions(record: AdminUserRecord) {
    const services = getFirebaseServices()
    const draft = drafts[record.id]
    if (!services || !draft) return

    setSavingId(record.id)
    setError(null)
    setMessage(null)
    try {
      await updateDoc(doc(services.firestore, 'users', record.id), {
        active: draft.active,
        role: draft.role,
        canSaveCharacters: draft.canSaveCharacters,
      })
      setUsers((current) =>
        current.map((entry) => (entry.id === record.id ? { ...entry, ...draft } : entry)),
      )
      setMessage(`Permissões de ${record.displayName || record.email || record.id} atualizadas.`)
    } catch (saveError) {
      setError(firebaseErrorMessage(saveError))
    } finally {
      setSavingId(null)
    }
  }

  const activeCount = users.filter((record) => record.active).length
  const playerCount = users.filter((record) => record.canSaveCharacters).length

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-600 uppercase dark:text-amber-400">
            Acesso
          </p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            Usuários e permissões
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
            Contas aparecem aqui depois que entram no aplicativo. Novas contas começam inativas,
            como viewer e sem permissão para salvar fichas.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadUsers()}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-amber-500 hover:text-amber-600 disabled:cursor-wait disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          {loading ? 'Atualizando…' : '↻ Atualizar lista'}
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Contas registradas" value={users.length} />
        <SummaryCard label="Usuários ativos" value={activeCount} />
        <SummaryCard label="Podem salvar fichas" value={playerCount} />
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, e-mail ou UID…"
            className="min-w-64 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <span className="text-xs text-gray-500">
            {filteredUsers.length} de {users.length}
          </span>
        </div>

        {error && (
          <p className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p className="m-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            {message}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="bg-gray-50 text-[10px] tracking-widest text-gray-500 uppercase dark:bg-gray-950/60 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Usuário</th>
                <th className="px-4 py-3 font-semibold">Último login</th>
                <th className="px-4 py-3 text-center font-semibold">Ativo</th>
                <th className="px-4 py-3 font-semibold">Papel</th>
                <th className="px-4 py-3 text-center font-semibold">Salvar fichas</th>
                <th className="px-4 py-3 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredUsers.map((record) => {
                const draft = drafts[record.id] ?? permissionDraft(record)
                const isCurrentUser = record.id === currentUser?.uid
                const dirty =
                  draft.active !== record.active ||
                  draft.role !== record.role ||
                  draft.canSaveCharacters !== record.canSaveCharacters
                return (
                  <tr
                    key={record.id}
                    className="align-middle hover:bg-amber-50/30 dark:hover:bg-amber-950/10"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {record.photoURL ? (
                          <img
                            src={record.photoURL}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-9 w-9 rounded-full border border-gray-200 object-cover dark:border-gray-700"
                          />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white">
                            {(record.displayName || record.email || '?')[0].toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="max-w-64 truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {record.displayName || 'Sem nome'}
                            {isCurrentUser && (
                              <span className="ml-2 text-[9px] font-bold text-amber-600 uppercase dark:text-amber-400">
                                Você
                              </span>
                            )}
                          </p>
                          <p className="max-w-64 truncate text-xs text-gray-500">
                            {record.email || 'Sem e-mail'}
                          </p>
                          <p
                            className="max-w-64 truncate font-mono text-[9px] text-gray-400"
                            title={record.id}
                          >
                            {record.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(record.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={draft.active}
                        disabled={isCurrentUser}
                        onChange={(event) =>
                          updateDraft(record.id, { active: event.target.checked })
                        }
                        title={isCurrentUser ? 'Você não pode desativar a própria conta.' : ''}
                        className="h-4 w-4 accent-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={draft.role}
                        disabled={isCurrentUser}
                        onChange={(event) =>
                          updateDraft(record.id, {
                            role: event.target.value as FirebaseUserRole,
                          })
                        }
                        title={
                          isCurrentUser ? 'Você não pode remover o próprio papel de admin.' : ''
                        }
                        className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-xs text-gray-800 focus:border-amber-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      >
                        {(Object.keys(ROLE_LABELS) as FirebaseUserRole[]).map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={draft.canSaveCharacters}
                        onChange={(event) =>
                          updateDraft(record.id, {
                            canSaveCharacters: event.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-emerald-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={!dirty || savingId !== null}
                        onClick={() => void savePermissions(record)}
                        className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {savingId === record.id ? 'Salvando…' : 'Salvar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && filteredUsers.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-gray-500">Nenhum usuário encontrado.</p>
        )}
      </section>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900/80">
      <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}
