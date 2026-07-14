import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'
import PdfPage from '@/pages/PdfPage'
import TalentTreeBuilderPage from '@/pages/TalentTreeBuilderPage'
import V2Page from '@/pages/V2Page'
import TalentTreePlayerPage from '@/pages/TalentTreePlayerPage'
import CombatTestPage from '@/pages/CombatTestPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'livro',
        element: <PdfPage />,
      },
      {
        path: 'v2',
        element: <V2Page />,
      },
      {
        path: 'combat-test',
        element: <CombatTestPage />,
      },
    ],
  },
  {
    // Hidden page – not linked from the nav. Access via /talent-tree-builder directly.
    path: '/talent-tree-builder',
    element: <TalentTreeBuilderPage />,
  },
  {
    // Player-facing talent tree view – reached from the V2 sheet pentagon
    path: '/arvore',
    element: <TalentTreePlayerPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
