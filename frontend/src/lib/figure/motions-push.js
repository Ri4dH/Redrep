// Pushing motions: bench presses, push-ups, dips, overhead presses, raises and flys.

import { add, dir, rep, lerp, mixP, cw } from './geom.js'
import { B, side, front, hang } from './body.js'
import { sideLoad, frontLoad, bench, pad, kind } from './kit.js'

const BENCH_Y = 0.36
// Seated, seen from the front: the thighs come toward the viewer, so the knees sit just below the hips.
export const SEATED_LEGS = { r: { knee: [0.085, 0.44], ankle: [0.095, B.ankleH] }, l: { knee: [-0.085, 0.44], ankle: [-0.095, B.ankleH] } }

/** Lying on a bench, head toward -x: hip, torso angle and the bench under it. `incline` in degrees. */
function lying(incline = 0) {
  const ta = 270 + incline
  const hip = incline > 10 ? [0.08, 0.46] : incline < -5 ? [0.08, 0.5] : [0.08, BENCH_Y + 0.075]
  const u = dir(ta)
  const S = add(hip, u, B.torso)
  const back = cw(u).map(v => -v)
  const props = incline > 10
    ? [pad(add(hip, [0.05, -0.08]), add(hip, [0.2, -0.08])), pad(add(hip, back, 0.085), add(S, back, 0.085)), { k: 'post', a: [hip[0], 0], b: [hip[0], hip[1] - 0.09], z: -1 }]
    : incline < -5 ? [pad(add(hip, back, 0.085), add(S, back, 0.085)), { k: 'post', a: [hip[0], 0], b: [hip[0], hip[1] - 0.09], z: -1 }]
      : bench(-0.36, 0.3, BENCH_Y)
  const ankle = incline < -5 ? add(hip, dir(140), 0.4) : [hip[0] + 0.28, B.ankleH]
  return { ta, hip, S, u, props, ankle, fr: cw(u) }
}

export const benchPress = {
  time: rep(1.2, 0.9, 'Lower', 'Press'),
  pose(p, o = {}, eq) {
    if (o.seated) {           // a chest press machine
      const hip = [-0.12, 0.5], ta = -4, u = dir(ta), S = add(hip, u, B.torso), fr = cw(u)
      const hand = add(add(S, fr, lerp(0.27, 0.1, p)), u, -0.05)
      return side({ hip, torso: ta, legs: { n: { ankle: [0.17, B.ankleH] } }, arms: { n: { hand, elbowSide: [0, -1] } }, armK: 0.9,
        props: [pad([hip[0] - 0.04, hip[1] - 0.075], [hip[0] + 0.2, hip[1] - 0.075]), pad(add(hip, [-0.09, 0.02]), add(S, [-0.1, 0.06])), { k: 'post', a: [hip[0], 0], b: [hip[0], hip[1] - 0.1], z: -1 }, { k: 'db', at: hand, r: 0.025, z: 1 }] })
    }
    const L = lying(o.incline || 0)
    const top = add(L.S, L.fr, B.arm * 0.85 * 0.97)
    const chest = add(add(L.hip, L.u, B.torso * 0.78), L.fr, 0.12)
    const hand = mixP(top, chest, p)
    const floor = o.floor
    const props = floor ? [] : L.props
    const hip = floor ? [L.hip[0], 0.075] : L.hip
    const shift = floor ? L.hip[1] - 0.075 : 0
    const h2 = [hand[0], hand[1] - shift]
    return side({ hip, torso: L.ta, legs: { n: { ankle: floor ? [hip[0] + 0.2, B.ankleH] : L.ankle } }, arms: { n: { hand: h2 } }, armK: 0.85,
      props: [...props, ...sideLoad(kind(eq) === 'none' ? 'barbell' : eq, [h2, h2])] })
  },
}

