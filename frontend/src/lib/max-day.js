// Max day (Settings → Modules → Max day): test a real one-rep max instead of trusting an
// estimate. A warm-up built for one heavy single, then up to three attempts the way a
// powerlifting meet runs them: an opener you are sure of, and each next weight chosen by how
// the last one felt.
//
//   S.maxTests = { '0025': { w: 140, d: '2026-11-12', _ts }, … }
//
// One tested max per exercise, merged per exercise on its own stamp (lib/sync-merge.js
// STAMPED_MAPS). It is what a programme's %1RM is taken from (testedOrBest), until a later
// session's estimate goes past it: a test is the truth on its day, not for ever.
//
// The test itself is saved as a workout (lib/log-workout.js) kept out of progression: a heavy
// single says nothing about the next 3×5, so it must neither move nor reset the working weight.
// Missed attempts are not sets you did; the workout's note lists them.
import { best1RM } from './onerm.js'

// The opener, as a share of the estimate: a weight you could do on a bad day.
export const OPENER = 0.92
// The warm-up, as shares of the opener with the reps of each step.
export const WARMUP_STEPS = [[0.4, 8], [0.55, 5], [0.7, 3], [0.8, 2], [0.9, 1]]
export const ATTEMPTS = 3
// How the next attempt follows the last one: a share of it, at least this many steps.
const JUMP = { easy: [0.05, 2], hard: [0.025, 1] }

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const ISO = /^\d{4}-\d{2}-\d{2}$/
const round1 = v => Math.round(v * 10) / 10

/** `w` on the exercise's grid (`step`), never under the bar (`floor`). */
export function snapWeight(w, step = 2.5, floor = 0) {
  const s = step > 0 ? step : 2.5
  return Math.max(round1(Math.round(w / s) * s), floor || 0)
}

/** The opener from an estimated max. */
export const openerFor = (est, step, floor) => snapWeight(est * OPENER, step, floor)

/**
 * The warm-up up to an opener: [{ w, r }], lightest first, every weight on the grid, each
 * heavier than the one before and lighter than the opener. With a bar (`floor`), the empty bar
 * comes first.
 */
export function warmupFor(opener, step = 2.5, floor = 0) {
  const rows = []
  if (floor > 0 && floor < opener) rows.push({ w: floor, r: 10 })
  for (const [share, r] of WARMUP_STEPS) {
    const w = snapWeight(opener * share, step, floor)
    if (w >= opener || (rows.length && w <= rows[rows.length - 1].w)) continue
    rows.push({ w, r })
  }
  return rows
}

/**
 * The weight after an attempt: `feel` is 'easy' or 'hard' for one you made, 'missed' for one
 * you did not, which is tried again.
 */
export function nextAttempt(prev, feel, step = 2.5) {
  if (feel === 'missed') return prev
  const [share, steps] = JUMP[feel] || JUMP.hard
  const s = step > 0 ? step : 2.5
  return round1(prev + Math.max(steps * s, Math.round(prev * share / s) * s))
}

/** The heaviest attempt made, or null. `attempts` is [{ w, made }]. */
export function resultOf(attempts) {
  const made = (attempts || []).filter(a => a?.made && a.w > 0).map(a => a.w)
  return made.length ? Math.max(...made) : null
}

/** Whether the test is over: three attempts taken. */
export const testOver = attempts => (attempts || []).length >= ATTEMPTS

/** A stored tested max read back: { w, d }, or null. */
export function readTested(entry) {
  if (!isMap(entry) || !(Number(entry.w) > 0) || !ISO.test(String(entry.d))) return null
  return { w: Number(entry.w), d: entry.d }
}

export const testedMaxOf = (S, exId) => readTested(isMap(S?.maxTests) ? S.maxTests[exId] : null)

/** S.maxTests with `exId` tested at `w` on `d`, stamped `now`. */
export function withTestedMax(map, exId, w, d, now = Date.now()) {
  const base = isMap(map) ? map : {}
  if (!exId || !(w > 0) || !ISO.test(String(d))) return base
  return { ...base, [exId]: { w, d, _ts: now } }
}

/**
 * The max a programme works from, in best1RM's shape ({ est, w, r, d }): the tested one, unless a
 * session after the test estimated more. `best` is best1RM's answer, passed in or read.
 */
export function testedOrBest(S, exId, best = best1RM(S, exId)) {
  const tested = testedMaxOf(S, exId)
  if (!tested) return best
  if (best?.est > tested.w && best.d > tested.d) return best
  return { est: tested.w, w: tested.w, r: 1, d: tested.d, tested: true }
}

/**
 * The test as a description lib/log-workout.js buildLoggedWorkout takes: the warm-ups done and
 * the attempts made as sets, the missed ones in the note (`missedNote` words it, translated by
 * the caller). `start` and `end` are times in ms.
 */
export function maxDayWorkout({ exId, d, start, end, warmups, attempts, name, missedNote }) {
  const hhmm = t => { const x = new Date(t); return String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0') }
  const missed = (attempts || []).filter(a => !a.made).map(a => a.w)
  const sets = [
    ...(warmups || []).filter(r => r.done).map(r => ({ reps: r.r, weight: r.w, warmup: true })),
    ...(attempts || []).filter(a => a.made).map(a => ({ reps: 1, weight: a.w })),
  ]
  // Whole minutes that end by `end`: a session saved as still running (its start's minute plus a
  // duration rounded up) is one lib/log-workout.js refuses.
  const durationMin = Math.max(1, Math.floor((end - Math.floor(start / 60000) * 60000) / 60000))
  const from = Math.min(Math.floor(start / 60000) * 60000, Math.floor(end / 60000) * 60000 - durationMin * 60000)
  return {
    date: d,
    start: hhmm(from),
    durationMin,
    name,
    ...(missed.length && missedNote ? { note: missedNote(missed) } : {}),
    exercises: [{ exercise: exId, sets }],
  }
}
