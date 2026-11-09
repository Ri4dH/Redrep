// The body of Redrep's exercise figures: proportions, and a full set of joints from the few
// points a motion cares about (hip, torso angle, where the feet and hands go). Knees and elbows
// come from two-bone IK; a target out of reach straightens the limb toward it.
//
// Two views. 'side': the figure faces +x, `n` is the near limb, `f` the far one. 'front': the
// figure faces the viewer, `r` is the limb at +x and `l` the one at -x.

import { add, sub, dir, norm, cw, ccw, ik, reach, angleOf, len } from './geom.js'

export const B = {
  ankleH: 0.045, shin: 0.22, thigh: 0.245, torso: 0.29, neck: 0.04, headR: 0.062,
  upperArm: 0.165, forearm: 0.15, foot: 0.105, heel: 0.03,
  shoulderW: 0.1, hipW: 0.055,          // half widths, front view
}
B.leg = B.thigh + B.shin
B.arm = B.upperArm + B.forearm
/** Hip height of a figure standing tall. */
B.standHip = B.ankleH + B.leg - 0.004

const FLOOR = 0.012

function foot(ankle, knee, o = {}) {
  if (o.toe) {
    const d = norm(sub(o.toe, ankle))
    return { toe: o.toe, heel: add(ankle, d, -B.heel) }
  }
  const shinUp = norm(sub(knee, ankle))
  let d = o.footDir ? dir(o.footDir) : cw(shinUp)
  // a foot on the floor lies flat, pointing the way the shin leans to
  if (!o.footDir && ankle[1] < B.ankleH + 0.02) d = [d[0] >= 0 ? 1 : -1, 0]
  const toe = add(ankle, d, B.foot)
  if (!o.footDir && ankle[1] < B.ankleH + 0.02) toe[1] = FLOOR
  return { toe, heel: add(ankle, d, -B.heel) }
}

function leg(hip, o) {
  const ankle = reach(hip, o.ankle, B.leg - 1e-3)
  const side = o.kneeSide || ccw(sub(ankle, hip))
  const knee = o.knee || ik(hip, ankle, B.thigh, B.shin, side)
  return { hip, knee, ankle, ...foot(ankle, knee, o) }
}

function arm(shoulder, o, k = 1) {
  const a = B.upperArm * k, b = B.forearm * k
  const hand = reach(shoulder, o.hand, a + b - 1e-3)
  const side = o.elbowSide || cw(sub(hand, shoulder))
  const elbow = o.elbow || ik(shoulder, hand, a, b, side)
  return { shoulder, elbow, hand }
}

/**
 * A side-view pose. `spec`: { hip, torso (deg) | shoulder, head (deg, default the torso's),
 * legs: { n: { ankle, toe?, knee?, kneeSide?, footDir? }, f }, arms: { n: { hand, ... }, f },
 * armK (foreshortening, 1), props }. A missing far limb copies the near one.
 */
export function side(spec) {
  const hip = spec.hip
  const ta = spec.shoulder ? angleOf(sub(spec.shoulder, hip)) : (spec.torso ?? 0)
  const u = dir(ta)
  const shoulder = add(hip, u, B.torso + (spec.shrug || 0))
  const headA = spec.head ?? ta
  const head = add(shoulder, dir(headA), B.neck + B.headR)
  const L = spec.legs || {}, A = spec.arms || {}
  const n = { ...leg(hip, L.n), ...arm(shoulder, A.n, spec.armK) }
  const f = L.f || A.f ? { ...leg(hip, L.f || L.n), ...arm(shoulder, A.f || A.n, spec.armK) } : n
  return { view: 'side', hip, shoulder, head, u, front: cw(u), n, f, props: spec.props || [], tilt: ta }
}

/**
 * A front-view pose. `spec`: { hip (pelvis centre), tilt (deg, the torso leaning sideways),
 * legs: { r: { ankle }, l: { ankle } }, arms: { r: { hand }, l: { hand } }, head (deg), props }.
 * Knees and elbows bend outward unless a limb says otherwise.
 */
export function front(spec) {
  const hipC = spec.hip
  const ta = spec.tilt || 0
  const u = dir(ta), across = cw(u)          // across points to +x when upright
  const neckBase = add(hipC, u, B.torso)
  const head = add(neckBase, dir(spec.head ?? ta), B.neck + B.headR)
  const L = spec.legs || {}, A = spec.arms || {}
  const limb = (sgn, l = {}, a = {}) => {
    const out = [across[0] * sgn, across[1] * sgn]
    const hip = add(hipC, out, B.hipW), shoulder = add(neckBase, out, B.shoulderW)
    const ankle = reach(hip, l.ankle || add(hip, [0, -1], B.leg), B.leg - 1e-3)
    const knee = l.knee || ik(hip, ankle, B.thigh, B.shin, l.kneeSide || out)
    const hand = reach(shoulder, a.hand || add(shoulder, [0, -1], B.arm), B.arm - 1e-3)
    const elbow = a.elbow || ik(shoulder, hand, B.upperArm, B.forearm, a.elbowSide || out)
    const toe = add(ankle, [out[0] * 0.025, -0.03])
    return { hip, knee, ankle, toe, heel: ankle, shoulder, elbow, hand }
  }
  return {
    view: 'front', hip: hipC, shoulder: neckBase, head, u, across,
    r: limb(1, L.r, A.r), l: limb(-1, L.l, A.l), props: spec.props || [], tilt: ta,
  }
}

/** Pose `a` moved `t` of the way to pose `b`, joint by joint (same view). Props come from `b`
 * past halfway, else from `a`. */
export function blend(a, b, t) {
  const m = (x, y) => (Array.isArray(x) && typeof x[0] === 'number' ? [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t] : x)
  const limbs = (x, y) => Object.fromEntries(Object.keys(x).map(k => [k, m(x[k], y[k])]))
  const out = { ...(t < 0.5 ? a : b) }
  for (const k of ['hip', 'shoulder', 'head']) out[k] = m(a[k], b[k])
  for (const k of a.view === 'front' ? ['r', 'l'] : ['n', 'f']) out[k] = limbs(a[k], b[k])
  const u = norm(sub(out.shoulder, out.hip))
  out.u = u
  if (a.view === 'front') out.across = cw(u); else out.front = cw(u)
  return out
}

/** A hand hanging straight down from `shoulder`, `k` of the arm's length (1 = locked). */
export const hang = (shoulder, k = 1) => [shoulder[0], shoulder[1] - B.arm * k]
/** The point `d` along the torso from the hip (0 hip, 1 shoulder) and `out` in front of it. */
export const onTorso = (pose, d, out = 0) => add(add(pose.hip, pose.u, B.torso * d), pose.front, out)
export const dist = (a, b) => len(sub(a, b))
