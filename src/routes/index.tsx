import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'
import TalentTreeBuilderPage from '@/pages/TalentTreeBuilderPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
  {
    // Hidden page – not linked from the nav. Access via /talent-tree-builder directly.
    path: '/talent-tree-builder',
    element: <TalentTreeBuilderPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
