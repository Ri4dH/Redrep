// Vector maths, inverse kinematics and timing for Redrep's code-drawn exercise figures.
// Pure: no DOM, no imports. Units: body height about 1, y up, the floor at y = 0.
// Angles are degrees from straight up, positive toward +x (the way a side-view figure faces).

export const rad = d => (d * Math.PI) / 180
/** Unit vector `deg` degrees from straight up, turning toward +x. */
export const dir = deg => [Math.sin(rad(deg)), Math.cos(rad(deg))]
export const add = (p, d, k = 1) => [p[0] + d[0] * k, p[1] + d[1] * k]
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
export const len = v => Math.hypot(v[0], v[1])
export const norm = v => { const l = len(v) || 1; return [v[0] / l, v[1] / l] }
export const lerp = (a, b, t) => a + (b - a) * t
export const mixP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
/** `v` turned a quarter clockwise / counter-clockwise. */
export const cw = v => [v[1], -v[0]]
export const ccw = v => [-v[1], v[0]]
/** The angle of `v` in this file's convention (degrees from up, toward +x). */
export const angleOf = v => (Math.atan2(v[0], v[1]) * 180) / Math.PI

/**
 * The middle joint of a two-bone limb from `a` to `c` with bones `l1`, `l2`, on the side `side`
 * points to. A target out of reach straightens the limb toward it, one too close folds it.
 */
export function ik(a, c, l1, l2, side) {
  const v = sub(c, a)
  const d = Math.min(Math.max(len(v), Math.abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4)
  const u = norm(v)
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along))
  const n = ccw(u)
  const s = n[0] * side[0] + n[1] * side[1] >= 0 ? 1 : -1
  return [a[0] + u[0] * along + n[0] * h * s, a[1] + u[1] * along + n[1] * h * s]
}

/** Where a limb from `a` toward `c` ends when it can reach at most `max` (the hand on a bar). */
export const reach = (a, c, max) => { const v = sub(c, a), l = len(v); return l <= max ? c : add(a, norm(v), max) }

export const ease = t => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)))
export const clamp01 = t => Math.min(1, Math.max(0, t))

/**
 * A rep as timed segments: `[[seconds, from, to, cue], ...]`, each eased from `from` to `to`
 * (0 is the start position, 1 the far end of the movement). Returns { seconds, at(t) } where
 * at(t) for t in 0..1 gives { p, cue }.
 */
export function cycle(segs) {
  const seconds = segs.reduce((n, s) => n + s[0], 0)
  return {
    seconds,
    at(t) {
      let x = (((t % 1) + 1) % 1) * seconds
      for (const [d, from, to, cue] of segs) {
        if (x <= d) return { p: lerp(from, to, ease(x / d)), cue }
        x -= d
      }
      const last = segs[segs.length - 1]
      return { p: last[2], cue: last[3] }
    },
  }
}

/** The usual rep: brace, move out in `out` s, a beat, back in `back` s. */
export const rep = (out = 1.2, back = 1.0, cueOut = 'Lower', cueBack = 'Drive up', hold = 0.25) =>
  cycle([[0.35, 0, 0, 'Brace'], [out, 0, 1, cueOut], [hold, 1, 1, cueOut], [back, 1, 0, cueBack], [0.2, 0, 0, 'Brace']])

/** A held position that breathes: p drifts 0 to 1 and back over `seconds`. */
export const breathe = (seconds = 4, cue = 'Hold') =>
  cycle([[seconds / 2, 0, 1, cue], [seconds / 2, 1, 0, cue]])

/** A steady back-and-forth with no pause (running, jacks, rolling): p goes 0, 1, 0. */
export const swing = (seconds = 1, cueA = 'Breathe', cueB = cueA) =>
  cycle([[seconds / 2, 0, 1, cueA], [seconds / 2, 1, 0, cueB]])
