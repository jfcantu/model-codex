# Model Codex

**▶ Live site: <https://jfcantu.github.io/model-codex/>**

A browsable, curated knowledge base of ComfyUI image-generation models — how
they're related, the **text encoders and VAEs** each one needs, and their
**known / estimated compatibilities**.

It's a static site: all knowledge lives in hand-editable YAML under [`data/`](data/),
and a React + Vite front end renders it. No backend, no database server — edit
files, commit, deploy anywhere static.

> **Heads up on what this is.** A quick project I had Claude write on a Sunday
> afternoon while getting over a cold. I tried to design a schema that's
> flexible, accurate, and easy to extend — but no guarantees, on either the data
> or the code. Treat the compatibilities as starting points, verify anything that
> matters, and if something's wrong, [open a pull request](CONTRIBUTING.md).

## Quick start

```bash
npm install
npm run dev        # local dev server
npm run build      # production build to dist/
npm run validate   # check the YAML data for broken references / cycles
```

## The pages

- **Quickstart** — the landing page. Task-oriented ("check if two files work
  together", "look up a model", "see how models are related") plus a
  plain-language intro to the four kinds of file.
- **Browse** — three tabs: *Diffusion models* (grouped by family), *Text
  encoders*, and *VAEs*. Deep-link a tab with `#/browse?tab=vaes`.
- **Model Tree** — the whole lineage as a clickable node tree, coloured by
  family (`#/tree`).
- **Compatibility** — a fill-in-the-blank checker: "Can I use a [VAE] for
  [family] with a [diffusion model] for [family]?" → a plain-language verdict
  (Yes / Probably / Maybe / No) with a plain-language reason and its basis.
- **Glossary** — every term explained in one place.

Clicking any model or file opens it in a **side drawer** over the current page,
driven by `?sel=<id>` (so it's linkable and Back closes it). The old
`#/model/:id` / `#/component/:id` links redirect to the drawer.

> **Terminology note.** In the UI, "model" means a *diffusion model* (the
> community's usual meaning). Text encoders and VAEs are shown as separate kinds
> of file, not "models", even though they're technically models too.
>
> The raw compatibility edges in the data power the checker but are never shown
> as a list — the app only expresses compatibility in plain language.

## The data model

Every model — base models and the finetunes built on them — is a node in one
graph, linked by `basedOn`. The data files:

### `data/models.yaml` — the models

```yaml
- id: flux1                 # unique id (across models AND components)
  name: Flux.1
  releasedBy: Black Forest Labs
  releaseYear: 2024
  description: >
    A newer, larger image model. Needs two text encoders and its own VAE.
  tags: [foundation]
  links:
    - label: Black Forest Labs
      url: https://blackforestlabs.ai/
  requires:                 # the files it needs (see inheritance below)
    - component: clip-l
      role: text encoder (secondary)
    - component: t5xxl
      role: text encoder (primary)
    - component: flux-vae
      role: vae

- id: chroma
  name: Chroma
  basedOn: flux1-schnell     # the model this was built on
  modifiesArchitecture: true # changes the parent's internals → "Heads up" caveat
  requires:                  # OVERRIDES inherited requirements (drops CLIP-L)
    - component: t5xxl
      role: text encoder (only)
    - component: flux-vae
      role: vae
  notes:                     # prominent caveats on the detail view
    - Tensor/architecture changes mean many ComfyUI Flux nodes won't work.
```

**Requirement inheritance** is the key rule: if a node omits `requires`, it
inherits the resolved requirements of its **nearest ancestor** that declares them.
So `Illustrious` and `NoobXL` need no `requires` block — they inherit SDXL's
CLIP-L + CLIP-G + VAE. If a node *does* declare `requires`, that list **fully
replaces** the inherited set — that's how `Chroma` drops CLIP-L from Flux.1.

### `data/text-encoders.yaml` & `data/vaes.yaml` — the components

One file per component type. There's **no `type:` field** — the loader stamps
the type from the source file, so an entry can't disagree with the file it's in.
Adding a new category later (e.g. upscalers) means a new file plus one line in
`src/data.ts`.

```yaml
# data/text-encoders.yaml
- id: t5xxl
  name: T5-XXL
  aliases: [t5, t5xxl_fp16]
  origin: Google T5
  description: A large T5 text encoder used by Flux.1, Chroma, SD3.x…
```

### `data/compatibilities.yaml` — exceptions & additions only

**Not an exhaustive matrix.** The checker computes a sensible baseline itself — a
model natively works with the files it requires; LoRAs transfer within a family
but not across architectures; nodes for an architecture work on it — and a model
inherits these from what it's built on. Record an edge here **only** where reality
differs: an *addition* (something extra works) or an *exception* (something
expected doesn't). An edge on a model also applies to models built on it.

`subject` and `object` are ids of **either** a model or a component.

```yaml
- subject: flux1-krea-dev  # addition: an alternative VAE beyond the Flux.1 one it inherits
  object: qwen-image-vae
  relation: can-use-vae     # can-use-vae | can-use-text-encoder | lora-transfer | node-support
  status: compatible        # compatible | likely | partial | incompatible
  notes: Reported usable as an alternative VAE.
```

### `data/glossary.yaml` — the terms

Plain-language definitions shown alphabetically on the Glossary page. `seeAlso`
links other terms by name; `npm run validate` checks those links resolve.

```yaml
- term: VAE
  aka: [Autoencoder]
  definition: Turns a model's internal result into the final image…
  examples: [SDXL VAE, Flux.1 VAE]
  seeAlso: [Text encoder]
```

## Adding a model

1. Add a node to `data/models.yaml`. Give it a unique `id`, and a `basedOn` if it
   descends from another model. Set `modifiesArchitecture: true` only if it
   changes its parent's internals (like Chroma).
2. Only add `requires` if the files it needs **differ** from its parent's —
   otherwise let it inherit.
3. Reference any new text encoder / VAE by adding it to `data/text-encoders.yaml`
   or `data/vaes.yaml` first.
4. Record any non-obvious compatibility in `data/compatibilities.yaml` — but only
   exceptions and additions to the defaults (see that file's header).
5. Run `npm run validate` to catch typos and broken references before committing.

> **On accuracy:** a few seed edges come from the project brief's illustrative
> examples and are noted as unverified in their `notes`. When in doubt, leave an
> honest caveat in the note rather than asserting more than we know.

## Tech

Vite · React · TypeScript · React Router (hash routing, so deep links work on any
static host) · d3-hierarchy for the tree layout · YAML data via
`@modyfi/vite-plugin-yaml`.

## License

Split by what it is:

- **Code** — the React app, build config, and scripts — is [MIT](LICENSE).
- **Data** — the curated YAML under [`data/`](data/) — is dedicated to the public
  domain under [CC0 1.0](data/LICENSE). Use it however you like; no attribution
  required. See [`data/LICENSE`](data/LICENSE).
