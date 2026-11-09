// Cardio, plyometric and full-body motions: running and walking, jumping jacks, jump rope,
// burpees, box jumps, bike, rower, battle ropes, punches and kicks, kettlebell swings, the
// Olympic lifts, carries and sleds. Several are key poses blended in turn (blend in body.js).

import { add, dir, rep, lerp, swing, clamp01, ease } from './geom.js'
import { B, side, front, hang, blend } from './body.js'
import { sideLoad, kind } from './kit.js'
import { squatPose, hingePose, lift } from './motions-legs.js'
import { pushUp, press } from './motions-push.js'

const loop = (seconds, cue) => ({ seconds, at: t => ({ p: ((t % 1) + 1) % 1, cue }) })

/** Key poses `keys` (functions of nothing) blended through a loop: p 0..1 runs through them all. */
function keyed(keys, p) {
  const n = keys.length, x = p * n, i = Math.floor(x) % n
  return blend(keys[i](), keys[(i + 1) % n](), ease(x - Math.floor(x)))
}

/** A gait: `amp` how far the thighs swing, `knee` how much the back foot kicks up, `lean`. */
function gait(p, { amp = 32, knee = 70, lean = 8, arms = 1, bounce = 0.02, carry = null, eq } = {}) {
  const ph = p * 2 * Math.PI
  const leg = s => {
    const th = 180 - amp * Math.sin(ph + s)
    const kneeP = add([0, 0], dir(th), B.thigh)
    const bend = knee * Math.max(0, Math.cos(ph + s + 0.6)) + 8
    return { th, k: kneeP, sh: th + bend }
  }
  const hip = [0, B.standHip - 0.01 - bounce + bounce * Math.abs(Math.cos(ph))]
  const L = s => { const l = leg(s); const k = add(hip, dir(l.th), B.thigh); return { knee: k, ankle: add(k, dir(l.sh), B.shin), footDir: l.sh - 90 } }
  const S = add(hip, dir(lean), B.torso)
  const A = s => {
    if (carry) return { hand: hang(S, 0.97) }
    const ua = 180 + 30 * arms * Math.sin(ph + s)
    const el = add(S, dir(ua), B.upperArm)
    return { elbow: el, hand: add(el, dir(ua - 85), B.forearm) }
  }
  const legs = { n: L(0), f: L(Math.PI) }
  const lowest = Math.min(legs.n.ankle[1], legs.f.ankle[1])
  const dy = B.ankleH - lowest
  const j = side({ hip, torso: lean, legs, arms: { n: A(Math.PI), f: A(0) }, props: carry ? sideLoad(eq, [hang(S, 0.97), hang(S, 0.97)]) : [] })
  return lift(j, dy)
}

export const run = { time: loop(0.75, 'Breathe'), pose: p => gait(p, { amp: 34, knee: 80, lean: 9, bounce: 0.03 }) }
export const highKnees = { time: loop(0.6, 'Breathe'), pose: p => gait(p, { amp: 55, knee: 60, lean: 2, bounce: 0.03 }) }
export const walk = { time: loop(1.2, 'Breathe'), pose: (p, o, eq) => gait(p, { amp: 20, knee: 25, lean: 3, arms: 0.6, bounce: 0.008, carry: kind(eq) !== 'none' && kind(eq) !== 'machine' ? true : null, eq }) }

export const jack = {
  time: swing(0.9, 'Jump'),
  pose(p, o = {}) {
    const hip = [0, B.standHip - 0.01 + 0.03 * Math.sin(Math.PI * p)]
    const spread = lerp(0.07, o.seal ? 0.07 : 0.2, p)
    const a = lerp(172, o.seal ? 92 : 18, p)
    const j0 = front({ hip })
    const hand = (s, L) => add(L.shoulder, [s * Math.sin(a * Math.PI / 180) * B.arm * 0.96, Math.cos(a * Math.PI / 180) * B.arm * 0.96])
    return front({ hip, legs: { r: { ankle: [spread, B.ankleH + 0.02 * Math.sin(Math.PI * p)] }, l: { ankle: [-spread, B.ankleH + 0.02 * Math.sin(Math.PI * p)] } }, arms: { r: { hand: hand(1, j0.r) }, l: { hand: hand(-1, j0.l) } } })
  },
}

