// Referential-integrity check for the YAML data files. Run after editing data:
//   npm run validate
// Catches the mistakes the TypeScript build cannot: dangling `basedOn` parents,
// `requires` pointing at unknown components, compatibility edges referencing
// unknown ids, duplicate ids, and ancestry cycles.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { load as parseYaml } from 'js-yaml'

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')
const load = (f) => parseYaml(readFileSync(join(dataDir, f), 'utf8'))

const models = load('models.yaml')
// Components live in one file per type; type is inferred from the source file.
const components = [
  ...load('text-encoders.yaml').map((c) => ({ ...c, type: 'text-encoder' })),
  ...load('vaes.yaml').map((c) => ({ ...c, type: 'vae' })),
]
const compat = load('compatibilities.yaml')
const glossary = load('glossary.yaml')

const modelIds = new Set(models.map((m) => m.id))
const compIds = new Set(components.map((c) => c.id))
const allIds = new Set([...modelIds, ...compIds])

let errors = 0
const err = (m) => {
  console.log('  ✗', m)
  errors++
}

const seen = new Set()
for (const id of [...models.map((m) => m.id), ...components.map((c) => c.id)]) {
  if (seen.has(id)) err(`duplicate id: ${id}`)
  seen.add(id)
}
for (const m of models) {
  if (m.basedOn && !modelIds.has(m.basedOn))
    err(`${m.id}: basedOn → unknown model "${m.basedOn}"`)
  for (const r of m.requires ?? [])
    if (!compIds.has(r.component))
      err(`${m.id}: requires → unknown component "${r.component}"`)
}
// component variants: base must exist, share type, and not itself be a variant
for (const c of components) {
  if (!c.variantOf) continue
  const base = components.find((x) => x.id === c.variantOf)
  if (!base) err(`${c.id}: variantOf → unknown component "${c.variantOf}"`)
  else if (base.type !== c.type)
    err(`${c.id}: variantOf → "${c.variantOf}" of a different type`)
  else if (base.variantOf)
    err(`${c.id}: variantOf → "${c.variantOf}" which is itself a variant`)
}
for (const c of compat) {
  if (!allIds.has(c.subject)) err(`compat subject → unknown id "${c.subject}"`)
  if (!allIds.has(c.object)) err(`compat object → unknown id "${c.object}"`)
}
for (const m of models) {
  const path = [m.id]
  let cur = m.basedOn
  let hops = 0
  while (cur) {
    if (path.includes(cur)) {
      err(`ancestry cycle: ${path.join(' → ')} → ${cur}`)
      break
    }
    path.push(cur)
    cur = models.find((x) => x.id === cur)?.basedOn
    if (++hops > 100) break
  }
}

// glossary seeAlso must resolve to a real term (case-insensitive)
const termNames = new Set(glossary.map((g) => g.term.toLowerCase()))
for (const g of glossary)
  for (const s of g.seeAlso ?? [])
    if (!termNames.has(s.toLowerCase()))
      err(`glossary "${g.term}": seeAlso → unknown term "${s}"`)

console.log(
  `\nmodels: ${models.length}  components: ${components.length}  compat edges: ${compat.length}  glossary: ${glossary.length}`,
)
console.log(errors ? `\n${errors} error(s) found` : '\n✓ all references valid, no cycles')
process.exit(errors ? 1 : 0)
