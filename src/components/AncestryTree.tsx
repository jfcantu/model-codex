import { useMemo, useState } from 'react'
import { hierarchy, tree, type HierarchyPointNode } from 'd3-hierarchy'
import { familyList, familyOf, models, rootNodes } from '../data'
import { useSelection } from './EntityLink'
import type { ModelNode } from '../types'

// A family tree of diffusion models. Each arrow points from a model to the one
// built on top of it. Nodes are coloured by the family (root) they belong to.
// The tree is collapsible: it starts collapsed (roots only), and each node with
// children has a +/− toggle. Clicking a node's body opens its details.

interface TreeDatum {
  id: string
  name: string
  children?: TreeDatum[]
}

const NODE_W = 188
const NODE_H = 34
const H_GAP = 16
const V_GAP = 84

// A small, legible palette assigned to families in declaration order.
const FAMILY_COLORS = [
  '#6ea8fe',
  '#f0883e',
  '#3fb950',
  '#bc8cff',
  '#db61a2',
  '#e3b341',
  '#39c5cf',
]

/** Assign palette colours to a list of group names (any "Other" gets grey). */
export function paletteColors(names: string[]): Map<string, string> {
  const map = new Map<string, string>()
  let i = 0
  for (const f of names) {
    map.set(f, f === 'Other' ? '#8b98a8' : FAMILY_COLORS[i++ % FAMILY_COLORS.length])
  }
  return map
}

/** Family group → colour, so a family and its Browse group match. "Other" is grey. */
export function familyColorMap(): Map<string, string> {
  return paletteColors(familyList())
}

export default function AncestryTree() {
  const { select } = useSelection()
  const colors = useMemo(() => familyColorMap(), [])

  const childrenOf = (id: string) => models.filter((m) => m.basedOn === id)
  // ids of nodes that have children (so can be expanded)
  const parents = useMemo(
    () => new Set(models.filter((m) => m.basedOn).map((m) => m.basedOn!)),
    [],
  )
  const [expanded, setExpanded] = useState<Set<string>>(new Set()) // start collapsed

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const expandAll = () => setExpanded(new Set(parents))
  const collapseAll = () => setExpanded(new Set())

  const { nodes, links, width, height } = useMemo(() => {
    // Only descend into a node's children when it's expanded.
    const build = (n: ModelNode): TreeDatum => ({
      id: n.id,
      name: n.name,
      children: expanded.has(n.id) ? childrenOf(n.id).map(build) : [],
    })
    const root: TreeDatum = {
      id: '__root__',
      name: 'all',
      children: rootNodes().map(build),
    }

    const h = hierarchy<TreeDatum>(root)
    tree<TreeDatum>().nodeSize([NODE_H + H_GAP, NODE_W + V_GAP])(h)

    const all = h.descendants() as HierarchyPointNode<TreeDatum>[]
    const visible = all.filter((d) => d.data.id !== '__root__')

    const xs = visible.map((d) => d.x)
    const ys = visible.map((d) => d.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)
    const pad = 24
    const offX = -minX + pad
    const offY = -minY + pad

    const positioned = visible.map((d) => ({
      id: d.data.id,
      name: d.data.name,
      cx: d.y + offY,
      cy: d.x + offX,
      color: colors.get(familyOf(d.data.id)) ?? '#8b98a8',
      hasChildren: parents.has(d.data.id),
    }))

    const edgeList = visible
      .filter((d) => d.parent && d.parent.data.id !== '__root__')
      .map((d) => ({
        id: `${d.parent!.data.id}->${d.data.id}`,
        x1: d.parent!.y + offY,
        y1: d.parent!.x + offX,
        x2: d.y + offY,
        y2: d.x + offX,
      }))

    return {
      nodes: positioned,
      links: edgeList,
      width: maxY - minY + pad * 2 + NODE_W,
      height: maxX - minX + pad * 2 + NODE_H,
    }
  }, [colors, expanded, parents])

  return (
    <div>
      <div className="tree-controls">
        <button className="chip" onClick={expandAll}>
          Expand all
        </button>
        <button className="chip" onClick={collapseAll}>
          Collapse all
        </button>
      </div>

      <div className="tree-scroll">
        <svg width={width} height={height} className="tree-svg">
          {links.map((l) => (
            <path
              key={l.id}
              className="tree-link"
              d={elbow(l.x1, l.y1, l.x2, l.y2)}
            />
          ))}
          {nodes.map((n) => (
            <g key={n.id} transform={`translate(${n.cx},${n.cy})`}>
              <g className="tree-node" onClick={() => select(n.id)}>
                <rect
                  className="tree-rect"
                  x={0}
                  y={-NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  rx={7}
                  style={{ stroke: n.color }}
                />
                <text className="tree-label" x={12} y={5}>
                  {n.name}
                </text>
              </g>
              {n.hasChildren && (
                <g
                  className="tree-toggle"
                  transform={`translate(${NODE_W},0)`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(n.id)
                  }}
                >
                  <circle r={9} />
                  <text x={0} y={0.5} className="tree-toggle-sign">
                    {expanded.has(n.id) ? '−' : '+'}
                  </text>
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

function elbow(x1: number, y1: number, x2: number, y2: number): string {
  const startX = x1 + NODE_W
  const midX = (startX + x2) / 2
  return `M${startX},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`
}
