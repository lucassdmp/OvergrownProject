import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
} from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseTreeId = import.meta.env.VITE_FIREBASE_TREE_ID || 'official'

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId,
)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let firestore: Firestore | null = null

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  auth = getAuth(app)
  firestore = getFirestore(app)
}

export function getFirebaseServices(): { auth: Auth; firestore: Firestore } | null {
  return auth && firestore ? { auth, firestore } : null
}

export function requireFirebaseUser(): string {
  if (!auth) throw new Error('Firebase não está configurado.')
  if (!auth.currentUser) throw new Error('Faça login com Google para acessar a árvore.')
  return auth.currentUser.uid
}

export async function signInWithGoogle(): Promise<void> {
  if (!auth) throw new Error('Firebase não está configurado.')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider)
      return
    }
    throw error
  }
}

export async function signOutFirebase(): Promise<void> {
  if (auth) await signOut(auth)
}
