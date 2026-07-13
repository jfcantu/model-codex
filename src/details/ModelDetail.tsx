import {
  ancestorChain,
  childrenOf,
  getComponent,
  getModel,
  resolveRequirements,
  resolveSampling,
} from '../data'
import { EntityLink } from '../components/EntityLink'
import { Tag } from '../components/Badges'

// Preferred display order for sampler settings; anything else falls at the end.
const SETTING_ORDER = [
  'Sampler',
  'Scheduler',
  'Steps',
  'CFG',
  'FluxGuidance',
  'Guidance',
  'Shift',
  'CLIP skip',
]
function orderedSettings(s: Record<string, string | number>) {
  return Object.entries(s).sort((a, b) => {
    const ia = SETTING_ORDER.indexOf(a[0])
    const ib = SETTING_ORDER.indexOf(b[0])
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}

// The content shown in the detail drawer for a diffusion model. All references
// to other models/files use EntityLink, so clicking them swaps the drawer.
export default function ModelDetail({ id }: { id: string }) {
  const model = getModel(id)
  if (!model) return <p className="muted">No model with id “{id}”.</p>

  const chain = ancestorChain(id) // nearest-first
  const parent = chain[0]
  const lineage = [...chain].reverse().concat(model) // root → self
  const children = childrenOf(id)
  const req = resolveRequirements(id)
  const samp = resolveSampling(id)
  const modified = !!model.modifiesArchitecture

  return (
    <article className="detail">
      <div className="breadcrumb">
        {lineage.map((n, i) => (
          <span key={n.id}>
            {i > 0 && <span className="sep">→</span>}
            {n.id === id ? (
              <span className="crumb-current">{n.name}</span>
            ) : (
              <EntityLink id={n.id} />
            )}
          </span>
        ))}
      </div>

      <div className="detail-head">
        <h1>{model.name}</h1>
        <span className="type-label">Diffusion model</span>
      </div>

      <div className="meta-row">
        {parent ? (
          <span>
            Built on <EntityLink id={parent.id} />
          </span>
        ) : (
          <span>A starting-point model (not built on another)</span>
        )}
        {model.releasedBy && <span>· by {model.releasedBy}</span>}
        {model.releaseYear && <span>· {model.releaseYear}</span>}
        {model.aliases?.length ? (
          <span>· also called {model.aliases.join(', ')}</span>
        ) : null}
      </div>

      {model.description && <p className="detail-desc">{model.description}</p>}

      {(model.tags?.length ?? 0) > 0 && (
        <div className="tags">
          {model.tags!.map((t) => (
            <Tag key={t} label={t} />
          ))}
        </div>
      )}

      {modified && (
        <div className="callout">
          <h4>Heads up</h4>
          <p>
            This model changes the internals of what it was built on, so tools
            and add-ons written for {parent?.name ?? 'the parent'} may not work
            with it.
          </p>
        </div>
      )}

      {model.notes?.length ? (
        <div className="callout">
          <h4>Good to know</h4>
          <ul>
            {model.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section>
        <h2>Files you need to run it</h2>
        {req.inheritedFrom && (
          <p className="inherited-note">
            Same as <EntityLink id={req.inheritedFrom} /> (what it’s built on).
          </p>
        )}
        {req.requirements.length ? (
          <table className="req-table">
            <thead>
              <tr>
                <th>File</th>
                <th>What it is</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {req.requirements.map((r) => {
                const c = getComponent(r.component)
                const kindLabel =
                  c?.type === 'text-encoder'
                    ? 'text encoder'
                    : c?.type === 'vae'
                      ? 'VAE'
                      : (c?.type ?? '—')
                return (
                  <tr key={r.component}>
                    <td>
                      <EntityLink id={r.component} />
                    </td>
                    <td>{kindLabel}</td>
                    <td>{r.role ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="muted">No extra files recorded.</p>
        )}
      </section>

      {Object.keys(samp.settings).length > 0 && (
        <section>
          <h2>Suggested settings</h2>
          {samp.inheritedFrom ? (
            <p className="inherited-note">
              Same as <EntityLink id={samp.inheritedFrom} />.
            </p>
          ) : null}
          <table className="settings-table">
            <tbody>
              {orderedSettings(samp.settings).map(([param, value]) => (
                <tr key={param}>
                  <th>{param}</th>
                  <td>{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted settings-caveat">
            A starting point — tweak to taste.
          </p>
        </section>
      )}

      <section>
        <h2>Family</h2>
        <div className="lineage-cols">
          <div>
            <h4>Built on</h4>
            {chain.length ? (
              <ul className="plain">
                {chain.map((a, i) => (
                  <li key={a.id}>
                    <EntityLink id={a.id} />
                    {i === chain.length - 1 && (
                      <span className="muted"> — the original</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nothing — this is an original.</p>
            )}
          </div>
          <div>
            <h4>Models built on this</h4>
            {children.length ? (
              <ul className="plain">
                {children.map((c) => (
                  <li key={c.id}>
                    <EntityLink id={c.id} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">None recorded yet.</p>
            )}
          </div>
        </div>
      </section>

      {model.links?.length ? (
        <section>
          <h2>Links</h2>
          <ul className="plain">
            {model.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
