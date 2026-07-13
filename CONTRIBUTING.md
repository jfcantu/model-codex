# Contributing to Model Codex

Thanks for helping improve the codex. Most contributions here are **edits to the
knowledge itself** — the hand-written YAML under [`data/`](data/) — not code. You
don't need to know React to add a model, fix a compatibility note, or clarify a
glossary term.

Please read this alongside the [README](README.md), which documents the data
model in detail.

## Scope: what the Codex is for

Model Codex exists to get people **up and running** — the basic facts and
sensible starting settings for a model, so a newcomer can produce a working
result without hunting across a dozen threads. It is deliberately **not** an
exhaustive reference on every parameter.

Concretely, that means:

- **Starting settings, not a tuning encyclopedia.** If a model lists sampler /
  scheduler / step recommendations, they're a known-good starting point, not a
  claim that they're optimal. "I think these KSampler settings are better than
  what's listed" is a fine thing to believe — but the Codex isn't the place to
  litigate sampler configs. If you want your settings included, **open a pull
  request** and make the case there; don't open an issue asking us to change them.
- **Breadth over depth.** A concise, correct entry that helps someone start beats
  a long analysis of edge cases.

When in doubt about whether something fits, propose it in a pull request — a
concrete diff is much easier to say yes to than an open-ended request.

## Ways to contribute

- **Correct or add knowledge** — a new model, a missing text encoder / VAE, a
  compatibility that reality contradicts, a clearer glossary definition. This is
  the most valuable kind of contribution.
- **Fix the site** — bugs, accessibility, styling, or new views in the React app.
- **Improve docs** — the README, this guide, or inline comments.

## Before you start

```bash
npm install
npm run dev        # local dev server at the pinned port
```

## Making a change to the data

The rules that keep the dataset coherent live in the README under
[The data model](README.md#the-data-model) and
[Adding a model](README.md#adding-a-model). The essentials:

1. **Unique ids.** Every model and component id must be unique across *all* data
   files.
2. **Inherit, don't repeat.** A model omits `requires` to inherit its parent's
   files. Only declare `requires` when the set genuinely differs — and remember a
   declared list *fully replaces* the inherited one.
3. **Compatibilities are exceptions only.** `data/compatibilities.yaml` records
   only where reality differs from the computed baseline (an addition or an
   exception) — never an exhaustive matrix. See that file's header.
4. **Be honest about uncertainty.** If an edge is inferred or unverified, say so
   in its `notes` rather than asserting more than we know.

## Before you open a pull request

Run both checks — CI runs the build, and a broken data reference will fail the
deploy:

```bash
npm run validate   # referential integrity: dangling refs, dup ids, ancestry cycles
npm run build      # type-checks and produces a production build
```

`npm run validate` is fast and catches the mistakes TypeScript can't (a
`basedOn` pointing at a model that doesn't exist, a `requires` naming an unknown
component, a `seeAlso` to a missing glossary term, duplicate ids, ancestry
cycles). Please make sure both pass.

## Pull request guidelines

- Keep each PR focused on one change or one coherent set of related edits.
- In the description, say **why** — especially for compatibility edges, cite a
  source or note that it's an estimate.
- For data edits, mention whether the information is confirmed or inferred so
  reviewers can judge how strong a claim to make.
- Match the surrounding style. For prose in the data (descriptions, notes,
  definitions), aim for plain language a newcomer to ComfyUI could follow.

## Issues are for bugs; data changes are pull requests

Please respect this split — it's what keeps the project maintainable:

- **Issues are for bugs only** — the site is broken, a link 404s, `npm run
  validate` fails, something renders wrong, or the data is *factually* broken
  (e.g. a reference that points nowhere). Include concrete details: what you did,
  what you expected, what happened.
- **Want the data changed, added, or corrected? Open a pull request.** A new
  model, a disputed compatibility, better settings, a clearer definition — all of
  these are contributions, and the way to contribute them is a PR with the actual
  change, not an issue asking someone else to do it.

This isn't bureaucracy — the maintainer can't hand-apply everyone's data requests,
and a PR that already contains the edit (and passes `npm run validate`) is the
difference between a change that ships and one that sits in a backlog forever. If
you're unsure how to make the edit, the [Making a change to the data](#making-a-change-to-the-data)
section and the README walk through it; it's just editing YAML.

Blank issues are disabled and the "request a data change" path in the issue
picker links straight back here — that's intentional, not a bug.

By contributing, you agree to license your contributions the same way the
project is licensed: **code** under the [MIT License](LICENSE), and **data** (the
YAML under [`data/`](data/)) dedicated to the public domain under
[CC0 1.0](data/LICENSE).
