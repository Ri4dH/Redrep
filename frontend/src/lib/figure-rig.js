// Redrep's own exercise figures: a side-view 2D rig, posed by code, drawn by
// components/ExerciseFigure.jsx. Original artwork; nothing here is derived from the licensed
// exercise media (NOTICE.md).
//
// Units: body height 1, y up, the near ankle at the origin, the figure faces +x.
// A motion maps a cycle time (0..1) to a pose: { joints, phase } where phase is the coaching
// cue shown under the figure ('Brace' | 'Lower' | 'Drive up').
// Pure: no DOM, no imports, so the maths is unit tested on its own.

export const BODY = {
  ankleH: 0.045, shin: 0.22, thigh: 0.245, torso: 0.29,
  upperArm: 0.165, forearm: 0.15, armForeshorten: 0.85,
  headR: 0.062, neck: 0.04, plateR: 0.125,
}
const BAR_BACK = 0.035   // the bar sits on the traps: behind the shoulder joint...
const BAR_UP = 0.01      // ...and a little above it
export const MIDFOOT_X = 0.02

const rad = d => (d * Math.PI) / 180
const dir = deg => [Math.sin(rad(deg)), Math.cos(rad(deg))]   // degrees from vertical
const add = (p, d, k = 1) => [p[0] + d[0] * k, p[1] + d[1] * k]

/** Elbow position for a two-bone arm from `s` to `h`, the bend pointing down. */
export function elbowIK(s, h, a, b) {
  const dx = h[0] - s[0], dy = h[1] - s[1]
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(a - b) + 1e-4), a + b - 1e-4)
  const base = Math.atan2(dy, dx)
  const off = Math.acos((a * a + d * d - b * b) / (2 * a * d))
  const e1 = [s[0] + a * Math.cos(base + off), s[1] + a * Math.sin(base + off)]
  const e2 = [s[0] + a * Math.cos(base - off), s[1] + a * Math.sin(base - off)]
  return e1[1] < e2[1] ? e1 : e2
}

/**
 * Back squat at `depth` 0 (standing) to 1 (just below parallel). Shin and thigh angles follow
 * the depth; the torso lean is solved so the bar stays over mid-foot, the way a squat balances.
 */
export function squatPose(depth) {
  const B = BODY
  const shin = 3 + 31 * depth
  const thigh = 102 * depth
  const ankle = [0, 0]
  const knee = add(ankle, dir(shin), B.shin)
  const t = dir(thigh)
  const hip = [knee[0] - t[0] * B.thigh, knee[1] + t[1] * B.thigh]
  const barFor = lean => {
    const u = dir(lean)
    const n = [-u[1], u[0]]                       // toward the back
    const shoulder = add(hip, u, B.torso)
    return { u, n, shoulder, bar: add(add(shoulder, n, BAR_BACK), u, BAR_UP) }
  }
  let lo = -10, hi = 85                           // bar x grows with lean here: bisect
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (barFor(mid).bar[0] < MIDFOOT_X) lo = mid; else hi = mid
  }
  const lean = (lo + hi) / 2
  const { u, n, shoulder, bar } = barFor(lean)
  const head = add(shoulder, dir(lean * 0.55), B.neck + B.headR)
  const a = B.upperArm * B.armForeshorten, b = B.forearm * B.armForeshorten
  const elbow = elbowIK(shoulder, bar, a, b)
  return { ankle, knee, hip, shoulder, head, elbow, hand: bar, bar, u, n, lean, shin, thigh }
}

const ease = t => 0.5 - 0.5 * Math.cos(Math.PI * t)

/** Hold, 1.4 s down, a pause, 0.9 s up, hold: 3.2 s in all. Returns { depth, phase }. */
export function squatCycle(t) {
  const segs = [[0.4, () => 0, 'Brace'], [1.4, x => ease(x), 'Lower'], [0.2, () => 1, 'Lower'],
    [0.9, x => 1 - ease(x), 'Drive up'], [0.3, () => 0, 'Brace']]
  const total = segs.reduce((n, s) => n + s[0], 0)
  let at = (((t % 1) + 1) % 1) * total
  for (const [len, f, phase] of segs) {
    if (at <= len) return { depth: f(at / len), phase }
    at -= len
  }
  return { depth: 0, phase: 'Brace' }
}

/*
 * Motions by exercise id (catalogue/exercises/<id>.json). `muscles` are the parts drawn in the
 * accent, `seconds` is one rep. An exercise without a motion shows no figure.
 */
export const MOTIONS = {
  squat: { seconds: 3.2, muscles: ['quads', 'glutes'], cycle: squatCycle, pose: d => squatPose(d), load: 'backBar' },
}
export const MOTION_OF = { '3593': 'squat', '0043': 'squat' }

/** The motion for an exercise id, or null. */
export const motionFor = id => MOTIONS[MOTION_OF[String(id)]] || null

/** Pose and cue of motion `m` at cycle time `t` (0..1). */
export function frameOf(m, t) {
  const { depth, phase } = m.cycle(t)
  return { joints: m.pose(depth), phase, depth }
}