export const fly = {
  time: rep(1.3, 1.0, 'Lower', 'Squeeze'),
  pose(p, o = {}, eq) {
    if (o.standing || o.machine) {      // cable crossover, pec deck: front view
      const seated = o.machine
      const hip = [0, seated ? 0.5 : B.standHip]
      const sh = hip[1] + B.torso
      const wide = a => [Math.sin(a * Math.PI / 180) * B.arm * 0.95, Math.cos(a * Math.PI / 180) * B.arm * 0.95]
      const a = lerp(98, 25, p)
      const r = add([B.shoulderW, sh], wide(a)), l = add([-B.shoulderW, sh], [-wide(a)[0], wide(a)[1]])
      const legs = seated ? SEATED_LEGS : {}
      const hi = o.low ? 0.15 : o.mid ? sh : 1.35
      return front({ hip, legs, arms: { r: { hand: r, elbowSide: [0.3, -1] }, l: { hand: l, elbowSide: [-0.3, -1] } },
        props: seated ? [pad([-0.16, 0.42], [0.16, 0.42], 0.04), { k: 'post', a: [0, 0], b: [0, 0.4], z: -1 }] : frontLoad(eq, [r, l], { anchorR: [0.6, hi], anchorL: [-0.6, hi] }) })
    }
    const L = lying(o.incline || 0)
    const top = add(L.S, L.fr, B.arm * 0.93)
    const out = add(add(L.S, L.fr, 0.04), L.u, -0.06)
    const hand = mixP(top, out, p)
    return side({ hip: L.hip, torso: L.ta, legs: { n: { ankle: L.ankle } }, arms: { n: { hand, elbowSide: L.u.map(v => -v) } }, armK: lerp(1, 0.55, p),
      props: [...L.props, ...sideLoad(eq, [hand, hand], { anchor: add(L.S, L.fr, -0.2) })] })
  },
}

/** Push-ups: the body a straight line pivoting on the toes (or knees), hands fixed. */
export const pushUp = {
  time: rep(1.0, 0.8, 'Lower', 'Press'),
  pose(p, o = {}, eq) {
    const handY = o.incline ? 0.4 : 0.02
    const footY = o.decline ? 0.4 : 0
    const knee = o.knees
    const hx = 0.32
    const len = knee ? B.thigh + B.torso : B.leg + B.torso
    const base = knee ? [0, 0.06] : [0, footY + 0.085]
    const sy = lerp(handY + B.arm * 0.96, handY + 0.12, p)
    const top = handY + B.arm * 0.96
    const ax = hx - Math.sqrt(Math.max(0, len * len - (top - base[1]) ** 2))
    const piv = [ax, base[1]]
    const dy = sy - piv[1], dx = Math.sqrt(Math.max(0, len * len - dy * dy))
    const S = [piv[0] + dx, sy]
    const u = [(S[0] - piv[0]) / len, (S[1] - piv[1]) / len]
    const hip = knee ? add(piv, u, B.thigh) : add(piv, u, B.leg)
    const legs = knee
      ? { n: { ankle: add(piv, dir(290), B.shin), knee: piv } }
      : { n: { ankle: piv, toe: [piv[0] + 0.04, footY + 0.012] } }
    const hand = [hx + (o.close ? -0.03 : 0), handY]
    const props = []
    if (o.incline) props.push({ k: 'block', x0: hx - 0.12, y0: 0, x1: hx + 0.14, y1: handY - 0.02, z: -1 })
    if (o.decline) props.push({ k: 'block', x0: piv[0] - 0.12, y0: 0, x1: piv[0] + 0.12, y1: footY, z: -1 })
    if (kind(eq) === 'band') props.push({ k: 'band', from: hand, to: add(S, [0, 0.03]), z: 1 })
    return side({ hip, shoulder: S, head: 85, legs, arms: { n: { hand } }, props })
  },
}

export const dip = {
  time: rep(1.1, 0.9, 'Lower', 'Press'),
  pose(p, o = {}) {
    if (o.bench) {
      const hand = [-0.12, 0.43]
      const S = [hand[0] + 0.05, lerp(hand[1] + B.arm * 0.97, hand[1] + 0.13, p)]
      const hip = [S[0] + 0.03, S[1] - B.torso]
      return side({ hip, shoulder: S, legs: { n: { ankle: [0.4, B.ankleH] } }, arms: { n: { hand } }, props: bench(-0.55, -0.05, 0.4) })
    }
    const hand = [0.03, 0.9]
    const S = [lerp(0.02, 0.06, p), lerp(hand[1] + B.arm * 0.97, hand[1] + 0.12, p)]
    const lean = lerp(4, 18, p)
    const hip = add(S, dir(lean + 180), B.torso)
    const knee = add(hip, dir(172), B.thigh)
    return side({ hip, torso: lean, legs: { n: { ankle: add(knee, dir(235), B.shin), knee } }, arms: { n: { hand } },
      props: [{ k: 'post', a: [hand[0] + 0.05, 0], b: [hand[0] + 0.05, hand[1]], z: -1 }, { k: 'bar', a: [hand[0] - 0.2, hand[1]], b: [hand[0] + 0.2, hand[1]], w: 0.02, z: -1 }] })
  },
}

