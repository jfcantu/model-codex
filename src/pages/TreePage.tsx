import { useMemo } from 'react'
import { familyList } from '../data'
import AncestryTree, { familyColorMap } from '../components/AncestryTree'

export default function TreePage() {
  const colors = useMemo(() => familyColorMap(), [])

  return (
    <div>
      <div className="page-head">
        <h1>Model tree</h1>
        <p className="lede">
          How the models relate. Each arrow points from a model to one built on
          top of it. Click any node to open its details.
        </p>
      </div>

      <div className="tree-legend">
        {familyList().map((f) => (
          <span key={f} className="legend-item">
            <span className="legend-swatch" style={{ background: colors.get(f) }} />
            {f}
          </span>
        ))}
      </div>

      <AncestryTree />
    </div>
  )
}
