// Leg and hip motions: squats, lunges, step-ups, hinges, bridges, calf raises and the leg
// machines. Each motion is { time, pose(p, o, eq) }: `time` turns a 0..1 loop into the movement's
// position p (0 the start, 1 the far end), `pose` draws it. `o` holds the options the classifier
// read from the exercise's name (classify.js), `eq` is its equipment word.

import { add, dir, ik, rep, lerp, mixP, sub, norm, angleOf } from './geom.js'
import { B, side, front, hang } from './body.js'
import { sideLoad, bench, pad, kind } from './kit.js'

const ANK = [0, B.ankleH]
const MID = 0.03                          // mid-foot, where a load balances

/** Knee from the ankle with the shin `s` degrees forward of upright. */
const kneeAt = (ankle, s) => add(ankle, dir(s), B.shin)

/* ---------- squat ---------- */

// Where the load sits relative to the shoulder for each way of holding it: back bar, front rack,
// goblet, hands at the sides, arms reaching forward (bodyweight), overhead.
function squatHands(load, S, u, fr, lean) {
  switch (load) {
    case 'back': { const bar = add(add(S, fr, -0.035), u, 0.01); return { bar, hands: [add(bar, fr, 0.05), add(bar, fr, 0.05)] } }
    case 'front': { const h = add(add(S, fr, 0.075), u, 0.015); return { bar: h, hands: [h, h], elbowSide: add(fr, u, 0.6) } }
    case 'goblet': { const h = add(add(S, u, -0.09), fr, 0.13); return { hands: [h, h] } }
    case 'sides': return { hands: [hang(S, 0.98), hang(S, 0.98)] }
    case 'overhead': { const h = [S[0] - 0.01, S[1] + B.arm * 0.97]; return { bar: h, hands: [h, h] } }
    case 'hips': { const h = add(add(S, u, -0.24), fr, 0.05); return { hands: [h, h] } }
    default: { const h = add(S, dir(90 - lean * 0.2), B.arm * 0.95); return { hands: [h, h] } }
  }
}
const balancePoint = (load, S, fr, u) => (load === 'back' ? add(S, fr, -0.035) : load === 'overhead' ? S
  : load === 'front' || load === 'goblet' ? add(S, fr, 0.06) : add(S, fr, load === 'arms' ? -0.06 : 0))

/** A squat at depth d (0 standing, 1 just below parallel), torso lean solved for balance. */
export function squatPose(d, o = {}, eq = 'body weight') {
  const load = o.load || 'arms'
  const s = 3 + (load === 'front' || load === 'goblet' ? 34 : 31) * d
  const knee = kneeAt(ANK, s)
  const t = 102 * d * (o.depth ?? 1)
  const hip = [knee[0] - Math.sin(t * Math.PI / 180) * B.thigh, knee[1] + Math.cos(t * Math.PI / 180) * B.thigh]
  const at = lean => { const u = dir(lean), fr = [u[1], -u[0]], S = add(hip, u, B.torso); return { u, fr, S, x: balancePoint(load, S, fr, u)[0] } }
  let lo = -10, hi = 85
  for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; if (at(mid).x < MID) lo = mid; else hi = mid }
  const lean = (lo + hi) / 2
  const { u, fr, S } = at(lean)
  const H = squatHands(load, S, u, fr, lean)
  const props = sideLoad(load === 'back' && kind(eq) === 'none' ? 'barbell' : eq, H.hands, { bar: H.bar })
  if (o.machine) props.push(pad(add(add(hip, u, 0.05), fr, -0.09), add(add(S, u, 0.04), fr, -0.09)))
  return side({ hip, torso: lean, head: lean * 0.5, legs: { n: { ankle: ANK, knee } }, arms: { n: { hand: H.hands[0], elbowSide: H.elbowSide } }, armK: load === 'back' ? 0.85 : 1, props })
}
export const squat = { time: rep(1.4, 0.9), pose: (p, o, eq) => squatPose(p, o, eq) }