export const jumpRope = {
  time: loop(0.5, 'Jump'),
  pose(p) {
    const h = 0.035 * Math.abs(Math.sin(Math.PI * p))
    const hip = [0, B.standHip - 0.01]
    const S = add(hip, dir(2), B.torso)
    const hand = add(S, [0.08, -0.25])
    const a = p * 2 * Math.PI
    const top = [0.02 + 0.05 * Math.cos(a), 0.52 + 0.55 * Math.sin(a)]
    const j = side({ hip, torso: 2, legs: { n: { ankle: [0.01, B.ankleH], toe: [0.11, 0.012] } }, arms: { n: { hand } },
      props: [{ k: 'strap', from: hand, to: top, z: Math.sin(a) > 0 ? -1 : 1 }] })
    return lift(j, h)
  },
}

const standing = (eq) => () => squatPose(0, { load: 'arms' }, eq)
export const burpee = {
  time: loop(3.2, 'Breathe'),
  pose(p) {
    const keys = [
      () => squatPose(0.02, { load: 'hips' }),
      () => { const j = squatPose(1, { load: 'arms' }); return side({ hip: j.hip, shoulder: j.shoulder, legs: { n: { ankle: j.n.ankle, knee: j.n.knee } }, arms: { n: { hand: [0.24, 0.02] } } }) },
      () => pushUp.pose(0, {}),
      () => pushUp.pose(0.8, {}),
      () => pushUp.pose(0, {}),
      () => { const j = squatPose(1, { load: 'arms' }); return side({ hip: j.hip, shoulder: j.shoulder, legs: { n: { ankle: j.n.ankle, knee: j.n.knee } }, arms: { n: { hand: [0.24, 0.02] } } }) },
      () => lift(side({ hip: [0, B.standHip], torso: 0, legs: { n: { ankle: [0, B.ankleH], footDir: 120 } }, arms: { n: { hand: [0.02, B.standHip + B.torso + B.arm * 0.95] } } }), 0.1),
    ]
    // the key poses face different ways in x: re-centre each frame on the feet
    return keyed(keys, p)
  },
}

export const boxJump = {
  time: loop(2.6, 'Jump'),
  pose(p) {
    const box = { k: 'box', x0: 0.24, x1: 0.56, h: 0.3, z: -1 }
    const keys = [
      () => squatPose(0, { load: 'arms' }),
      () => squatPose(0.7, { load: 'sides' }),
      () => lift(squatPose(0.1, { load: 'arms' }), 0.38, 0.17),
      () => lift(squatPose(0.45, { load: 'arms' }), 0.3, 0.38),
      () => lift(squatPose(0, { load: 'arms' }), 0.3, 0.38),
      () => lift(squatPose(0, { load: 'hips' }), 0.15, 0.2),
    ]
    const j = keyed(keys, p)
    return { ...j, props: [box] }
  },
}

export const bike = {
  time: loop(0.9, 'Breathe'),
  pose(p) {
    const crank = [0.05, 0.24], r = 0.1
    const a = p * 2 * Math.PI
    const pedal = s => add(crank, [Math.cos(a + s) * r, Math.sin(a + s) * r + 0.03])
    const hip = [-0.12, 0.68], lean = 42
    const S = add(hip, dir(lean), B.torso)
    const bar = [0.3, 0.86]
    return side({ hip, torso: lean, head: 60, legs: { n: { ankle: pedal(0) }, f: { ankle: pedal(Math.PI) } }, arms: { n: { hand: bar } },
      props: [{ k: 'pad', a: [hip[0] - 0.06, hip[1] - 0.07], b: [hip[0] + 0.06, hip[1] - 0.07], w: 0.022, z: -1 }, { k: 'post', a: [hip[0], hip[1] - 0.08], b: crank, z: -1 },
        { k: 'post', a: crank, b: [bar[0] - 0.04, bar[1] - 0.04], z: -1 }, { k: 'post', a: [-0.2, 0], b: [0.4, 0], z: -1 }, { k: 'wheel', at: [0.27, 0.27], z: -1 },
        { k: 'post', a: [crank[0], 0.02], b: crank, z: -1 }, { k: 'sleeve', at: crank, z: 1 }] })
  },
}

