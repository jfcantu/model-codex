import { NavLink, Outlet } from 'react-router-dom'
import DetailDrawer from './components/DetailDrawer'

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">◈</span> Model Codex
        </NavLink>
        <nav className="mainnav">
          <NavLink to="/" end>
            Quickstart
          </NavLink>
          <NavLink to="/browse">Browse</NavLink>
          <NavLink to="/tree">Model Tree</NavLink>
          <NavLink to="/compatibility">Compatibility</NavLink>
          <NavLink to="/glossary">Glossary</NavLink>
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
      <footer className="footer">
        A plain-language guide to ComfyUI image models — how they’re related,
        which files each one needs, and what works together.
      </footer>
      <DetailDrawer />
    </div>
  )
}
