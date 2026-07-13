// ---------------------------------------------------------------------------
// Loads the YAML data files (imported as JS objects by the vite yaml plugin),
// indexes them, and derives the shapes the UI needs: resolved requirements
// (with inheritance), ancestry chains, children, and compatibility lookups.
// ---------------------------------------------------------------------------

import rawModels from '../data/models.yaml'
import rawTextEncoders from '../data/text-encoders.yaml'
import rawVaes from '../data/vaes.yaml'
import rawCompat from '../data/compatibilities.yaml'
import rawGlossary from '../data/glossary.yaml'
import type {
  Compatibility,
  Component,
  ComponentType,
  GlossaryTerm,
  ModelNode,
  ResolvedRequirements,
  ResolvedSampling,
} from './types'

export const models = rawModels as ModelNode[]

// Components live in one file per type (text-encoders.yaml, vaes.yaml). The
// `type` is not stored per entry — it's stamped here from the source file, so
// an entry can never carry a type that disagrees with the file it's in.
function withType(raw: unknown, type: ComponentType): Component[] {
  return (raw as Omit<Component, 'type'>[]).map((c) => ({ ...c, type }))
}
export const components: Component[] = [
  ...withType(rawTextEncoders, 'text-encoder'),
  ...withType(rawVaes, 'vae'),
]

export const compatibilities = rawCompat as Compatibility[]
export const glossary = rawGlossary as GlossaryTerm[]

const modelById = new Map(models.map((m) => [m.id, m]))
const componentById = new Map(components.map((c) => [c.id, c]))

export function getModel(id: string): ModelNode | undefined {
  return modelById.get(id)
}
export function getComponent(id: string): Component | undefined {
  return componentById.get(id)
}

/** A name for any id, whether it's a model node or a component. */
export function labelFor(id: string): string {
  return modelById.get(id)?.name ?? componentById.get(id)?.name ?? id
}

export type EntityKind = 'model' | 'component' | 'unknown'
export function entityKind(id: string): EntityKind {
  if (modelById.has(id)) return 'model'
  if (componentById.has(id)) return 'component'
  return 'unknown'
}

// ---- Ancestry -------------------------------------------------------------

/** The chain from a node up to its root, nearest-first (self excluded). */
export function ancestorChain(id: string): ModelNode[] {
  const chain: ModelNode[] = []
  const seen = new Set<string>([id])
  let cur = modelById.get(id)?.basedOn ?? null
  while (cur && !seen.has(cur)) {
    seen.add(cur)
    const parent = modelById.get(cur)
    if (!parent) break
    chain.push(parent)
    cur = parent.basedOn ?? null
  }
  return chain
}

/** Direct children of a node. */
export function childrenOf(id: string): ModelNode[] {
  return models.filter((m) => m.basedOn === id)
}

/** Root nodes (no parent), for building the ancestry forest. */
export function rootNodes(): ModelNode[] {
  return models.filter((m) => !m.basedOn)
}

/** The root architecture a node ultimately descends from (its own id if a root). */
export function rootOf(id: string): string {
  const chain = ancestorChain(id)
  return chain.length ? chain[chain.length - 1].id : id
}

export const OTHER_FAMILY = 'Other'

/** How many top-level nodes (roots) each brand family has. */
function familyRootCounts(): Map<string, number> {
  const counts = new Map<string, number>()
  for (const r of rootNodes()) {
    const f = r.family ?? r.name
    counts.set(f, (counts.get(f) ?? 0) + 1)
  }
  return counts
}

/**
 * The group a model belongs to for Browse and colouring: its brand family only
 * if that family has 2+ roots (so there's something to group); otherwise the
 * shared "Other" bucket. Single-root families and unfamilied nodes → "Other".
 */
export function familyOf(id: string): string {
  const root = modelById.get(rootOf(id))
  const fam = root?.family ?? root?.name ?? id
  return (familyRootCounts().get(fam) ?? 0) >= 2 ? fam : OTHER_FAMILY
}

/** Ordered groups: multi-root families (first-appearance order), then "Other". */
export function familyList(): string[] {
  const counts = familyRootCounts()
  const real: string[] = []
  let hasOther = false
  for (const r of rootNodes()) {
    const f = r.family ?? r.name
    if ((counts.get(f) ?? 0) >= 2) {
      if (!real.includes(f)) real.push(f)
    } else {
      hasOther = true
    }
  }
  return hasOther ? [...real, OTHER_FAMILY] : real
}

// ---- Requirement inheritance ---------------------------------------------

/**
 * Resolve the files a node requires. If the node declares `requires`,
 * that wins. Otherwise walk up the ancestry to the nearest ancestor that
 * declares `requires` and inherit it, recording where it came from.
 */
export function resolveRequirements(id: string): ResolvedRequirements {
  const self = modelById.get(id)
  if (!self) return { requirements: [] }
  if (self.requires && self.requires.length) {
    return { requirements: self.requires }
  }
  for (const ancestor of ancestorChain(id)) {
    if (ancestor.requires && ancestor.requires.length) {
      return { requirements: ancestor.requires, inheritedFrom: ancestor.id }
    }
  }
  return { requirements: [] }
}

/** Suggested sampler settings, inherited from the nearest ancestor if omitted. */
export function resolveSampling(id: string): ResolvedSampling {
  const self = modelById.get(id)
  if (!self) return { settings: {} }
  if (self.sampling && Object.keys(self.sampling).length) {
    return { settings: self.sampling }
  }
  for (const ancestor of ancestorChain(id)) {
    if (ancestor.sampling && Object.keys(ancestor.sampling).length) {
      return { settings: ancestor.sampling, inheritedFrom: ancestor.id }
    }
  }
  return { settings: {} }
}

// ---- Compatibility lookups ------------------------------------------------

/** All compatibility edges touching an id (as subject or object). */
export function compatFor(id: string): Compatibility[] {
  return compatibilities.filter((c) => c.subject === id || c.object === id)
}

/** Models whose resolved requirements include a given component id. */
export function modelsRequiring(componentId: string): ModelNode[] {
  return models.filter((m) =>
    resolveRequirements(m.id).requirements.some(
      (r) => r.component === componentId,
    ),
  )
}
