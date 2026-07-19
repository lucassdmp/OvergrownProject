import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes'
import { FirebaseSessionProvider } from '@/features/auth/FirebaseSession'

export default function App() {
  return (
    <FirebaseSessionProvider>
      <RouterProvider router={router} />
    </FirebaseSessionProvider>
  )
}
