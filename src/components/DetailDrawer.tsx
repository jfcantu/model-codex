import { useEffect } from 'react'
import { entityKind } from '../data'
import { useSelection } from './EntityLink'
import ModelDetail from '../details/ModelDetail'
import ComponentDetail from '../details/ComponentDetail'

// A right-side drawer that shows the selected model/file over the current page,
// rather than navigating away. Driven by the `?sel=` URL param.
export default function DetailDrawer() {
  const { sel, clear } = useSelection()

  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    if (!sel) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clear()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [sel, clear])

  if (!sel) return null
  const kind = entityKind(sel)

  return (
    <div className="drawer-overlay" onClick={clear}>
      <aside
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className="drawer-close" onClick={clear} aria-label="Close">
          ×
        </button>
        <div className="drawer-body">
          {kind === 'model' ? (
            <ModelDetail id={sel} />
          ) : kind === 'component' ? (
            <ComponentDetail id={sel} />
          ) : (
            <p className="muted">Nothing selected.</p>
          )}
        </div>
      </aside>
    </div>
  )
}