export const rower = {
  time: { seconds: 2.4, at: t => (t < 0.4 ? { p: ease(t / 0.4), cue: 'Drive up' } : { p: 1 - ease((t - 0.4) / 0.6), cue: 'Return' }) },
  pose(p) {
    const feet = [0.32, 0.15]
    const hipX = lerp(-0.02, -0.34, clamp01(p * 1.4))
    const hip = [hipX, 0.2]
    const lean = lerp(28, -24, clamp01((p - 0.25) / 0.6))
    const S = add(hip, dir(lean), B.torso)
    const reachP = add(S, dir(lean + 98), B.arm * 0.95)
    const ribs = add(add(hip, dir(lean), 0.15), dir(lean + 90), 0.11)
    const arm = clamp01((p - 0.6) / 0.4)
    const hand = [lerp(reachP[0], ribs[0], arm), lerp(reachP[1], ribs[1], arm)]
    return side({ hip, torso: lean, legs: { n: { ankle: feet, footDir: 40 } }, arms: { n: { hand, elbowSide: [-1, 0] } },
      props: [{ k: 'post', a: [-0.55, 0.12], b: [0.45, 0.12], z: -1 }, { k: 'pad', a: [hipX - 0.06, 0.135], b: [hipX + 0.06, 0.135], w: 0.02, z: -1 },
        { k: 'pad', a: [0.36, 0.1], b: [0.42, 0.26], w: 0.02, z: -1 }, { k: 'wheel', at: [0.55, 0.3], z: -1 }, { k: 'cable', from: [0.5, 0.3], to: hand, z: -1 }] })
  },
}

export const battleRope = {
  time: loop(0.7, 'Breathe'),
  pose(p) {
    const j0 = squatPose(0.35, { load: 'arms' })
    const a = p * 2 * Math.PI
    const hand = s => add(j0.shoulder, [0.24, -0.12 + 0.12 * Math.sin(a + s)])
    const n = hand(0), f = hand(Math.PI)
    return side({ hip: j0.hip, shoulder: j0.shoulder, legs: { n: { ankle: j0.n.ankle, knee: j0.n.knee } }, arms: { n: { hand: n }, f: { hand: f } },
      props: [{ k: 'band', from: n, to: [0.9, 0.05], z: 1 }, { k: 'band', from: f, to: [0.9, 0.06], z: -1 }] })
  },
}

/** Boxing: a guard, then a straight punch with one hand and the other in turn. */
export const punch = {
  time: loop(1.2, 'Breathe'),
  pose(p, o = {}) {
    const hip = [0, B.standHip - 0.03], lean = 6, S = add(hip, dir(lean), B.torso)
    const guard = add(S, [0.12, 0.06])
    const out = add(S, [B.arm * 0.95, 0.03])
    const t1 = Math.max(0, Math.sin(p * 2 * Math.PI)), t2 = Math.max(0, -Math.sin(p * 2 * Math.PI))
    const hn = [lerp(guard[0], out[0], t1), lerp(guard[1], out[1], t1)], hf = [lerp(guard[0], out[0], t2), lerp(guard[1], out[1], t2)]
    if (o.kick) {
      const kick = Math.max(0, Math.sin(p * Math.PI * 2))
      const knee = add(hip, dir(lerp(178, 95, kick)), B.thigh)
      return side({ hip, torso: lean - 10 * kick, legs: { f: { ankle: [-0.06, B.ankleH] }, n: { knee, ankle: add(knee, dir(lerp(180, 92, kick * kick)), B.shin), footDir: 90 } }, arms: { n: { hand: guard }, f: { hand: guard } } })
    }
    return side({ hip, torso: lean, legs: { n: { ankle: [0.14, B.ankleH] }, f: { ankle: [-0.16, B.ankleH] } }, arms: { n: { hand: hn, elbowSide: [0, -1] }, f: { hand: hf, elbowSide: [0, -1] } } })
  },
}

