// The readiness check (Settings → Modules → Readiness check): three taps before a workout, how
// you slept, how sore you are and how much energy you have, and what Redrep makes of them.
//
//   S.readiness = { '2026-11-12': { sleep: 2, sore: 1, energy: 2, _ts }, … }
//
// One answer per day, merged per day on its own stamp like a day note (lib/sync-merge.js
// STAMPED_MAPS): a second session the same day is not asked again. Each answer is 0, 1 or 2,
// worst to best, so the three add up to a score from 0 to 6.
//
// What the score says is advice, never a lock: "Go lighter" takes one work set off every
// exercise that has two or more still to do and keeps the session out of progression
// (lib/session-noprog.js), so an easy day neither moves the weights up nor reads as a failed
// session that would take them down. Training as planned changes nothing.
import { setSessionNoProg } from './session-noprog.js'
import { isWarmupRow } from './workout-model.js'

/** The three questions, worst answer first. Labels are English source strings. */
export const READINESS_QUESTIONS = [
  { id: 'sleep', title: 'Sleep', options: ['Poor', 'Okay', 'Great'] },
  { id: 'sore', title: 'Soreness', options: ['Very sore', 'A bit', 'Fresh'] },
  { id: 'energy', title: 'Energy', options: ['Low', 'Okay', 'High'] },
]
export const READINESS_IDS = READINESS_QUESTIONS.map(q => q.id)

/** What each verdict says: a title and one line, English source strings. */
export const VERDICT_COPY = {
  lighter: { title: 'Take it easier today', line: 'One set fewer per exercise, and today will not count for progression.' },
  normal: { title: 'Ready to train', line: 'Nothing stands out. Train as planned.' },
  push: { title: 'A good day to push', line: 'You are well rested. Chase a record if one is close.' },
}

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const answer = v => (v === 0 || v === 1 || v === 2 ? v : null)

/** A stored entry read back: { sleep, sore, energy } when all three are answered, else null. */
export function readReadiness(entry) {
  if (!isMap(entry)) return null
  const out = {}
  for (const id of READINESS_IDS) {
    const v = answer(entry[id])
    if (v == null) return null
    out[id] = v
  }
  return out
}

/** The answers for `iso`, or null. */
export const readinessOn = (S, iso) => readReadiness(isMap(S?.readiness) ? S.readiness[iso] : null)

/** 0 (worst) to 6 (best). */
export const readinessScore = a => (a ? a.sleep + a.sore + a.energy : null)

/**
 * 'lighter', 'normal' or 'push'. A short night with no energy is a lighter day whatever the
 * soreness says; otherwise the sum decides.
 */
export function verdictOf(a) {
  if (!a) return null
  const score = readinessScore(a)
  if (score <= 2 || (a.sleep === 0 && a.energy === 0)) return 'lighter'
  if (score >= 5) return 'push'
  return 'normal'
}

/** S.readiness with `iso` answered, stamped `now`. Incomplete answers are not written. */
export function withReadiness(map, iso, answers, now = Date.now()) {
  const clean = readReadiness(answers)
  if (!clean) return isMap(map) ? map : {}
  return { ...(isMap(map) ? map : {}), [iso]: { ...clean, _ts: now } }
}

/**
 * Whether starting a workout on `iso` should ask: the module on (the caller checks it) and no
 * answer for the day yet.
 */
export const needsReadiness = (S, iso) => readinessOn(S, iso) == null

/**
 * The running session made lighter (mutates `active`, for a store update): the last work set
 * that is still to do comes off every exercise with two or more of them, and the whole session
 * stays out of progression. Returns how many sets came off.
 */
export function lighterSession(active) {
  if (!active || !Array.isArray(active.entries)) return 0
  let removed = 0
  for (const entry of active.entries) {
    if (!entry || !Array.isArray(entry.sets)) continue
    const open = entry.sets.map((s, i) => [s, i]).filter(([s]) => s && !s.done && !isWarmupRow(s))
    if (open.length < 2) continue
    entry.sets.splice(open[open.length - 1][1], 1)
    removed++
  }
  setSessionNoProg(active, true)
  active.readiness = 'lighter'
  return removed
}

/** The last `days` answered days up to `today`, oldest first: [{ d, score }]. */
export function readinessTrend(S, today, days = 14) {
  const out = []
  const end = new Date(today + 'T12:00:00')
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    const a = readinessOn(S, iso)
    if (a) out.push({ d: iso, score: readinessScore(a) })
  }
  return out
}
