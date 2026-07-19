import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import { isFirebaseConfigured } from '../../services/firebase'

export type FirebaseUserRole = 'viewer' | 'editor' | 'admin'

export interface FirebaseUserAccess {
  active: boolean
  role: FirebaseUserRole
  canSaveCharacters?: boolean
  email?: string
  displayName?: string
}

export interface FirebaseSessionValue {
  user: User | null
  access: FirebaseUserAccess | null
  authReady: boolean
  accessReady: boolean
  authorized: boolean
  canSaveCharacters: boolean
  signingIn: boolean
  error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
  hasRole: (requiredRole: 'viewer' | 'editor') => boolean
}

export const FirebaseSessionContext = createContext<FirebaseSessionValue | null>(null)

export function firebaseErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Não foi possível acessar o Firebase.'
}

export function useFirebaseSession() {
  const session = useContext(FirebaseSessionContext)
  if (!session)
    throw new Error('useFirebaseSession deve ser usado dentro de FirebaseSessionProvider.')
  return session
}

export { isFirebaseConfigured }
