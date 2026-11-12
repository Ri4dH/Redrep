// Protein, water and supplements (Settings → Modules → Protein, water and supplements): a few
// taps a day on Home, a goal for each, and a daily reminder for what you take.
//
//   S.intake = { '2026-11-12': { p: 85, water: 1500, sup: ['crea'], _ts }, … }
//   S.supplements = [{ id: 'crea', name: 'Creatine' }, …]
//   S.proteinGoal = null | grams     S.waterGoal = null | ml     S.supReminder = null | 'HH:MM'
//
// One entry per day, merged per day on its own stamp (lib/sync-merge.js STAMPED_MAPS); the list
// of supplements and the goals are plain settings. Protein is grams, water millilitres, whatever
// the profile's weight unit: a glass is a glass. Without a goal of its own, protein aims at
// 1.8 g per kg of body weight (the middle of the 1.6 to 2.2 the research supports for lifting),
// and water at 2.5 litres.
import { isoOf } from './format.js'

export const PROTEIN_PER_KG = 1.8
export const PROTEIN_FALLBACK = 140
export const WATER_FALLBACK = 2500
export const PROTEIN_MAX = 1000
export const WATER_MAX = 10000
export const SUPPLEMENTS_MAX = 12
export const NAME_MAX = 40
// The quick buttons on the card.
export const PROTEIN_STEPS = [10, 25]
export const WATER_STEPS = [250, 500]
// The supplement reminder's notifications: one per day for the next REMINDER_DAYS days.
export const REMINDER_DAYS = 7
export const REMINDER_ID_BASE = 3000

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/
const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)))

/** The daily protein goal in grams: the profile's own, else from body weight (`bwKg`), else 140. */
export function proteinGoalOf(S, bwKg) {
  if (Number(S?.proteinGoal) > 0) return clamp(S.proteinGoal, PROTEIN_MAX)
  if (Number(bwKg) > 0) return Math.round(bwKg * PROTEIN_PER_KG / 5) * 5
  return PROTEIN_FALLBACK
}

/** The daily water goal in millilitres. */
export const waterGoalOf = S => (Number(S?.waterGoal) > 0 ? clamp(S.waterGoal, WATER_MAX) : WATER_FALLBACK)

/** The supplements the profile takes, cleaned: [{ id, name }]. */
export function supplementsOf(S) {
  const seen = new Set()
  return (Array.isArray(S?.supplements) ? S.supplements : [])
    .filter(x => isMap(x) && typeof x.id === 'string' && x.id && typeof x.name === 'string' && x.name.trim() && !seen.has(x.id) && seen.add(x.id))
    .slice(0, SUPPLEMENTS_MAX)
    .map(x => ({ id: x.id, name: x.name.trim().slice(0, NAME_MAX) }))
}

/** A day read back: { p, water, sup }, zeros for a day with nothing logged. */
export function intakeOn(S, iso) {
  const e = isMap(S?.intake) ? S.intake[iso] : null
  if (!isMap(e)) return { p: 0, water: 0, sup: [] }
  return {
    p: clamp(e.p, PROTEIN_MAX),
    water: clamp(e.water, WATER_MAX),
    sup: Array.isArray(e.sup) ? [...new Set(e.sup.filter(x => typeof x === 'string' && x))] : [],
  }
}

/**
 * S.intake with `iso` changed by `patch` ({ p?, water?, sup? }, whole values), stamped `now`.
 * Protein and water stay between 0 and their caps.
 */
export function withIntake(map, iso, patch, now = Date.now()) {
  const base = isMap(map) ? map : {}
  const cur = intakeOn({ intake: base }, iso)
  const next = {
    p: patch.p != null ? clamp(patch.p, PROTEIN_MAX) : cur.p,
    water: patch.water != null ? clamp(patch.water, WATER_MAX) : cur.water,
    sup: Array.isArray(patch.sup) ? [...new Set(patch.sup.filter(x => typeof x === 'string' && x))] : cur.sup,
  }
  return { ...base, [iso]: { ...next, _ts: now } }
}

/** S.intake with `n` grams of protein (or ml of water, `what` = 'water') added to `iso`. */
export const addIntake = (map, iso, what, n, now = Date.now()) =>
  withIntake(map, iso, { [what]: intakeOn({ intake: map }, iso)[what] + n }, now)

/** S.intake with supplement `id` ticked on `iso`, or unticked when it was. */
export function toggleSupplement(map, iso, id, now = Date.now()) {
  const sup = intakeOn({ intake: map }, iso).sup
  return withIntake(map, iso, { sup: sup.includes(id) ? sup.filter(x => x !== id) : [...sup, id] }, now)
}

/** The supplements list with one more, named `name`; unchanged for an empty name or a full list. */
export function withSupplement(list, name, id) {
  const clean = String(name || '').trim().slice(0, NAME_MAX)
  const cur = supplementsOf({ supplements: list })
  if (!clean || cur.length >= SUPPLEMENTS_MAX) return cur
  return [...cur, { id, name: clean }]
}

export const withoutSupplement = (list, id) => supplementsOf({ supplements: list }).filter(x => x.id !== id)

/** Whether every supplement is ticked on `iso` (true with none to take). */
export function allTaken(S, iso) {
  const taken = new Set(intakeOn(S, iso).sup)
  return supplementsOf(S).every(x => taken.has(x.id))
}

/** A share from 0 to 1 of a goal. */
export const shareOf = (v, goal) => (goal > 0 ? Math.min(1, v / goal) : 0)

/**
 * The supplement reminders to schedule (Capacitor LocalNotifications' shape): one a day at
 * S.supReminder for the next REMINDER_DAYS days, none for a day already ticked off, none in the
 * past. `words` gives the translated { title, body(names) }.
 */
export function supplementNotifications(S, now = new Date(), words = { title: 'Supplements', body: n => n }) {
  const at = HHMM.exec(String(S?.supReminder || ''))
  const list = supplementsOf(S)
  if (!at || !list.length) return []
  const out = []
  for (let offset = 0; offset < REMINDER_DAYS; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, Number(at[1]), Number(at[2]), 0, 0)
    if (day <= now) continue
    if (allTaken(S, isoOf(day))) continue
    out.push({ id: REMINDER_ID_BASE + offset, title: words.title, body: words.body(list.map(x => x.name).join(', ')), schedule: { at: day, allowWhileIdle: true } })
  }
  return out
}

/** Every id the supplement reminder may use, to cancel them all before scheduling again. */
export const reminderIds = () => Array.from({ length: REMINDER_DAYS }, (_, i) => ({ id: REMINDER_ID_BASE + i }))
