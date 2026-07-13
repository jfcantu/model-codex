import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { entityKind, labelFor } from '../data'

// Selection is held in the URL (`?sel=<id>`) so the detail drawer is linkable
// and the browser Back button closes it. `sel` works on any page and refers to
// a model or a component (ids are unique across both).
export function useSelection() {
  const [params, setParams] = useSearchParams()
  const sel = params.get('sel')

  const select = (id: string) => {
    const next = new URLSearchParams(params)
    next.set('sel', id)
    setParams(next) // push a history entry so Back closes the drawer
  }
  const clear = () => {
    const next = new URLSearchParams(params)
    next.delete('sel')
    setParams(next)
  }
  return { sel, select, clear }
}

/** A link that opens a model or file in the detail drawer instead of navigating. */
export function EntityLink({
  id,
  children,
}: {
  id: string
  children?: ReactNode
}) {
  const { select } = useSelection()
  if (entityKind(id) === 'unknown') return <span>{children ?? id}</span>
  return (
    <button type="button" className="entity-link" onClick={() => select(id)}>
      {children ?? labelFor(id)}
    </button>
  )
}