/** Kettlebell swing: hinge with the bell between the legs, then the hips snap it to chest height. */
export const kbSwing = {
  time: { seconds: 1.6, at: t => (t < 0.45 ? { p: ease(t / 0.45), cue: 'Lower' } : { p: 1 - ease((t - 0.45) / 0.55), cue: 'Drive up' }) },
  pose(p, o, eq) {
    const top = () => { const hip = [0, B.standHip], S = add(hip, dir(-3), B.torso); const hand = add(S, dir(88), B.arm * 0.96); return side({ hip, torso: -3, legs: { n: { ankle: [0, B.ankleH] } }, arms: { n: { hand } }, props: sideLoad(eq, [hand, hand]) }) }
    const bottom = () => { const j = hingePose(0.75, { kind: 'romanian' }, 'body weight'); const hand = add(j.hip, [-0.04, -0.12]); return side({ hip: j.hip, shoulder: j.shoulder, legs: { n: { ankle: j.n.ankle, knee: j.n.knee } }, arms: { n: { hand } }, props: sideLoad(eq, [hand, hand]) }) }
    return blend(top(), bottom(), p)
  },
}

/** Clean, snatch, jerk and their pulls: key poses from the floor to the catch. */
export const olympic = {
  time: { seconds: 3.4, at: t => (t < 0.55 ? { p: t / 0.55, cue: t < 0.2 ? 'Lift' : 'Drive up' } : t < 0.72 ? { p: 1, cue: 'Hold' } : { p: 1 - ease((t - 0.72) / 0.28), cue: 'Lower' }) },
  pose(p, o = {}, eq) {
    const e = eq === 'kettlebell' || eq === 'dumbbell' ? eq : 'barbell'
    const rack = () => squatPose(0.05, { load: 'front' }, e)
    const keys = {
      clean: [() => hingePose(1, {}, e), () => hingePose(0.45, {}, e), () => lift(hingePose(0, {}, e), 0.04), () => squatPose(0.55, { load: 'front' }, e), rack],
      snatch: [() => hingePose(1, {}, e), () => hingePose(0.45, {}, e), () => lift(hingePose(0, {}, e), 0.04), () => squatPose(0.6, { load: 'overhead' }, e), () => squatPose(0, { load: 'overhead' }, e)],
      jerk: [rack, () => squatPose(0.25, { load: 'front' }, e), () => press.pose(0.6, {}, e), () => press.pose(1, {}, e)],
      thruster: [rack, () => squatPose(0.95, { load: 'front' }, e), () => squatPose(0.3, { load: 'front' }, e), () => press.pose(1, {}, e)],
      pull: [() => hingePose(1, {}, e), () => hingePose(0.4, {}, e), () => { const j = lift(hingePose(0, {}, e), 0.04); return j }],
    }[o.kind || 'clean']
    const n = keys.length - 1, x = Math.min(p * n, n - 1e-6), i = Math.floor(x)
    return blend(keys[i](), keys[i + 1](), ease(x - i))
  },
}

/** Sled push and drag: leaning into the sled, driving the legs. */
export const sled = {
  time: loop(1.0, 'Drive up'),
  pose(p, o = {}) {
    const j = gait(p, { amp: 26, knee: 50, lean: o.pull ? -12 : 50, bounce: 0.01 })
    const S = j.shoulder
    const hand = o.pull ? add(S, [-0.1, -0.25]) : add(S, dir(70), B.arm * 0.9)
    const sledX = o.pull ? -0.75 : hand[0] + 0.05
    return side({ hip: j.hip, shoulder: S, head: o.pull ? 0 : 60, legs: { n: { ankle: j.n.ankle, knee: j.n.knee }, f: { ankle: j.f.ankle, knee: j.f.knee } }, arms: { n: { hand } },
      props: [{ k: 'block', x0: sledX, y0: 0, x1: sledX + 0.3, y1: 0.12, c: 'plateRim', z: -1 }, o.pull ? { k: 'strap', from: hand, to: [sledX + 0.3, 0.1], z: 1 } : { k: 'post', a: [sledX + 0.02, 0.1], b: hand, z: -1 }] })
  },
}

export { standing }
