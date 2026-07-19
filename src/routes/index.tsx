import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import CharacterSheetPage from '@/pages/CharacterSheetPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PdfPage from '@/pages/PdfPage'

const TalentTreeBuilderPage = lazy(() => import('@/pages/TalentTreeBuilderPage'))
const TalentTreePlayerPage = lazy(() => import('@/pages/TalentTreePlayerPage'))
const AdminUsersPage = lazy(() => import('@/pages/AdminUsersPage'))
const FirebaseAccessGate = lazy(() => import('@/features/auth/FirebaseAccessGate'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <CharacterSheetPage />,
      },
      {
        path: 'livro',
        element: <PdfPage />,
      },
      {
        path: 'admin',
        element: (
          <Suspense
            fallback={
              <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-gray-500">
                Carregando administração…
              </div>
            }
          >
            <FirebaseAccessGate requiredRole="admin" showSessionBadge={false}>
              <AdminUsersPage />
            </FirebaseAccessGate>
          </Suspense>
        ),
      },
      {
        // Legacy URL – the sheet now lives at the root
        path: 'v2',
        element: <Navigate to="/" replace />,
      },
    ],
  },
  {
    path: '/tree-builder',
    element: (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-gray-950 text-sm text-gray-500">
            Carregando árvore…
          </div>
        }
      >
        <FirebaseAccessGate requiredRole="editor">
          <TalentTreeBuilderPage />
        </FirebaseAccessGate>
      </Suspense>
    ),
  },
  {
    path: '/talent-tree-builder',
    element: <Navigate to="/tree-builder" replace />,
  },
  {
    // Player-facing talent tree view – reached from the sheet pentagon
    path: '/arvore',
    element: (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-gray-950 text-sm text-gray-500">
            Carregando árvore…
          </div>
        }
      >
        <TalentTreePlayerPage />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
