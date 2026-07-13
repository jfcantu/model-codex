import { useState } from 'react'
import { glossary } from '../data'

export default function GlossaryPage() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const terms = glossary
    .filter(
      (t) =>
        !q ||
        [t.term, ...(t.aka ?? []), t.definition]
          .join(' ')
          .toLowerCase()
          .includes(q),
    )
    .sort((a, b) => a.term.localeCompare(b.term))

  return (
    <div>
      <div className="page-head">
        <h1>Glossary</h1>
        <p className="lede">
          The terms used throughout the Codex. Edit these in{' '}
          <code>data/glossary.yaml</code>.
        </p>
      </div>

      <input
        className="search"
        placeholder="Filter terms…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="term-list">
        {terms.map((t) => (
          <details key={t.term} className="term" id={t.term.toLowerCase()}>
            <summary className="term-summary">
              {t.term}
              {t.aka?.length ? (
                <span className="term-aka"> · {t.aka.join(', ')}</span>
              ) : null}
            </summary>
            <div className="term-body">
              <p>{t.definition}</p>
              {t.examples?.length ? (
                <p className="term-examples">e.g. {t.examples.join(' · ')}</p>
              ) : null}
              {t.seeAlso?.length ? (
                <p className="term-see">
                  See also:{' '}
                  {t.seeAlso.map((s, i) => (
                    <span key={s}>
                      {i > 0 && ', '}
                      <a href={`#${s.toLowerCase()}`}>{s}</a>
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          </details>
        ))}
        {terms.length === 0 && <p className="empty">No terms match.</p>}
      </div>
    </div>
  )
}
