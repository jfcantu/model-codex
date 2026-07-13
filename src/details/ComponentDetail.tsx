import { components, getComponent, modelsRequiring } from '../data'
import { EntityLink } from '../components/EntityLink'

// The content shown in the detail drawer for a text encoder or VAE.
export default function ComponentDetail({ id }: { id: string }) {
  const component = getComponent(id)
  if (!component) return <p className="muted">No file with id “{id}”.</p>

  const users = modelsRequiring(id)

  // Interchangeable group: the base plus all its variants, minus this one.
  const baseId = component.variantOf ?? component.id
  const interchangeable = components.filter(
    (c) =>
      c.id !== component.id && (c.id === baseId || c.variantOf === baseId),
  )
  const typeLabel =
    component.type === 'text-encoder'
      ? 'Text encoder'
      : component.type === 'vae'
        ? 'VAE'
        : component.type

  return (
    <article className="detail">
      <div className="detail-head">
        <h1>{component.name}</h1>
        <span className="type-label">{typeLabel}</span>
      </div>
      <div className="meta-row">
        {component.origin && <span>{component.origin}</span>}
        {component.aliases?.length ? (
          <span>· also called {component.aliases.join(', ')}</span>
        ) : null}
      </div>
      {component.description && (
        <p className="detail-desc">{component.description}</p>
      )}

      {interchangeable.length > 0 && (
        <p className="interchange-note">
          Interchangeable with{' '}
          {interchangeable.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ', '}
              <EntityLink id={c.id} />
            </span>
          ))}
          .
        </p>
      )}

      <section>
        <h2>Models that need it</h2>
        {users.length ? (
          <ul className="plain">
            {users
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((m) => (
                <li key={m.id}>
                  <EntityLink id={m.id} />
                </li>
              ))}
          </ul>
        ) : (
          <p className="muted">
            No models list this as required. It may still work as an optional
            alternative — check the compatibility checker.
          </p>
        )}
      </section>
    </article>
  )
}