/** Jump squat: down, then up and off the floor. */
export const jumpSquat = {
  time: { seconds: 2.2, at: t => (t < 0.15 ? { p: 0, cue: 'Brace' } : t < 0.5 ? { p: (t - 0.15) / 0.35, cue: 'Lower' } : t < 0.95 ? { p: 1 + (t - 0.5) / 0.45, cue: 'Jump' } : { p: 0, cue: 'Brace' }) },
  pose(q, o, eq) {
    const d = q <= 1 ? 0.5 - 0.5 * Math.cos(Math.PI * q) : Math.max(0, 1 - (q - 1) * 3)
    const air = q > 1.25 ? Math.sin(Math.PI * Math.min(1, (q - 1.25) / 0.75)) * 0.14 : 0
    const j = squatPose(d * 0.8, { ...o, load: o.load || 'arms' }, eq)
    return air ? lift(j, air) : j
  },
}

/** Every point of pose `j` moved up by dy (a jump, a raise on the toes). */
export function lift(j, dy, dx = 0) {
  const mv = p => (Array.isArray(p) && typeof p[0] === 'number' ? [p[0] + dx, p[1] + dy] : p)
  const limb = L => Object.fromEntries(Object.entries(L).map(([k, v]) => [k, mv(v)]))
  const n = limb(j.n), f = j.f === j.n ? n : limb(j.f)
  const props = j.props.map(pr => Object.fromEntries(Object.entries(pr).map(([k, v]) => [k, mv(v)])))
  return { ...j, hip: mv(j.hip), shoulder: mv(j.shoulder), head: mv(j.head), n, f, props }
}

/* ---------- lunges, split squats, step-ups ---------- */

export function lungePose(p, o = {}, eq = 'body weight') {
  const bulg = o.kind === 'bulgarian'
  const frontA = [bulg ? 0.21 : 0.17, B.ankleH]
  const rearToe = bulg ? [-0.37, 0.39] : [-0.17, 0.012]
  const rearAnk = bulg ? [-0.27, 0.41] : [-0.235, 0.075]
  const hip = [lerp(-0.01, -0.035, p), lerp(bulg ? 0.47 : 0.465, bulg ? 0.3 : 0.275, p)]
  const lean = bulg ? 8 + 6 * p : 4
  const u = dir(lean), S = add(hip, u, B.torso)
  const load = o.load || (kind(eq) === 'bar' ? 'back' : kind(eq) === 'none' ? 'hips' : 'sides')
  const fr = [u[1], -u[0]]
  const H = squatHands(load, S, u, fr, lean)
  const props = [...sideLoad(eq, H.hands, { bar: H.bar })]
  if (bulg) props.push(...bench(-0.62, -0.2, 0.36))
  return side({
    hip, torso: lean, legs: { n: { ankle: frontA }, f: { ankle: rearAnk, toe: rearToe } },
    arms: { n: { hand: H.hands[0] } }, armK: load === 'back' ? 0.85 : 1, props,
  })
}
export const lunge = { time: rep(1.2, 0.9), pose: lungePose }

export const stepUp = {
  time: rep(1.0, 1.0, 'Drive up', 'Lower'),
  pose(p, o, eq) {
    const box = { k: 'box', x0: 0.07, x1: 0.42, h: 0.22, z: -1 }
    const top = [0.2, 0.22 + B.ankleH]
    const hip = [lerp(-0.02, 0.17, p), lerp(0.44, 0.22 + B.standHip, p)]
    const rear = [lerp(-0.14, 0.03, p), lerp(B.ankleH, 0.33, p)]
    const lean = lerp(14, 2, p)
    const S = add(hip, dir(lean), B.torso)
    const hands = kind(eq) === 'none' ? [add(S, dir(150), B.arm), add(S, dir(200), B.arm)] : [hang(S, 0.98), hang(S, 0.98)]
    return side({ hip, torso: lean, legs: { n: { ankle: top }, f: { ankle: rear, footDir: p > 0.5 ? 160 : undefined } }, arms: { n: { hand: hands[0] }, f: { hand: hands[1] } }, props: [box, ...sideLoad(eq, hands)] })
  },
}

/* ---------- hinges ---------- */

