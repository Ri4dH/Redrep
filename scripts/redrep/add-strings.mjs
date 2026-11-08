// Adds Redrep's own UI strings (strings.json beside this file) to every locale pack in
// frontend/src/locales. pt-BR gets them as explicit overrides. Keys already present are left alone.
// Usage: node scripts/redrep/add-strings.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const locales = join(here, '..', '..', 'frontend', 'src', 'locales')
const strings = JSON.parse(readFileSync(join(here, 'strings.json'), 'utf8'))
const langs = [...new Set(Object.values(strings).flatMap(Object.keys))]

for (const lang of langs) {
  const file = join(locales, `${lang}.js`)
  let src = readFileSync(file, 'utf8')
  const mod = await import(file)
  const have = lang === 'pt-BR' ? mod.PT_BR_OVERRIDES : mod.default
  const lines = Object.entries(strings)
    .filter(([key, tr]) => tr[lang] != null && !(key in have))
    .map(([key, tr]) => `  ${JSON.stringify(key)}: ${JSON.stringify(tr[lang])},`)
  if (!lines.length) continue
  // The object to add to: pt-BR's overrides, else the default export. Its closing brace is the
  // first line that is exactly "}" after its opening.
  const open = lang === 'pt-BR' ? src.indexOf('export const PT_BR_OVERRIDES = {') : src.indexOf('export default {')
  if (open < 0) throw new Error(`${lang}: no object to add to`)
  const close = src.indexOf('\n}', open)
  src = src.slice(0, close) + '\n' + lines.join('\n') + src.slice(close)
  writeFileSync(file, src)
  console.log(`${lang}: +${lines.length}`)
}