/** Overhead presses: standing or seated, the hands from the shoulders to straight up. */
export const press = {
  time: rep(0.9, 1.1, 'Press', 'Lower'),
  pose(p, o = {}, eq) {
    const seated = o.seated
    const hip = seated ? [-0.03, 0.47] : [0, B.standHip]
    const S = add(hip, [0, 1], B.torso)
    const k = kind(eq)
    const landmine = k === 'landmine'
    const start = add(S, [k === 'db' || k === 'kb' ? 0.02 : 0.07, 0.03])
    const end = landmine ? add(S, dir(40), B.arm * 0.95) : [S[0] - 0.005, S[1] + B.arm * 0.93]
    const hand = mixP(start, end, p)
    const legs = seated ? { n: { ankle: [hip[0] + B.thigh + 0.02, B.ankleH] } } : {}
    const props = seated ? [pad([hip[0] - 0.05, hip[1] - 0.075], [hip[0] + 0.22, hip[1] - 0.075]), pad([hip[0] - 0.09, hip[1]], [hip[0] - 0.09, hip[1] + 0.32]), { k: 'post', a: [hip[0], 0], b: [hip[0], hip[1] - 0.1], z: -1 }] : []
    return side({ hip, torso: 0, head: lerp(0, -6, Math.sin(Math.PI * p)), legs: seated ? legs : { n: { ankle: [0, B.ankleH] } }, arms: { n: { hand } }, armK: k === 'bar' ? 0.9 : 1,
      props: [...props, ...sideLoad(k === 'none' ? 'body weight' : eq, [hand, hand], { pivot: [0.85, 0.03] })] })
  },
}

/**
 * Raises: front (side view, arms forward to shoulder height), lateral (front view, arms out to
 * the sides), rear (bent over), upright row and shrug.
 */
export const raise = {
  time: rep(0.9, 1.1, 'Lift', 'Lower'),
  pose(p, o = {}, eq) {
    const kindOf = o.kind || 'front'
    if (kindOf === 'lateral' || kindOf === 'y') {
      const hip = [0, o.seated ? 0.5 : B.standHip], sh = hip[1] + B.torso
      const a = kindOf === 'y' ? lerp(172, 28, p) : lerp(172, 88, p)
      const rh = add([B.shoulderW, sh], [Math.sin(a * Math.PI / 180) * B.arm * 0.96, Math.cos(a * Math.PI / 180) * B.arm * 0.96])
      const lh = [-rh[0], rh[1]]
      const one = o.single
      const legs = o.seated ? SEATED_LEGS : {}
      return front({ hip, legs, arms: { r: { hand: rh, elbowSide: [0, -1] }, l: { hand: one ? [-B.shoulderW - 0.03, sh - B.arm * 0.96] : lh, elbowSide: [0, -1] } },
        props: [...frontLoad(eq, [rh, one ? [-B.shoulderW - 0.03, sh - B.arm * 0.96] : lh], { anchorR: [-0.2, 0.08], anchorL: [0.2, 0.08] }),
          ...(o.seated ? [pad([-0.16, 0.42], [0.16, 0.42], 0.04)] : [])] })
    }
    if (kindOf === 'rear') {
      const hip = [-0.08, 0.47], lean = 72, S = add(hip, dir(lean), B.torso)
      const down = hang(S, 0.95)
      const hand = mixP(down, add(S, [0.0, -0.04]), p)
      return side({ hip, torso: lean, head: 60, legs: { n: { ankle: [0.03, B.ankleH] } }, arms: { n: { hand, elbowSide: [0, 1] } }, armK: lerp(1, 0.45, p), props: sideLoad(eq, [hand, hand], { anchor: [0.15, 0.05] }) })
    }
    const hip = [0, o.seated ? 0.47 : B.standHip], S = add(hip, [0, 1], B.torso)
    const legs = o.seated ? { n: { ankle: [B.thigh, B.ankleH] } } : { n: { ankle: [0, B.ankleH] } }
    const seat = o.seated ? [pad([hip[0] - 0.05, hip[1] - 0.075], [hip[0] + 0.22, hip[1] - 0.075])] : []
    if (kindOf === 'upright') {
      const hand = mixP(add(hang(S, 0.93), [0.04, 0]), add(S, [0.07, -0.01]), p)
      return side({ hip, torso: 0, legs, arms: { n: { hand, elbowSide: [-0.4, 1] } }, props: [...seat, ...sideLoad(eq, [hand, hand])] })
    }
    if (kindOf === 'shrug') {
      const hand = add(hang(S, 0.98), [0, 0.035 * p])
      return side({ hip, torso: 0, shrug: 0.035 * p, legs, arms: { n: { hand } }, props: [...seat, ...sideLoad(eq, [hand, hand])] })
    }
    const a = lerp(178, 88, p)
    const hand = add(S, dir(a), B.arm * 0.96)
    return side({ hip, torso: 0, legs, arms: { n: { hand } }, props: [...seat, ...sideLoad(eq, [hand, hand], { anchor: [-0.05, 0.06] })] })
  },
}
