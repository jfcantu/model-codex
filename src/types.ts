// ---------------------------------------------------------------------------
// Domain model for the ComfyUI model knowledge base ("Model Codex").
//
// The core idea: every model — base models and the finetunes built on them — is
// a node in one graph, linked by `basedOn`. The text encoders and VAE a model
// needs attach to a node and are INHERITED by descendants unless a descendant
// overrides them. That lets Chroma inherit most of Flux.1 but drop CLIP-L,
// without repeating the whole list.
// ---------------------------------------------------------------------------

/** The nature of a compatibility relationship. */
export type CompatStatus =
  | 'compatible' //     works, confirmed
  | 'likely' //         probably works, not verified
  | 'partial' //        works with caveats / some tooling breaks
  | 'incompatible' //   does not work

/** Category of a text encoder or VAE. */
export type ComponentType =
  | 'text-encoder'
  | 'vae'
  | 'unet' // reserved for future use
  | 'other'

/** A text encoder or VAE a model needs (or can pair with). */
export interface Component {
  id: string
  name: string
  type: ComponentType
  aliases?: string[]
  description?: string
  /** Where this component comes from, e.g. "Flux.1", "Stability AI". */
  origin?: string
  /** Grouping label on the Browse tab (e.g. "CLIP", "T5", "Stable Diffusion"). */
  family?: string
  /**
   * If set, this component is an interchangeable variant of another (e.g.
   * FLAN-T5-XXL is a variant of T5-XXL). Variants group under their base and
   * can stand in for it.
   */
  variantOf?: string
}

/**
 * One file a model needs. `component` points at a Component id; `role` is a
 * human label for how it's used ("text encoder (primary)", "vae").
 */
export interface Requirement {
  component: string
  role?: string
}

/**
 * Suggested starting-point sampler settings, keyed by parameter name
 * (Sampler, Scheduler, Steps, CFG, FluxGuidance, Shift, …). Kept open-ended
 * because different families expose different knobs (e.g. FluxGuidance in place
 * of CFG). Inherited by descendants like `requires`.
 */
export type SamplingSettings = Record<string, string | number>

/** A model in the graph, linked to what it was built on via `basedOn`. */
export interface ModelNode {
  id: string
  name: string
  /** Parent model id. Roots omit this (or set null). */
  basedOn?: string | null
  /**
   * Brand family used to group otherwise-separate roots in Browse — e.g. SDXL,
   * SD 1.5 and SD 3.5 all set family "Stable Diffusion". Set on roots; a
   * descendant takes its root's family. Defaults to the root's own name.
   */
  family?: string
  /**
   * True if this model changes the internals of what it was built on (like
   * Chroma vs Flux.1), so tooling written for the parent may not work. Drives
   * the "Heads up" caveat on the detail view.
   */
  modifiesArchitecture?: boolean
  aliases?: string[]
  description?: string
  releasedBy?: string
  releaseYear?: number
  /** Reference links (HuggingFace, Civitai, project page, paper). */
  links?: { label: string; url: string }[]

  /**
   * The files this model needs. If omitted, the model INHERITS the resolved
   * requirements of its nearest ancestor that declares them. If present, this
   * list REPLACES the inherited set (full override) — see Chroma dropping
   * CLIP-L relative to Flux.1.
   */
  requires?: Requirement[]

  /** Suggested sampler settings. Inherited from the nearest ancestor if omitted. */
  sampling?: SamplingSettings

  /** Freeform caveats shown prominently on the detail view. */
  notes?: string[]
  /** Short tags for filtering (e.g. "anime", "video", "distilled"). */
  tags?: string[]
}

/**
 * A typed compatibility edge between two entities (models and/or components).
 * Subjects/objects are ids that may refer to either a ModelNode or a Component.
 */
export interface Compatibility {
  subject: string
  object: string
  /**
   * The kind of relationship, e.g.
   *   "can-use-vae", "can-use-text-encoder", "lora-transfer", "node-support".
   * Freeform but conventional — see data/compatibilities.yaml.
   */
  relation: string
  status: CompatStatus
  notes?: string
}

/** A glossary entry explaining a term used across the Codex. */
export interface GlossaryTerm {
  term: string
  aka?: string[]
  definition: string
  examples?: string[]
  /** Other term names this links to (matched case-insensitively). */
  seeAlso?: string[]
}

// ---- Resolved / derived shapes used by the UI --------------------------------

export interface ResolvedRequirements {
  requirements: Requirement[]
  /** id of the ancestor these requirements were inherited from, if inherited. */
  inheritedFrom?: string
}

export interface ResolvedSampling {
  settings: SamplingSettings
  /** id of the ancestor these settings were inherited from, if inherited. */
  inheritedFrom?: string
}
