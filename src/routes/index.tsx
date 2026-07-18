import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import CharacterSheetPage from '@/pages/CharacterSheetPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PdfPage from '@/pages/PdfPage'

const TalentTreeBuilderPage = lazy(() => import('@/pages/TalentTreeBuilderPage'))
const TalentTreePlayerPage = lazy(() => import('@/pages/TalentTreePlayerPage'))

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
        // Legacy URL – the sheet now lives at the root
        path: 'v2',
        element: <Navigate to="/" replace />,
      },
    ],
  },
  {
    // Hidden page – not linked from the nav. Access via /talent-tree-builder directly.
    path: '/talent-tree-builder',
    element: (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-gray-950 text-sm text-gray-500">
            Carregando árvore…
          </div>
        }
      >
        <TalentTreeBuilderPage />
      </Suspense>
    ),
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
