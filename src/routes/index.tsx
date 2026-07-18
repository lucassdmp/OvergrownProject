import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import CharacterSheetPage from '@/pages/CharacterSheetPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PdfPage from '@/pages/PdfPage'
import TalentTreeBuilderPage from '@/pages/TalentTreeBuilderPage'
import TalentTreePlayerPage from '@/pages/TalentTreePlayerPage'

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
    element: <TalentTreeBuilderPage />,
  },
  {
    // Player-facing talent tree view – reached from the sheet pentagon
    path: '/arvore',
    element: <TalentTreePlayerPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