const HINGE = {
  conventional: { bottom: 0.125, shin: 15 }, sumo: { bottom: 0.125, shin: 6 }, trap: { bottom: 0.135, shin: 13 },
  romanian: { bottom: 0.27, shin: 6 }, stiff: { bottom: 0.17, shin: 2 }, rack: { bottom: 0.36, shin: 8 },
}
/** Deadlift family at p (0 standing tall, 1 the bottom): the bar straight under the shoulders, over mid-foot. */
export function hingePose(p, o = {}, eq = 'barbell') {
  const h = HINGE[o.kind] || HINGE.conventional
  const top = B.standHip + B.torso - B.arm * 0.995
  const handY = lerp(top, h.bottom, p)
  const knee = kneeAt(ANK, 3 + (h.shin - 3) * p)
  const S = [MID + 0.015, handY + B.arm * 0.995]
  const hip = ik(knee, S, B.thigh, B.torso, [-1, 0])
  const hand = [MID, handY]
  const legs = { n: { ankle: ANK, knee } }
  if (o.single) {
    const ta = angleOf(sub(S, hip))
    legs.f = { ankle: add(hip, dir(ta + 180), B.leg * 0.99), footDir: ta + 90 }
  }
  const k = kind(eq)
  return side({ hip, shoulder: S, legs, arms: { n: { hand } }, props: sideLoad(k === 'none' ? 'body weight' : eq, [hand, hand]) })
}
export const hinge = { time: rep(1.3, 1.0, 'Lower', 'Lift'), pose: hingePose }

export const goodMorning = {
  time: rep(1.3, 1.0, 'Lower', 'Lift'),
  pose(p, o, eq) {
    const knee = kneeAt(ANK, 3 + 6 * p)
    const tA = 18 * p
    const hip = [knee[0] - Math.sin(tA * Math.PI / 180) * B.thigh, knee[1] + Math.cos(tA * Math.PI / 180) * B.thigh]
    const lean = 78 * p
    const u = dir(lean), fr = [u[1], -u[0]], S = add(hip, u, B.torso)
    const bar = add(add(S, fr, -0.035), u, 0.01)
    const hand = add(bar, fr, 0.05)
    return side({ hip, torso: lean, head: lean * 0.7, legs: { n: { ankle: ANK, knee } }, arms: { n: { hand } }, armK: 0.85, props: kind(eq) === 'none' ? [] : sideLoad(eq, [hand, hand], { bar }) })
  },
}

/* ---------- bridges and thrusts ---------- */

export const bridge = {
  time: rep(1.0, 1.2, 'Drive up', 'Lower'),
  pose(p, o = {}, eq) {
    const thrust = o.kind === 'thrust'
    const S = thrust ? [-0.25, 0.43] : [-0.27, 0.075]
    const a = thrust ? lerp(140, 90, p) : lerp(90, 56, p)
    const hip = add(S, dir(a), B.torso)
    const ankle = [thrust ? 0.3 : 0.17, B.ankleH]
    const legs = { n: { ankle } }
    if (o.single) legs.f = { ankle: add(hip, dir(lerp(70, 62, p)), B.leg * 0.98) }
    const hand = thrust ? add(S, [0.02, -0.06]) : [hip[0] - 0.02, 0.03]
    const props = thrust ? bench(-0.6, -0.2, 0.36) : []
    const k = kind(eq)
    if (k !== 'none') props.push(...sideLoad(k === 'bar' || k === 'machine' ? 'barbell' : eq, [add(hip, [0.02, 0.08]), add(hip, [0.02, 0.08])], { bar: add(hip, [0.02, 0.08]) }))
    return side({ hip, shoulder: S, head: thrust ? lerp(330, 300, p) : 270, legs, arms: { n: { hand: k === 'none' ? hand : add(hip, [0.03, 0.06]) } }, props })
  },
}

/* ---------- calves ---------- */

export const calfRaise = {
  time: rep(0.8, 1.0, 'Lift', 'Lower'),
  pose(p, o = {}, eq) {
    const rise = 0.065 * p
    if (o.seated) {
      const ankle = [0.04, B.ankleH + rise], knee = [0.04, B.ankleH + B.shin + rise]
      const hip = [knee[0] - B.thigh, knee[1] + 0.005]
      const props = [pad([hip[0] - 0.05, hip[1] - 0.07], [knee[0] - 0.02, hip[1] - 0.07]), { k: 'block', x0: knee[0] - 0.05, y0: knee[1] + 0.04, x1: knee[0] + 0.06, y1: knee[1] + 0.08, c: 'pad', z: 1 }]
      return side({ hip, torso: 2, legs: { n: { ankle, knee, toe: [0.145, 0.012] } }, arms: { n: { hand: [knee[0] - 0.02, knee[1] + 0.09] } }, props })
    }
    const toe = [0.105, 0.012]
    const ankle = [0, B.ankleH + rise]
    const hip = [0, B.standHip + rise]
    const S = add(hip, [0, 1], B.torso)
    const hand = kind(eq) === 'bar' ? add(S, [-0.03, 0.01]) : hang(S, 0.98)
    return side({ hip, torso: 0, legs: { n: { ankle, toe } }, arms: { n: { hand } }, armK: kind(eq) === 'bar' ? 0.85 : 1, props: sideLoad(eq, [hand, hand], kind(eq) === 'bar' ? { bar: add(S, [-0.035, 0.01]) } : {}) })
  },
}

