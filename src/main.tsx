import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createHashRouter,
  Navigate,
  RouterProvider,
  useParams,
} from 'react-router-dom'
import App from './App'
import QuickstartPage from './pages/QuickstartPage'
import BrowsePage from './pages/BrowsePage'
import TreePage from './pages/TreePage'
import CompatibilityPage from './pages/CompatibilityPage'
import GlossaryPage from './pages/GlossaryPage'
import './styles.css'

// Old detail routes now open the drawer over Browse via ?sel=<id>.
function RedirectToSelection() {
  const { id = '' } = useParams()
  return <Navigate to={`/browse?sel=${id}`} replace />
}

// HashRouter keeps deep links working on any static host with no server config.
const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <QuickstartPage /> },
      { path: 'browse', element: <BrowsePage /> },
      { path: 'tree', element: <TreePage /> },
      { path: 'compatibility', element: <CompatibilityPage /> },
      { path: 'glossary', element: <GlossaryPage /> },
      { path: 'model/:id', element: <RedirectToSelection /> },
      { path: 'component/:id', element: <RedirectToSelection /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
