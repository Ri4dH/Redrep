// The pain and injury map (Settings → Modules → Pain and injuries): tap a muscle on the body
// map, say how much it hurts from 1 to 5, and Redrep flags the exercises that load it and
// suggests ones that do not.
//
//   S.pains = { deltoids: { lvl: 3, since: '2026-11-02', log: [['2026-11-02', 4], ['2026-11-09', 3]], _ts }, … }
//
// One entry per area (the body map's muscles, lib/muscles.js MUSCLES), merged per area on its
// own stamp (lib/sync-merge.js STAMPED_MAPS). Level 0 is healed: the entry stays, with its log,
// so the history of a shoulder that came back is still there. `since` is the first day of the
// current spell; the log keeps one level per day, the last LOG_MAX days that changed.
//
// What counts as loading an area: the exercise trains it at half its weight or more
// (lib/muscles.js muscleWeightsOf), so a bench press flags sore shoulders and triceps but a
// squat does not flag a sore chest.
import { MUSCLES } from './muscles.js'

export const PAIN_AREAS = MUSCLES
export const PAIN_MAX = 5
export const LOG_MAX = 60
// The share of an exercise's load on an area that counts as loading it.
export const LOADS_AT = 0.5

/** What each level reads as, English source strings. */
export const PAIN_LABEL = { 0: 'No pain', 1: 'Barely there', 2: 'Mild', 3: 'Sore', 4: 'Painful', 5: 'Injured' }

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const ISO = /^\d{4}-\d{2}-\d{2}$/
const level = v => (Number.isInteger(v) && v >= 0 && v <= PAIN_MAX ? v : null)

/** A stored entry read back: { lvl, since, log } with the junk left out, or null. */
export function readPain(entry) {
  if (!isMap(entry)) return null
  const lvl = level(entry.lvl)
  if (lvl == null) return null
  const log = (Array.isArray(entry.log) ? entry.log : [])
    .filter(p => Array.isArray(p) && ISO.test(String(p[0])) && level(p[1]) != null)
    .map(p => [p[0], p[1]])
  return { lvl, since: lvl > 0 && ISO.test(String(entry.since)) ? entry.since : null, log }
}

/** The entry for `area`, or null. */
export const painOf = (S, area) => (PAIN_AREAS.includes(area) && isMap(S?.pains) ? readPain(S.pains[area]) : null)

/** Every area that hurts today, worst first, then head to toe: [{ area, lvl, since }]. */
export function activePains(S) {
  return PAIN_AREAS.map(area => ({ area, ...painOf(S, area) }))
    .filter(p => p.lvl > 0)
    .sort((a, b) => b.lvl - a.lvl || PAIN_AREAS.indexOf(a.area) - PAIN_AREAS.indexOf(b.area))
    .map(({ area, lvl, since }) => ({ area, lvl, since }))
}

/**
 * S.pains with `area` at `lvl` on `today`, stamped `now`. The day's earlier level is replaced, a
 * new spell starts when the area was healed (or new), and the log keeps the newest LOG_MAX days.
 */
export function withPain(map, area, lvl, today, now = Date.now()) {
  const base = isMap(map) ? map : {}
  if (!PAIN_AREAS.includes(area) || level(lvl) == null || !ISO.test(String(today))) return base
  const prev = readPain(base[area])
  const log = (prev?.log || []).filter(p => p[0] !== today)
  log.push([today, lvl])
  log.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  const since = lvl > 0 ? (prev && prev.lvl > 0 && prev.since ? prev.since : today) : null
  return { ...base, [area]: { lvl, ...(since ? { since } : {}), log: log.slice(-LOG_MAX), _ts: now } }
}

/** How the body map shades each area: level 1 to 3 as they are, 4 and 5 as the darkest. */
export function painLevels(S) {
  return Object.fromEntries(activePains(S).map(p => [p.area, Math.min(4, p.lvl)]))
}

/** Better, worse or the same since the level before the last one; null with one reading. */
export function painTrend(entry) {
  const log = entry?.log || []
  if (log.length < 2) return null
  const [a, b] = [log[log.length - 2][1], log[log.length - 1][1]]
  return b < a ? 'better' : b > a ? 'worse' : 'same'
}

/**
 * The areas that hurt and that an exercise with these muscle weights (lib/muscles.js
 * muscleWeightsOf) loads, worst first: [{ area, lvl }].
 */
export function painsLoadedBy(pains, weights) {
  if (!isMap(weights)) return []
  return pains.filter(p => (Number(weights[p.area]) || 0) >= LOADS_AT)
}

/**
 * Up to `max` candidates from `list` (in its order) that load none of the areas that hurt.
 * `weightsOf` reads an exercise's muscle weights.
 */
export function painFree(list, pains, weightsOf, max = 3) {
  const out = []
  for (const ex of list) {
    if (out.length >= max) break
    if (!painsLoadedBy(pains, weightsOf(ex)).length) out.push(ex)
  }
  return out
}
