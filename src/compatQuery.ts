// ---------------------------------------------------------------------------
// The "fill-in-the-blank" compatibility engine.
//
// The UI lets a user assemble a question of the form:
//   "Can I use a [PART TYPE] for [FAMILY A] with a [PART TYPE] for [FAMILY B]?"
//
// This module resolves that question to a verdict by combining three sources,
// in priority order:
//   1. Native requirements  — does the host model already require that exact
//                             component? (works by design)
//   2. Explicit edges       — a recorded compatibility fact from the data files
//   3. Ancestry inference   — an estimate from shared/different lineage
//                             (LoRAs and nodes)
// The `basis` on each verdict records which of these it came from.
// ---------------------------------------------------------------------------

import {
  ancestorChain,
  compatibilities,
  getComponent,
  getModel,
  labelFor,
  models,
  resolveRequirements,
  rootOf,
} from './data'
import type { CompatStatus, Compatibility } from './types'

export type PartType =
  | 'diffusion-model'
  | 'vae'
  | 'text-encoder'
  | 'lora'
  | 'comfyui-node'

export interface Slot {
  type: PartType
  family: string // a model node id
}

export type VerdictStatus = CompatStatus | 'unknown'

export interface Verdict {
  status: VerdictStatus
  /** One-sentence plain-language explanation. */
  reason: string
  /** How the verdict was reached (shown as a small label). */
  basis: 'native-requirement' | 'explicit-fact' | 'ancestry-estimate' | 'n/a'
  /** Supporting recorded facts, if any. */
  facts: Compatibility[]
}

export const PART_TYPES: { value: PartType; label: string; noun: string }[] = [
  { value: 'diffusion-model', label: 'diffusion model', noun: 'model' },
  { value: 'vae', label: 'VAE', noun: 'VAE' },
  { value: 'text-encoder', label: 'text encoder', noun: 'text encoder' },
  { value: 'lora', label: 'LoRA', noun: 'LoRA' },
  { value: 'comfyui-node', label: 'ComfyUI node', noun: 'ComfyUI node' },
]

export function partLabel(t: PartType): string {
  return PART_TYPES.find((p) => p.value === t)?.label ?? t
}

/** Model families that can sensibly fill the FAMILY blank for a given part type. */
export function familiesForType(type: PartType): typeof models {
  if (type === 'vae' || type === 'text-encoder') {
    return models.filter((m) =>
      resolveRequirements(m.id).requirements.some(
        (r) => getComponent(r.component)?.type === type,
      ),
    )
  }
  // diffusion-model / lora / comfyui-node apply to any model family.
  return models
}

/** The concrete component ids of a given type that a family's requirements imply. */
function familyComponentsOfType(
  familyId: string,
  type: 'vae' | 'text-encoder',
): string[] {
  return resolveRequirements(familyId)
    .requirements.map((r) => r.component)
    .filter((cid) => getComponent(cid)?.type === type)
}

/**
 * The recorded edge for a (host, part) pair, honouring both DIRECTION and
 * INHERITANCE. By convention `subject` is the host model and `object` is the
 * part used with it, so we only match that way round — never host/part swapped.
 * An edge stored on an ancestor of the host and/or an ancestor of the part still
 * applies, which is what lets us record only exceptions/additions.
 */
function inheritedEdge(
  hostId: string,
  partId: string,
  relation: string,
): Compatibility | undefined {
  const lineage = (id: string) => [id, ...ancestorChain(id).map((a) => a.id)]
  const hosts = new Set(lineage(hostId))
  const parts = new Set(lineage(partId))
  return compatibilities.find(
    (c) =>
      c.relation === relation && hosts.has(c.subject) && parts.has(c.object),
  )
}

/** All recorded edges touching either family (for the "supporting facts" panel). */
function factsBetween(a: string, b: string): Compatibility[] {
  const ids = new Set([a, b, ...familyComponentsOfType(a, 'vae'), ...familyComponentsOfType(b, 'vae')])
  return compatibilities.filter((c) => ids.has(c.subject) && ids.has(c.object))
}

const RELATION_FOR: Record<PartType, string> = {
  'diffusion-model': 'model-pairing',
  vae: 'can-use-vae',
  'text-encoder': 'can-use-text-encoder',
  lora: 'lora-transfer',
  'comfyui-node': 'node-support',
}

/**
 * Evaluate a question. We interpret it as: does the "part" (a companion, LoRA,
 * or node built for its family) work with the "host" diffusion model? Exactly
 * one slot should be a diffusion model.
 */
export function evaluate(a: Slot, b: Slot): Verdict {
  const aModel = a.type === 'diffusion-model'
  const bModel = b.type === 'diffusion-model'

  if (aModel && bModel) {
    return {
      status: 'unknown',
      basis: 'n/a',
      reason:
        'Pick a VAE, text encoder, LoRA, or node for one side to ask whether it works with the other model.',
      facts: [],
    }
  }
  if (!aModel && !bModel) {
    return {
      status: 'unknown',
      basis: 'n/a',
      reason:
        'Set one side to a diffusion model — compatibility is always “does this part work with that model?”.',
      facts: [],
    }
  }

  const host = aModel ? a : b
  const part = aModel ? b : a
  return evaluatePartWithHost(part, host.family)
}

/** "SDXL", or "NoobAI-XL (SDXL)" when the model differs from its root architecture. */
function archLabel(id: string): string {
  const root = labelFor(rootOf(id))
  const name = labelFor(id)
  return name === root ? name : `${name} (${root})`
}