/* ---------- machines ---------- */

export const legPress = {
  time: rep(1.3, 1.0, 'Lower', 'Press'),
  pose(p) {
    const hip = [-0.1, 0.3], v = norm([1, 0.9])
    const d = lerp(B.leg * 0.97, 0.25, p)
    const ankle = add(hip, v, d)
    const foot = dir(angleOf([-v[1], v[0]]))
    const plate = add(ankle, v, 0.035)
    const props = [
      pad(add(hip, [-0.02, -0.07]), add(hip, [0.08, -0.06])), pad(add(hip, [-0.07, 0.0]), add(hip, dir(-55), 0.36)),
      { k: 'post', a: add(hip, v, 0.15), b: add(hip, v, 0.75), z: -1 },
      { k: 'pad', a: add(plate, foot, -0.07), b: add(plate, foot, 0.13), w: 0.02, z: -1 },
    ]
    return side({ hip, torso: -55, head: -40, legs: { n: { ankle, footDir: angleOf(foot) } }, arms: { n: { hand: add(hip, [0.06, 0.02]) } }, props })
  },
}

export const legExtension = {
  time: rep(0.9, 1.1, 'Lift', 'Lower'),
  pose(p) {
    const hip = [-0.15, 0.47], knee = [hip[0] + B.thigh, hip[1]]
    const ankle = add(knee, dir(lerp(175, 88, p)), B.shin)
    const props = [pad([hip[0] - 0.05, hip[1] - 0.075], [knee[0] - 0.01, knee[1] - 0.075]), pad([hip[0] - 0.09, hip[1] - 0.02], [hip[0] - 0.09, hip[1] + 0.3]),
      { k: 'post', a: [hip[0], 0], b: [hip[0], hip[1] - 0.1], z: -1 }, { k: 'roller', at: add(ankle, dir(lerp(175, 88, p) - 90), 0.045), r: 0.03, z: 1 }]
    return side({ hip, torso: -6, legs: { n: { ankle, knee } }, arms: { n: { hand: [hip[0] + 0.04, hip[1] - 0.04] } }, props })
  },
}

export const legCurl = {
  time: rep(0.9, 1.1, 'Lift', 'Lower'),
  pose(p, o = {}) {
    if (o.seated) {
      const hip = [-0.15, 0.47], knee = [hip[0] + B.thigh, hip[1]]
      const ankle = add(knee, dir(lerp(92, 195, p)), B.shin)
      return side({ hip, torso: -8, legs: { n: { ankle, knee } }, arms: { n: { hand: [hip[0] + 0.05, hip[1] - 0.03] } },
        props: [pad([hip[0] - 0.05, hip[1] - 0.075], [knee[0], knee[1] - 0.075]), pad([hip[0] - 0.1, hip[1]], [hip[0] - 0.12, hip[1] + 0.3]), { k: 'roller', at: add(ankle, dir(lerp(92, 195, p) + 90), 0.045), r: 0.03, z: 1 }] })
    }
    const hip = [0, 0.35], knee = [-B.thigh, 0.35]
    const ankle = add(knee, dir(lerp(272, 345, p)), B.shin)
    return side({
      hip, torso: 90, head: 100, legs: { n: { ankle, knee } }, arms: { n: { hand: [0.42, 0.29] } },
      props: [...bench(-0.32, 0.46, 0.29), { k: 'roller', at: add(ankle, dir(lerp(272, 345, p) + 90), -0.045), r: 0.03, z: 1 }],
    })
  },
}

