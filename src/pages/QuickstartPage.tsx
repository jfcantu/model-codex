import { Link } from 'react-router-dom'
import { compatibilities, components, models } from '../data'

// Plain-language intro. No jargon assumed — this is the page a newcomer lands on.

const JOURNEYS = [
  {
    to: '/compatibility',
    emoji: '🔌',
    title: 'Check if two files work together',
    blurb:
      'You have a model and a VAE, a LoRA, or a node — will they run together? Build the question and get a yes / no / maybe with how sure we are.',
  },
  {
    to: '/browse',
    emoji: '🔍',
    title: 'Look up a specific model',
    blurb:
      'Find a model and see what it is, what it was built from, and exactly which extra files you need to run it.',
  },
  {
    to: '/tree',
    emoji: '🌳',
    title: 'See how models are related',
    blurb:
      'Browse the family tree — trace how one model was built on top of another, all the way back to where it started.',
  },
]

const BASICS: { term: string; text: string; footnote?: string }[] = [
  {
    term: 'Diffusion model',
    text: 'The main file that actually makes the picture. When people say “a model”, this is usually* what they mean.',
    footnote:
      'Technically, text encoders, VAEs, and LoRAs are all “models” too — people just don’t usually mean those when they say “model”.',
  },
  {
    term: 'Text encoder',
    text: 'Reads your prompt and turns it into something the model can understand. Some models need one; some need two.',
  },
  {
    term: 'VAE',
    text: 'Turns the model’s internal result into the final image. Using the wrong one usually gives washed-out or muddy colours.',
  },
  {
    term: 'LoRA',
    text: 'A small add-on that teaches a model a particular style, character, or concept. It’s made for one model and may not work on others.',
  },
]

export default function QuickstartPage() {
  return (
    <div className="quickstart">
      <section className="hero">
        <h1>
          <span className="brand-mark">◈</span> Model Codex
        </h1>
        <p className="hero-lede">
          Downloaded a new model and not sure what else you need to run it, or
          whether your files fit together? This is a plain-language guide to how
          the pieces relate.
        </p>
      </section>

      <section>
        <h2>What do you want to do?</h2>
        <div className="journey-grid">
          {JOURNEYS.map((j) => (
            <Link key={j.to} to={j.to} className="journey-card">
              <span className="journey-emoji">{j.emoji}</span>
              <h3>{j.title}</h3>
              <p>{j.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2>New here? The four kinds of file</h2>
        <p className="lede">
          Almost everything in this space is one of four things. Once these click,
          the rest makes sense.
        </p>
        <dl className="basics">
          {BASICS.map((b) => (
            <div key={b.term} className="basic">
              <dt>{b.term}</dt>
              <dd>
                {b.text}
                {b.footnote ? (
                  <div className="footnote">
                    <sup>*</sup> {b.footnote}
                  </div>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
        <p className="prose">
          Want more detail on any term? The{' '}
          <Link to="/glossary">glossary</Link> explains everything in one place.
        </p>
      </section>

      <section>
        <p className="counts">
          Right now the Codex knows about <strong>{models.length}</strong>{' '}
          models, <strong>{components.length}</strong> text encoders &amp; VAEs,
          and <strong>{compatibilities.length}</strong> recorded compatibility
          notes.
        </p>
      </section>
    </div>
  )
}
