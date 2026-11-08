// Redline (Redrep): one 0 to 100 intensity score per finished workout, shown as a gauge.
//
// Three parts, each 0..1, weighted and summed:
//   effort  (50%) how close the work sets went to failure: average RIR of the rated work sets,
//                 RIR 0 is 1, RIR 5 or more is 0. Unrated sets are left out, not counted as easy.
//   work    (35%) completed work sets against your usual: the median of up to the last 8 earlier
//                 sessions. 125% of usual or more is 1. Sets, not tonnage, so units, bodyweight
//                 lifts and holds all count the same way.
//   records (15%) personal records set in the session: 3 or more is 1.
// A session with no rated sets has no effort part; the other two share its weight, so a profile
// with Effort switched off still gets an honest score. With no earlier sessions the work part
// reads 0.6 ("a normal day"), since there is nothing to compare against yet.
// Pure: reads the saved workout shape (finish-workout.js buildCompletedWorkout), writes nothing.
import { rirOf } from './effort.js'
import { isWarmupRow } from './workout-model.js'

export const WEIGHTS = { effort: 0.5, work: 0.35, records: 0.15 }
export const BANDS = [
  { min: 90, id: 'redline', label: 'Redline' },
  { min: 70, id: 'hard', label: 'Tough' },
  { min: 40, id: 'solid', label: 'Solid' },
  { min: 0, id: 'easy', label: 'Easy' },
]
const HISTORY = 8
const RIR_FLOOR = 5
const WORK_FULL = 1.25
const RECORDS_FULL = 3
const NO_HISTORY_WORK = 0.6

const clamp01 = x => Math.min(1, Math.max(0, x))
const entriesOf = w => (Array.isArray(w?.entries) ? w.entries : [])
const setsOf = e => (Array.isArray(e?.sets) ? e.sets : [])

// A row's done units: each side of a per-side row is its own tick (history.js doneUnits).
function doneSides(s) {
  if (s?.sides && typeof s.sides === 'object') return ['L', 'R'].map(k => s.sides[k]).filter(x => x?.done)
  return s?.done ? [s] : []
}

/** The done work sets of a workout, one item per ticked side. Warm-ups never count. */
export function workSets(w) {
  const out = []
  entriesOf(w).forEach(e => setsOf(e).forEach(s => {
    if (isWarmupRow(s)) return
    doneSides(s).forEach(x => out.push(x))
  }))
  return out
}

function median(xs) {
  if (!xs.length) return null
  const a = [...xs].sort((p, q) => p - q)
  const m = a.length >> 1
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}

/**
 * The Redline score of workout `w`, compared with `history` (earlier saved workouts, any order).
 * Returns { score, band, parts: { effort, work, records } } where effort is null when unrated.
 */
export function redlineOf(w, history = []) {
  const sets = workSets(w)
  const rated = sets.map(rirOf).filter(r => r != null && Number.isFinite(Number(r))).map(Number)
  const effort = rated.length ? clamp01(1 - rated.reduce((a, b) => a + b, 0) / rated.length / RIR_FLOOR) : null

  const earlier = (Array.isArray(history) ? history : [])
    .filter(h => h && h !== w && h.id !== w?.id)
    .filter(h => (Number(h.end) || 0) <= (Number(w?.end) || Infinity))
    .sort((a, b) => (Number(b.end) || 0) - (Number(a.end) || 0))
    .slice(0, HISTORY)
    .map(h => workSets(h).length)
    .filter(n => n > 0)
  const usual = median(earlier)
  const work = sets.length === 0 ? 0 : usual ? clamp01(sets.length / usual / WORK_FULL) : NO_HISTORY_WORK

  const prs = Array.isArray(w?.prs) ? w.prs.length : 0
  const records = clamp01(prs / RECORDS_FULL)

  const parts = { effort, work, records }
  const weights = effort == null ? { work: WEIGHTS.work, records: WEIGHTS.records } : WEIGHTS
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  const raw = Object.entries(weights).reduce((n, [k, wt]) => n + parts[k] * wt, 0) / total
  const score = sets.length ? Math.round(raw * 100) : 0
  return { score, band: bandOf(score), parts }
}

/** The band a score falls in ('redline' | 'hard' | 'solid' | 'easy'), with its English label. */
export function bandOf(score) {
  return BANDS.find(b => score >= b.min) || BANDS.at(-1)
}