function evaluatePartWithHost(part: Slot, hostFamily: string): Verdict {
  const partName = labelFor(part.family)
  const hostName = labelFor(hostFamily)
  const facts = factsBetween(part.family, hostFamily)

  switch (part.type) {
    case 'vae':
    case 'text-encoder': {
      const kind: 'vae' | 'text-encoder' = part.type
      const partComps = familyComponentsOfType(part.family, kind)
      if (partComps.length === 0) {
        return {
          status: 'unknown',
          basis: 'n/a',
          reason: `${partName} has no standard ${partLabel(kind)} recorded, so there's nothing to compare.`,
          facts,
        }
      }
      const hostReq = resolveRequirements(hostFamily).requirements.map(
        (r) => r.component,
      )
      const native = partComps.filter((c) => hostReq.includes(c))
      const names = partComps.map((c) => labelFor(c)).join(' + ')

      if (native.length === partComps.length) {
        return {
          status: 'compatible',
          basis: 'native-requirement',
          reason: `${hostName} natively uses ${names} — this is exactly its expected ${partLabel(kind)}.`,
          facts,
        }
      }

      // Recorded "can-use" edge for any of the part components (inherited from
      // ancestors too)?
      const edge = partComps
        .map((c) => inheritedEdge(hostFamily, c, RELATION_FOR[part.type]))
        .find(Boolean)
      if (edge) {
        return {
          status: edge.status,
          basis: 'explicit-fact',
          reason:
            edge.notes ??
            `Recorded as ${edge.status}: ${hostName} can use ${labelFor(edge.object)}.`,
          facts,
        }
      }

      if (native.length > 0) {
        return {
          status: 'partial',
          basis: 'native-requirement',
          reason: `${hostName} shares only some of ${partName}'s ${partLabel(kind)} (${partComps
            .map((c) => labelFor(c))
            .join(', ')}); overlap is partial.`,
          facts,
        }
      }
      // Not native and nothing recorded. Text encoders and VAEs are tightly
      // coupled to the architecture, so the honest default is "no" — the rare
      // exceptions (e.g. Krea's alternative VAEs) are recorded edges caught above.
      const hostOwn = hostReq
        .filter((c) => getComponent(c)?.type === kind)
        .map((c) => labelFor(c))
      return {
        status: 'incompatible',
        basis: 'native-requirement',
        reason: hostOwn.length
          ? `${hostName} uses ${hostOwn.join(' + ')}. A ${partLabel(kind)} made for ${partName} won't work with it — ${partLabel(kind)}s are architecture-specific unless a compatible one is recorded.`
          : `A ${partLabel(kind)} made for ${partName} won't work with ${hostName} — ${partLabel(kind)}s are architecture-specific unless a compatible one is recorded.`,
        facts,
      }
    }

    case 'lora': {
      const edge = inheritedEdge(hostFamily, part.family, 'lora-transfer')
      if (edge) {
        return {
          status: edge.status,
          basis: 'explicit-fact',
          reason: edge.notes ?? `Recorded LoRA transfer: ${edge.status}.`,
          facts,
        }
      }
      if (part.family === hostFamily) {
        return {
          status: 'compatible',
          basis: 'native-requirement',
          reason: `A LoRA trained on ${hostName} is meant for ${hostName}.`,
          facts,
        }
      }
      const sameRoot = rootOf(part.family) === rootOf(hostFamily)
      if (sameRoot) {
        return {
          status: 'likely',
          basis: 'ancestry-estimate',
          reason: `${partName} and ${hostName} share the ${labelFor(rootOf(hostFamily))} architecture — LoRAs usually transfer within a family, but not always.`,
          facts,
        }
      }
      return {
        status: 'incompatible',
        basis: 'ancestry-estimate',
        reason: `${archLabel(part.family)} and ${archLabel(hostFamily)} are different architectures, so LoRAs won't transfer.`,
        facts,
      }
    }

    case 'comfyui-node': {
      const edge = inheritedEdge(hostFamily, part.family, 'node-support')
      if (edge) {
        return {
          status: edge.status,
          basis: 'explicit-fact',
          reason: edge.notes ?? `Recorded node support: ${edge.status}.`,
          facts,
        }
      }
      if (part.family === hostFamily) {
        return {
          status: 'compatible',
          basis: 'native-requirement',
          reason: `A node written for ${hostName} targets ${hostName} directly.`,
          facts,
        }
      }
      const sameRoot = rootOf(part.family) === rootOf(hostFamily)
      if (sameRoot) {
        return {
          status: 'partial',
          basis: 'ancestry-estimate',
          reason: `${partName} and ${hostName} share the ${labelFor(rootOf(hostFamily))} architecture; many nodes work, but architecture-specific ones may not. (Estimate.)`,
          facts,
        }
      }
      return {
        status: 'unknown',
        basis: 'ancestry-estimate',
        reason: `${partName} and ${hostName} are different architectures; a node built for one usually will not work with the other. (Estimate.)`,
        facts,
      }
    }

    default:
      return {
        status: 'unknown',
        basis: 'n/a',
        reason: 'Unsupported combination.',
        facts,
      }
  }
}

/** Human-readable phrase for one slot, e.g. "an SDXL LoRA" or "a Flux.1 model". */
export function slotPhrase(slot: Slot): string {
  const fam = getModel(slot.family)?.name ?? slot.family
  if (slot.type === 'diffusion-model') return `a ${fam} model`
  return `a ${fam} ${partLabel(slot.type)}`
}
