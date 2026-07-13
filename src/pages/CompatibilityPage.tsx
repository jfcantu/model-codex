import { useMemo, useState } from 'react'
import {
  PART_TYPES,
  type PartType,
  type Slot,
  type VerdictStatus,
  evaluate,
  familiesForType,
  slotPhrase,
} from '../compatQuery'
import { ancestorChain, familyList, familyOf } from '../data'

// Group the family options by family, ordered depth-first, so the dropdown
// reads like the Browse tree (family headers via <optgroup>, children indented).
const SEP = String.fromCharCode(1)
function groupedFamilyOptions(families: { id: string; name: string }[]) {
  return familyList()
    .map((fam) => ({
      fam,
      items: families
        .filter((m) => familyOf(m.id) === fam)
        .map((m) => ({
          id: m.id,
          name: m.name,
          depth: ancestorChain(m.id).length,
          path: [
            ...ancestorChain(m.id)
              .map((a) => a.name)
              .reverse(),
            m.name,
          ].join(SEP),
        }))
        .sort((a, b) => a.path.localeCompare(b.path)),
    }))
    .filter((g) => g.items.length)
}

// The plain-language headline answer, straight from the outcome.
function answerWord(status: VerdictStatus): string {
  switch (status) {
    case 'compatible':
      return 'Yes.'
    case 'likely':
      return 'Probably.'
    case 'partial':
      return 'Maybe.'
    case 'incompatible':
      return 'No.'
    default:
      return 'Not sure.'
  }
}

/** One editable slot: a part-type dropdown + a family dropdown. `excludeType` is
 *  the other slot's type — omitted here so the two slots can't be the same type
 *  (which would be a meaningless question). */
function SlotPicker({
  slot,
  onChange,
  excludeType,
}: {
  slot: Slot
  onChange: (s: Slot) => void
  excludeType?: PartType
}) {
  const families = useMemo(() => familiesForType(slot.type), [slot.type])
  const familyValid = families.some((f) => f.id === slot.family)
  const family = familyValid ? slot.family : families[0]?.id ?? ''

  return (
    <span className="slot">
      <select
        className="slot-type"
        value={slot.type}
        onChange={(e) => {
          const type = e.target.value as PartType
          const next = familiesForType(type)
          const keep = next.some((f) => f.id === slot.family)
          onChange({ type, family: keep ? slot.family : next[0]?.id ?? '' })
        }}
      >
        {PART_TYPES.filter((p) => p.value !== excludeType).map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <span className="connective">
        {slot.type === 'diffusion-model' ? 'based on' : 'for'}
      </span>
      <select
        className="slot-family"
        value={family}
        onChange={(e) => onChange({ ...slot, family: e.target.value })}
      >
        {groupedFamilyOptions(families).map((g) => (
          <optgroup key={g.fam} label={g.fam}>
            {g.items.map((it) => (
              <option key={it.id} value={it.id}>
                {'  '.repeat(it.depth) + (it.depth ? '└ ' : '') + it.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </span>
  )
}

export default function CompatibilityPage() {
  const [a, setA] = useState<Slot>({ type: 'lora', family: 'sdxl' })
  const [b, setB] = useState<Slot>({ type: 'diffusion-model', family: 'flux1' })

  const verdict = useMemo(() => evaluate(a, b), [a, b])

  return (
    <div>
      <div className="page-head">
        <h1>Compatibility checker</h1>
        <p className="lede">
          Pick two things and see whether they work together. Answers come from
          what a model actually needs, or — clearly labelled — an educated guess
          based on how the models are related.
        </p>
      </div>

      <div className="query-builder">
        <div className="query-sentence">
          <span className="connective">Can I use a</span>{' '}
          <SlotPicker slot={a} onChange={setA} excludeType={b.type} />{' '}
          <span className="connective">with a</span>{' '}
          <SlotPicker slot={b} onChange={setB} excludeType={a.type} />
          <span className="connective">?</span>
        </div>

        <div className={`verdict verdict-${verdict.status}`}>
          <div className="verdict-head">
            <span className="answer-word">{answerWord(verdict.status)}</span>
          </div>
          <p className="verdict-question">
            {slotPhrase(a)} with {slotPhrase(b)}
          </p>
          <p className="verdict-reason">{verdict.reason}</p>
          <p className="verdict-basis">
            based on:{' '}
            {verdict.basis === 'native-requirement'
              ? 'what this model needs to run'
              : verdict.basis === 'explicit-fact'
                ? 'known compatibility'
                : verdict.basis === 'ancestry-estimate'
                  ? 'an educated guess from how the models are related'
                  : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
