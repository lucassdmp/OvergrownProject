import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { getFirebaseServices, signInWithGoogle, signOutFirebase } from '../../services/firebase'
import { clearFirebaseCharacterCaches } from '../character/utils/firebaseCharacterCache'
import {
  FirebaseSessionContext,
  firebaseErrorMessage,
  type FirebaseSessionValue,
  type FirebaseUserAccess,
  type FirebaseUserRole,
} from './firebaseSessionContext'

const roleLevel: Record<FirebaseUserRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
}

export function FirebaseSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [access, setAccess] = useState<FirebaseUserAccess | null>(null)
  const [accessReady, setAccessReady] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previousUserUid = useRef<string | null>(null)
  const profileSyncedUid = useRef<string | null>(null)

  useEffect(() => {
    window.localStorage.removeItem('overgrown-talent-tree')
    const services = getFirebaseServices()
    if (!services) {
      setAuthReady(true)
      setAccessReady(true)
      return
    }

    return onAuthStateChanged(
      services.auth,
      (nextUser) => {
        const previousUid = previousUserUid.current
        if (previousUid && previousUid !== nextUser?.uid) {
          void clearFirebaseCharacterCaches(previousUid)
        }
        previousUserUid.current = nextUser?.uid ?? null
        profileSyncedUid.current = null
        setUser(nextUser)
        setAuthReady(true)
        setAccess(null)
        setAccessReady(!nextUser)
        setError(null)
      },
      (authError) => {
        setError(firebaseErrorMessage(authError))
        setAuthReady(true)
        setAccessReady(true)
      },
    )
  }, [])

  useEffect(() => {
    const services = getFirebaseServices()
    if (!services || !user) return

    setAccessReady(false)
    const userReference = doc(services.firestore, 'users', user.uid)
    return onSnapshot(
      userReference,
      (snapshot) => {
        if (profileSyncedUid.current !== user.uid) {
          profileSyncedUid.current = user.uid
          const profile = {
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            lastLoginAt: serverTimestamp(),
          }
          const registration = snapshot.exists()
            ? profile
            : {
                ...profile,
                active: false,
                role: 'viewer',
                canSaveCharacters: false,
                createdAt: serverTimestamp(),
              }
          void setDoc(userReference, registration, { merge: snapshot.exists() }).catch(
            (profileError) => setError(firebaseErrorMessage(profileError)),
          )
        }
        setAccess(snapshot.exists() ? (snapshot.data() as FirebaseUserAccess) : null)
        setAccessReady(true)
        setError(null)
      },
      (accessError) => {
        setAccess(null)
        setAccessReady(true)
        setError(firebaseErrorMessage(accessError))
      },
    )
  }, [user])

  const authorized =
    access?.active === true &&
    (access.role === 'viewer' || access.role === 'editor' || access.role === 'admin')
  const canSaveCharacters = authorized && access?.canSaveCharacters === true

  useEffect(() => {
    if (user && accessReady && !canSaveCharacters) {
      void clearFirebaseCharacterCaches(user.uid)
    }
  }, [accessReady, canSaveCharacters, user])

  const hasRole = useCallback(
    (requiredRole: FirebaseUserRole) =>
      authorized && roleLevel[access!.role] >= roleLevel[requiredRole],
    [access, authorized],
  )

  const login = useCallback(async () => {
    setSigningIn(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (loginError) {
      setError(firebaseErrorMessage(loginError))
    } finally {
      setSigningIn(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setError(null)
    try {
      if (user) await clearFirebaseCharacterCaches(user.uid)
      await signOutFirebase()
    } catch (logoutError) {
      setError(firebaseErrorMessage(logoutError))
    }
  }, [user])

  const value = useMemo<FirebaseSessionValue>(
    () => ({
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
      hasRole,
    }),
    [
      access,
      accessReady,
      authReady,
      authorized,
      canSaveCharacters,
      error,
      hasRole,
      login,
      logout,
      signingIn,
      user,
    ],
  )

  return <FirebaseSessionContext.Provider value={value}>{children}</FirebaseSessionContext.Provider>
}
