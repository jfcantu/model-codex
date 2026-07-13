import { Fragment, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ancestorChain,
  components,
  familyList,
  familyOf,
  getModel,
  models,
  rootNodes,
} from '../data'
import { familyColorMap, paletteColors } from '../components/AncestryTree'
import { useSelection } from '../components/EntityLink'
import type { ModelNode } from '../types'

type Tab = 'diffusion' | 'text-encoders' | 'vaes'

// One column of a row's tree-guide: a pass-through vertical line, a branch
// (├, has a sibling below), a last-child elbow (└), or blank space.
type Guide = 'through' | 'branch' | 'last' | 'blank'

interface Row {
  node: ModelNode
  cols: Guide[]
  hasChildren: boolean
  collapsed: boolean
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'diffusion', label: 'Diffusion models' },
  { id: 'text-encoders', label: 'Text encoders' },
  { id: 'vaes', label: 'VAEs' },
]

export default function BrowsePage() {
  const [params, setParams] = useSearchParams()
  const { select } = useSelection()
  const rawTab = params.get('tab')
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : 'diffusion'

  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const colors = useMemo(() => familyColorMap(), [])

  // Ids of models that have children (so they can be collapsed).
  const parentIds = useMemo(
    () => new Set(models.filter((m) => m.basedOn).map((m) => m.basedOn!)),
    [],
  )
  // Collapsed by default — show just the family roots until expanded.
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(models.filter((m) => m.basedOn).map((m) => m.basedOn!)),
  )
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const matches = (name: string, extra: string[] = []) =>
    !q || [name, ...extra].join(' ').toLowerCase().includes(q)

  const families = useMemo(() => {
    // Nodes visible under the current search: each match plus all its ancestors,
    // so a matched child still shows its parent chain for context.
    const visible = new Set<string>()
    if (!q) {
      models.forEach((m) => visible.add(m.id))
    } else {
      for (const m of models) {
        if (matches(m.name, [...(m.aliases ?? []), ...(m.tags ?? [])])) {
          visible.add(m.id)
          for (const a of ancestorChain(m.id)) visible.add(a.id)
        }
      }
    }

    const childrenSorted = (id: string) =>
      models
        .filter((m) => m.basedOn === id && visible.has(m.id))
        .sort((a, b) => a.name.localeCompare(b.name))

    // Depth-first so every model sits directly under its real parent. Each row
    // carries the guide columns needed to draw its tree connector lines; the
    // last entry is the node's own connector, earlier ones pass through. A
    // collapsed node keeps its row but its subtree isn't walked. Search ignores
    // collapse so matches always show.
    const rowsForRoot = (rootId: string): Row[] => {
      const rows: Row[] = []
      const walk = (id: string, cols: Guide[]) => {
        const kids = childrenSorted(id)
        const isCollapsed = !q && collapsed.has(id)
        rows.push({
          node: getModel(id)!,
          cols,
          hasChildren: kids.length > 0,
          collapsed: isCollapsed,
        })
        if (isCollapsed) return
        // Below this node, a branch keeps its line going; a last child stops.
        const passed: Guide[] = cols.map((c) =>
          c === 'branch' ? 'through' : c === 'last' ? 'blank' : c,
        )
        kids.forEach((k, i) =>
          walk(k.id, [...passed, i === kids.length - 1 ? 'last' : 'branch']),
        )
      }
      if (visible.has(rootId)) walk(rootId, [])
      return rows
    }

    // Group roots by family. Multi-root families (Stable Diffusion, Flux) get
    // their own group; single-root families and unfamilied roots fall under
    // "Other".
    return familyList()
      .map((family) => {
        const roots = rootNodes()
          .filter((r) => familyOf(r.id) === family)
          .sort(
            (a, b) =>
              (a.releaseYear ?? 0) - (b.releaseYear ?? 0) ||
              a.name.localeCompare(b.name),
          )
        const rows = roots.flatMap((r) => rowsForRoot(r.id))
        return { family, color: colors.get(family) ?? '#8b98a8', rows }
      })
      .filter((f) => f.rows.length > 0)
  }, [q, colors, collapsed])

  const textEncoders = components
    .filter((c) => c.type === 'text-encoder')
    .filter((c) => matches(c.name, c.aliases ?? []))
    .sort((a, b) => a.name.localeCompare(b.name))
  const vaes = components
    .filter((c) => c.type === 'vae')
    .filter((c) => matches(c.name, c.aliases ?? []))
    .sort((a, b) => a.name.localeCompare(b.name))

  const setTab = (id: Tab) => {
    const next = new URLSearchParams(params)
    if (id === 'diffusion') next.delete('tab')
    else next.set('tab', id)
    setParams(next, { replace: true })
  }

  const note: Record<Tab, string> = {
    diffusion:
      'The files that actually make an image, grouped by family. Each model nests under the one it was built on.',
    'text-encoders':
      'Turn your prompt into something a model understands. Shared across many model families.',
    vaes: 'Turn a model’s internal result into the final image. Some models can use more than one.',
  }

  return (
    <div>
      <div className="page-head">
        <h1>Browse</h1>
        <p className="lede">
          Everything the Codex knows, in one place — the models that make images,
          and the text encoders and VAEs they run with.
        </p>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        className="search"
        placeholder="Search by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <p className="section-note">{note[tab]}</p>

      {tab === 'diffusion' && !q && parentIds.size > 0 && (
        <div className="tree-controls">
          <button className="chip" onClick={() => setCollapsed(new Set())}>
            Expand all
          </button>
          <button
            className="chip"
            onClick={() => setCollapsed(new Set(parentIds))}
          >
            Collapse all
          </button>
        </div>
      )}

      {tab === 'diffusion' &&
        (families.length ? (
          families.map((f) => (
            <div key={f.family} className="family-group">
              <h3 className="family-title" style={{ borderColor: f.color }}>
                {f.family}
              </h3>
              <ul className="row-list tree">
                {f.rows.map(({ node, cols, hasChildren, collapsed: isCol }) => {
                  const childCount = models.filter(
                    (m) => m.basedOn === node.id,
                  ).length
                  return (
                    <li key={node.id} className="tree-row">
                      <span className="guides">
                        {cols.map((c, i) => (
                          <span key={i} className={`guide ${c}`} />
                        ))}
                      </span>
                      <span className="tree-toggle-cell">
                        {hasChildren && (
                          <button
                            className="tree-collapse"
                            onClick={() => toggle(node.id)}
                            aria-label={isCol ? 'Expand' : 'Collapse'}
                          >
                            {isCol ? '▸' : '▾'}
                          </button>
                        )}
                      </span>
                      <button
                        className="row tree-name"
                        onClick={() => select(node.id)}
                      >
                        <span className="row-name">{node.name}</span>
                        {isCol && (
                          <span className="row-sub">
                            {childCount} {childCount === 1 ? 'child' : 'children'}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        ) : (
          <p className="empty">No models match your search.</p>
        ))}

      {tab === 'text-encoders' && <ComponentRows list={textEncoders} select={select} />}
      {tab === 'vaes' && <ComponentRows list={vaes} select={select} />}
    </div>
  )
}

// Text encoders / VAEs, grouped by family (CLIP, T5, Stable Diffusion, …) with
// interchangeable variants nested under their base. Same rule as the model tab:
// a family needs 2+ bases to get its own header, otherwise it falls under "Other".
function ComponentRows({
  list,
  select,
}: {
  list: typeof components
  select: (id: string) => void
}) {
  if (!list.length) return <p className="empty">Nothing matches your search.</p>
  const byName = (a: (typeof list)[number], b: (typeof list)[number]) =>
    a.name.localeCompare(b.name)
  const inList = new Set(list.map((c) => c.id))
  const variantsOf = (id: string) =>
    list.filter((c) => c.variantOf === id).sort(byName)
  // Bases: not a variant, or a variant whose base got filtered out by search.
  const bases = list.filter((c) => !c.variantOf || !inList.has(c.variantOf))

  const famOf = (c: (typeof list)[number]) => c.family ?? 'Other'
  const counts = new Map<string, number>()
  bases.forEach((b) => counts.set(famOf(b), (counts.get(famOf(b)) ?? 0) + 1))
  const groupOf = (c: (typeof list)[number]) =>
    (counts.get(famOf(c)) ?? 0) >= 2 ? famOf(c) : 'Other'

  const order: string[] = []
  let hasOther = false
  bases.forEach((b) => {
    const g = groupOf(b)
    if (g === 'Other') hasOther = true
    else if (!order.includes(g)) order.push(g)
  })
  const groups = hasOther ? [...order, 'Other'] : order
  const colors = paletteColors(groups)

  return (
    <>
      {groups.map((g) => (
        <div key={g} className="family-group">
          <h3 className="family-title" style={{ borderColor: colors.get(g) }}>
            {g}
          </h3>
          <ul className="row-list">
            {bases
              .filter((b) => groupOf(b) === g)
              .sort(byName)
              .map((base) => (
                <Fragment key={base.id}>
                  <li>
                    <button className="row" onClick={() => select(base.id)}>
                      <span className="row-name">{base.name}</span>
                      {base.origin && (
                        <span className="row-sub">{base.origin}</span>
                      )}
                    </button>
                  </li>
                  {variantsOf(base.id).map((v) => (
                    <li key={v.id} className="variant-row">
                      <button className="row" onClick={() => select(v.id)}>
                        <span className="row-name">{v.name}</span>
                        <span className="row-sub">↔ {base.name}</span>
                      </button>
                    </li>
                  ))}
                </Fragment>
              ))}
          </ul>
        </div>
      ))}
    </>
  )
}