/** Standing or all-fours kickbacks and donkey kicks: the hip driving one leg back. */
export const kickback = {
  time: rep(0.8, 1.0, 'Squeeze', 'Return'),
  pose(p, o = {}, eq) {
    if (o.quadruped) {
      const hip = [-0.15, 0.33], S = add(hip, [1, 0], B.torso)
      const th = lerp(180, o.straight ? 280 : 262, p)
      const kn = add(hip, dir(th), B.thigh)
      const an = o.straight ? add(kn, dir(th), B.shin) : add(kn, dir(th + 90), B.shin)
      return side({ hip, torso: 90, head: 95, legs: { n: { ankle: an, knee: kn }, f: { ankle: [-0.37, 0.06], knee: [-0.15, 0.075] } },
        arms: { n: { hand: [S[0], 0.03] } }, props: sideLoad(eq, [[S[0], 0.03], [S[0], 0.03]], { anchor: [S[0] + 0.1, 0.03] }) })
    }
    const hip = [0, B.standHip], lean = 22
    const S = add(hip, dir(lean), B.torso)
    const an = add(hip, dir(lerp(182, 215, p)), B.leg * 0.98)
    return side({ hip, torso: lean, legs: { f: { ankle: ANK }, n: { ankle: an, footDir: lerp(95, 125, p) } }, arms: { n: { hand: add(S, dir(120), B.arm * 0.95) } },
      props: [...sideLoad(eq, [an, an], { anchor: [an[0] + 0.4, 0.06] }), { k: 'post', a: [0.42, 0], b: [0.42, 1.2], z: -1 }] })
  },
}

/**
 * Hip abduction and adduction, seen from the front: standing (one leg out to the side), seated
 * on the machine (the knees opening or closing), lying on the side (the top leg lifting) and the
 * clamshell (the top knee opening).
 */
export const abduction = {
  time: rep(0.9, 1.1, 'Lift', 'Lower'),
  pose(p, o = {}, eq) {
    const k = o.kind || 'standing'
    if (k === 'seated') {
      const hip = [0, 0.5], w = o.adduct ? lerp(0.24, 0.1, p) : lerp(0.1, 0.24, p)
      return front({ hip, legs: { r: { knee: [w, 0.44], ankle: [0.1, B.ankleH] }, l: { knee: [-w, 0.44], ankle: [-0.1, B.ankleH] } }, arms: { r: { hand: [0.17, 0.46] }, l: { hand: [-0.17, 0.46] } },
        props: [pad([-0.17, 0.42], [0.17, 0.42], 0.04), { k: 'pad', a: [w + 0.05, 0.38], b: [w + 0.05, 0.5], w: 0.02, z: 1 }, { k: 'pad', a: [-w - 0.05, 0.38], b: [-w - 0.05, 0.5], w: 0.02, z: 1 }] })
    }
    if (k === 'lying' || k === 'clam') {
      // lying on the right side, head toward +x: the body's "up" is +y, its right side the floor
      const hip = [0, 0.11]
      const top = k === 'clam'
        ? { knee: add([-0.0, 0.17], dir(lerp(250, 205, p)), B.thigh * 0.9), ankle: [-0.33, 0.12] }
        : { ankle: add([0, 0.17], dir(lerp(268, 238, p)), B.leg * 0.99) }
      const bottom = k === 'clam' ? { knee: [-0.17, 0.06], ankle: [-0.33, 0.06] } : { ankle: [-0.46, B.ankleH] }
      return front({ hip, tilt: 90, head: 90, legs: { r: bottom, l: top }, arms: { r: { elbow: [0.32, 0.03], hand: [0.4, 0.17] }, l: { hand: [0.12, 0.22] } }, props: kind(eq) === 'band' ? [{ k: 'band', from: [-0.2, 0.06], to: [-0.2, 0.17], z: 1 }] : [] })
    }
    const hip = [0, B.standHip]
    const out = o.adduct ? lerp(150, 178, p) : lerp(178, 146, p)
    const r = add([B.hipW, B.standHip], dir(out), B.leg * 0.99)
    const props = kind(eq) === 'cable' ? [{ k: 'cable', from: [o.adduct ? 0.6 : -0.45, 0.08], to: r, z: -1 }] : kind(eq) === 'band' ? [{ k: 'band', from: [-0.08, 0.1], to: add(r, [0, 0.05]), z: 1 }] : []
    return front({ hip, tilt: lerp(0, -4, p), legs: { r: { ankle: r }, l: { ankle: [-0.07, B.ankleH] } }, arms: { r: { hand: [0.2, 0.5] }, l: { hand: [-0.36, 0.85] } }, props: [...props, { k: 'post', a: [-0.42, 0], b: [-0.42, 1.1], z: -1 }] })
  },
}

export { ANK, MID, mixP }
