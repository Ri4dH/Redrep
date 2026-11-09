// Core motions: crunches and sit-ups, leg and knee raises, planks and holds, mountain climbers,
// rollouts, back extensions, side bends, twists and chops.

import { add, dir, rep, lerp, mixP, cw, swing, breathe, cycle } from './geom.js'
import { B, side, front, hang } from './body.js'
import { sideLoad, frontLoad, bench, pad, kind } from './kit.js'

const FLOOR_HIP = [0, 0.065]

/** A straight arm lying along the body, from the shoulder toward the hip, on the floor. */
export const alongside = (S, hip) => { const v = [hip[0] - S[0], hip[1] - S[1]], l = Math.hypot(v[0], v[1]) || 1; return [S[0] + v[0] / l * B.arm * 0.98, Math.max(0.025, S[1] + v[1] / l * B.arm * 0.98)] }

/** Lying on the back, head toward -x: torso angle `ta` (270 flat, up to ~350 sitting up). */
function supine(ta, o = {}) {
  const hip = o.hip || FLOOR_HIP
  return { hip, ta, S: add(hip, dir(ta), B.torso), u: dir(ta) }
}

export const crunch = {
  time: rep(0.8, 1.0, 'Lift', 'Lower'),
  pose(p, o = {}, eq) {
    const k = o.kind || 'crunch'
    const up = k === 'situp' ? 72 : k === 'crunch' ? 32 : 0
    const L = supine(270 + up * p)
    const legs = { n: { ankle: [0.3, B.ankleH] } }
    if (k === 'reverse') {
      const knee = add(L.hip, dir(lerp(50, 0, p)), B.thigh)
      legs.n = { knee, ankle: add(knee, dir(lerp(110, 80, p)), B.shin) }
      L.hip = add(L.hip, [0, 0.03 * p])
    }
    if (k === 'vup') {
      const L2 = supine(270 + 58 * p)
      const ank = add(L2.hip, dir(lerp(88, 30, p)), B.leg * 0.98)
      const hand = add(L2.S, dir(lerp(270, 40, p)), B.arm * 0.95)
      return side({ hip: L2.hip, torso: L2.ta, head: L2.ta + 10, legs: { n: { ankle: ank, footDir: lerp(0, 330, p) } }, arms: { n: { hand } } })
    }
    if (k === 'bicycle') {
      const S2 = supine(300)
      const n = { knee: add(S2.hip, dir(lerp(20, 70, p)), B.thigh) }; n.ankle = add(n.knee, dir(95), B.shin)
      const f = { knee: add(S2.hip, dir(lerp(70, 20, p)), B.thigh) }; f.ankle = add(f.knee, dir(95), B.shin)
      const hand = add(S2.S, dir(320), 0.08)
      return side({ hip: S2.hip, torso: 300, head: 310, legs: { n, f }, arms: { n: { hand } } })
    }
    const hand = k === 'reverse' ? alongside(L.S, L.hip) : add(add(L.S, L.u, 0.07), cw(L.u), 0.05)
    const props = []
    if (kind(eq) !== 'none' && k !== 'reverse') props.push(...sideLoad(eq === 'cable' ? 'cable' : 'weight plate', [add(L.S, cw(L.u), 0.08), add(L.S, cw(L.u), 0.08)], { anchor: [-0.6, 0.6] }))
    if (o.decline) props.push(pad([-0.4, 0.035], [0.15, 0.035], 0.02))
    return side({ hip: L.hip, torso: L.ta, head: L.ta + 12 * p + 4, legs, arms: { n: { hand } }, props })
  },
}

/** Lying leg raises (supine), and hanging knee and leg raises from a bar. */
export const legRaise = {
  time: rep(0.9, 1.1, 'Lift', 'Lower'),
  pose(p, o = {}) {
    if (o.hanging) {
      const bar = [0.05, 1.22], S = [0, bar[1] - B.arm * 0.97], hip = add(S, [0, -1], B.torso)
      if (o.knees) {
        const knee = add(hip, dir(lerp(178, 70, p)), B.thigh)
        return side({ hip, torso: 0, legs: { n: { knee, ankle: add(knee, dir(lerp(180, 175, p)), B.shin) } }, arms: { n: { hand: bar } }, props: [{ k: 'pullbar', at: bar, z: -1 }] })
      }
      return side({ hip, torso: 0, legs: { n: { ankle: add(hip, dir(lerp(178, 88, p)), B.leg * 0.99), footDir: lerp(90, 0, p) } }, arms: { n: { hand: bar } }, props: [{ k: 'pullbar', at: bar, z: -1 }] })
    }
    const L = supine(270)
    const ankle = add(L.hip, dir(lerp(87, 8, p)), B.leg * 0.99)
    return side({ hip: L.hip, torso: 270, head: 270, legs: { n: { ankle, footDir: lerp(0, -80, p) } }, arms: { n: { hand: alongside(L.S, L.hip) } } })
  },
}

/** Planks and other holds that only breathe. `o.kind`: plank, high, side, hollow, wallsit, hang, lsit, boat, superman. */
export const hold = {
  time: breathe(4),
  pose(p, o = {}, eq) {
    const k = o.kind || 'plank'
    const b = p * 0.008
    if (k === 'side') {
      return front({ hip: [0, 0.2 + b], tilt: 68, head: 70, legs: { r: { ankle: [-0.42, B.ankleH] }, l: { ankle: [-0.42, B.ankleH + 0.07] } },
        arms: { r: { hand: [0.3, 0.03], elbow: [0.27, 0.03] }, l: { hand: add([0.17, 0.42], [0, 0.18]) } } })
    }
    if (k === 'hollow') {
      const L = supine(285 - p * 3, { hip: [0, 0.07] })
      return side({ hip: L.hip, torso: L.ta, head: L.ta + 15, legs: { n: { ankle: add(L.hip, dir(78 + p * 2), B.leg * 0.99), footDir: 0 } }, arms: { n: { hand: add(L.S, dir(L.ta - 10), B.arm * 0.95) } } })
    }
    if (k === 'wallsit') {
      const hip = [-0.13, 0.27 + b], knee = [hip[0] + B.thigh, hip[1]]
      return side({ hip, torso: 0, legs: { n: { knee, ankle: [knee[0], B.ankleH] } }, arms: { n: { hand: add(hip, [0.12, 0.02]) } }, props: [{ k: 'block', x0: -0.26, y0: 0, x1: -0.2, y1: 1.1, c: 'pad', z: -1 }] })
    }
    if (k === 'hang') {
      const bar = [0.05, 1.22], S = [0, bar[1] - B.arm * 0.97 + b]
      const hip = add(S, [0, -1], B.torso)
      return side({ hip, torso: 0, legs: { n: { ankle: add(hip, dir(182), B.leg * 0.98) } }, arms: { n: { hand: bar } }, props: [{ k: 'pullbar', at: bar, z: -1 }] })
    }
    if (k === 'lsit' || k === 'boat') {
      const hip = k === 'lsit' ? [0, 0.1 + b] : [0, 0.065]
      const ta = k === 'lsit' ? -2 : -38, S = add(hip, dir(ta), B.torso)
      const ankle = add(hip, dir(k === 'lsit' ? 88 : 48), B.leg * 0.99)
      return side({ hip, torso: ta, legs: { n: { ankle, footDir: k === 'lsit' ? 10 : 70 } }, arms: { n: { hand: k === 'lsit' ? [hip[0] + 0.02, 0.025] : add(S, dir(100), B.arm * 0.95) } } })
    }
    if (k === 'superman') return superman.pose(0.8 + p * 0.2)
    if (k === 'high') return pushUpTop(b)
    // forearm plank: elbows under the shoulders, a straight line to the heels
    const S = [0.3, 0.03 + B.upperArm + b], ank = [S[0] - 0.75, 0.085]
    const u = [(S[0] - ank[0]), (S[1] - ank[1])]
    const l = Math.hypot(u[0], u[1])
    const hip = add(ank, [u[0] / l, u[1] / l], B.leg)
    return side({ hip, shoulder: S, head: 85, legs: { n: { ankle: ank, toe: [ank[0] + 0.04, 0.012] } }, arms: { n: { elbow: [S[0], 0.035], hand: [S[0] + 0.14, 0.03] } }, props: kind(eq) === 'none' ? [] : [] })
  },
}

function pushUpTop(b = 0) {
  const S = [0.32, 0.02 + B.arm * 0.97 + b], ank = [S[0] - 0.73, 0.085]
  const v = [S[0] - ank[0], S[1] - ank[1]], l = Math.hypot(v[0], v[1])
  return side({ hip: add(ank, [v[0] / l, v[1] / l], B.leg), shoulder: S, head: 85, legs: { n: { ankle: ank, toe: [ank[0] + 0.04, 0.012] } }, arms: { n: { hand: [S[0], 0.02] } } })
}

/** Mountain climbers and other knee drives from the top of a push-up. */
export const climber = {
  time: swing(0.8, 'Drive up'),
  pose(p) {
    const base = pushUpTop()
    const drive = t => { const knee = add(base.hip, dir(lerp(250, 175, t)), B.thigh); return { knee, ankle: add(knee, dir(lerp(250, 250, t)), B.shin) } }
    const n = drive(p), f = drive(1 - p)
    return side({ hip: base.hip, shoulder: base.shoulder, head: 85, legs: { n, f }, arms: { n: { hand: base.n.hand } } })
  },
}

/** Dead bug and bird dog: opposite arm and leg reaching out, alternating. */
export const deadBug = {
  time: swing(2.4, 'Reach'),
  pose(p, o = {}) {
    if (o.birdDog) {
      const hip = [-0.15, 0.33], S = add(hip, [1, 0], B.torso)
      const reachArm = add(S, dir(lerp(180, 84, p)), B.arm * 0.97), reachLeg = add(hip, dir(lerp(180, 272, p)), B.leg * 0.97)
      return side({ hip, torso: 90, head: 95, legs: { n: { knee: [-0.15, 0.075], ankle: [-0.37, 0.06] }, f: { ankle: p > 0.1 ? reachLeg : [-0.37, 0.06], knee: p > 0.1 ? undefined : [-0.15, 0.075] } },
        arms: { n: { hand: [S[0], 0.03] }, f: { hand: p > 0.1 ? reachArm : [S[0], 0.03] } } })
    }
    const L = supine(270, { hip: [0, 0.07] })
    const tableKnee = add(L.hip, dir(0), B.thigh), tableAnk = add(tableKnee, dir(90), B.shin)
    const ext = add(L.hip, dir(lerp(10, 80, p)), B.leg * 0.98)
    const up = add(L.S, dir(0), B.arm * 0.96), over = add(L.S, dir(lerp(0, -80, p)), B.arm * 0.96)
    return side({ hip: L.hip, torso: 270, head: 270, legs: { n: { knee: tableKnee, ankle: tableAnk }, f: { ankle: p > 0.05 ? ext : tableAnk, knee: p > 0.05 ? undefined : tableKnee } }, arms: { n: { hand: up }, f: { hand: over } } })
  },
}

/** Ab wheel and barbell rollouts, from the knees. */
export const rollout = {
  time: rep(1.4, 1.1, 'Lower', 'Return'),
  pose(p, o = {}, eq) {
    const knee = [-0.18, 0.06]
    const th = lerp(16, 62, p)
    const hip = add(knee, dir(th), B.thigh)
    const ta = lerp(34, 84, p)
    const S = add(hip, dir(ta), B.torso)
    const hand = [S[0] + lerp(0.12, 0.3, p), 0.07]
    return side({ hip, torso: ta, head: ta, legs: { n: { knee, ankle: add(knee, [-B.shin, 0.0]) } }, arms: { n: { hand } }, props: [kind(eq) === 'bar' ? { k: 'plate', at: [hand[0], 0.1], r: 0.1, z: -1 } : { k: 'wheel', at: hand, z: 1 }] })
  },
}

/** 45-degree back extensions (hyperextensions) and reverse hypers. */
export const backExt = {
  time: rep(1.1, 0.9, 'Lower', 'Lift'),
  pose(p, o = {}) {
    const ank = [-0.3, 0.12]
    const hip = add(ank, dir(48), B.leg * 0.99)
    const ta = lerp(48, 158, p)
    const S = add(hip, dir(ta), B.torso)
    const hand = add(S, dir(ta + 180), 0.08)
    return side({ hip, torso: ta, head: ta, legs: { n: { ankle: ank, footDir: 138 } }, arms: { n: { hand: add(hand, cw(dir(ta)), 0.05) } },
      props: [pad(add(hip, dir(138), 0.07), add(hip, dir(138 + 180), 0.02), 0.035), pad([ank[0] - 0.04, ank[1] + 0.07], [ank[0] + 0.06, ank[1] + 0.07], 0.022), { k: 'post', a: [ank[0], 0], b: add(hip, dir(228), 0.12), z: -1 }] })
  },
}

export const superman = {
  time: rep(0.9, 1.1, 'Lift', 'Lower'),
  pose(p) {
    const hip = [0, 0.065]
    const ta = lerp(90, 76, p)
    const S = add(hip, dir(ta), B.torso)
    return side({ hip, torso: ta, head: ta - 5, legs: { n: { ankle: add(hip, dir(lerp(268, 280, p)), B.leg * 0.99), footDir: 180 } }, arms: { n: { hand: add(S, dir(ta - 4), B.arm * 0.97) } } })
  },
}

/** Side bends (front view), with the weight in one hand. */
export const sideBend = {
  time: swing(2.2, 'Lower', 'Lift'),
  pose(p, o = {}, eq) {
    const tilt = lerp(-22, 22, p)
    const hip = [0, B.standHip]
    const j0 = front({ hip, tilt })
    const r = hang(j0.r.shoulder, 0.97), l = hang(j0.l.shoulder, 0.97)
    return front({ hip, tilt, legs: { r: { ankle: [0.09, B.ankleH] }, l: { ankle: [-0.09, B.ankleH] } }, arms: { r: { hand: r }, l: { hand: kind(eq) === 'none' ? add(j0.l.shoulder, [-0.02, 0.18]) : l } }, props: frontLoad(eq === 'dumbbell' || eq === 'kettlebell' ? eq : 'body weight', [r, r]) })
  },
}

/** Twists and chops: Russian twists (seated), woodchops and rotations (front view). */
export const twist = {
  time: swing(1.8, 'Twist'),
  pose(p, o = {}, eq) {
    if (o.seated) {
      const hip = [0, 0.065], ta = -40, S = add(hip, dir(ta), B.torso)
      const hand = add(add(hip, dir(ta), 0.17), cw(dir(ta)), lerp(0.08, 0.2, p))
      const knee = add(hip, dir(48), B.thigh)
      return side({ hip, torso: ta, head: -25, legs: { n: { knee, ankle: add(knee, dir(110), B.shin) } }, arms: { n: { hand }, f: { hand: add(hand, [0.03, -0.01]) } }, props: kind(eq) === 'none' ? [] : sideLoad(eq === 'weight plate' ? eq : 'medicine ball', [hand, hand]) })
    }
    const hip = [0, B.standHip - 0.02]
    const high = [0.4, 1.2], low = [-0.3, 0.42]
    const hand = mixP(high, low, p)
    const tilt = lerp(8, -8, p)
    return front({ hip, tilt, legs: { r: { ankle: [0.12, B.ankleH] }, l: { ankle: [-0.12, B.ankleH] } }, arms: { r: { hand }, l: { hand: add(hand, [-0.02, 0.0]) } }, props: kind(eq) === 'cable' ? [{ k: 'cable', from: [0.62, 1.3], to: hand, z: -1 }] : frontLoad(eq, [hand, hand]) })
  },
}

/** A rotation or circle done slowly: hips, torso or arms tracing a circle. */
export const circles = {
  time: { seconds: 2.4, at: t => ({ p: t, cue: 'Breathe' }) },
  pose(p, o = {}) {
    const a = p * 2 * Math.PI
    const hip = [Math.cos(a) * (o.hips ? 0.04 : 0), B.standHip]
    const tilt = o.hips ? Math.sin(a) * 6 : 0
    const j0 = front({ hip, tilt })
    const arm = (s, L) => (o.arms ? add(add(L.shoulder, [s * B.arm * 0.9, 0]), [Math.cos(a) * 0.05 * s, Math.sin(a) * 0.05]) : add(L.shoulder, [s * 0.03, -0.24]))
    return front({ hip, tilt, legs: { r: { ankle: [0.1, B.ankleH] }, l: { ankle: [-0.1, B.ankleH] } }, arms: { r: { hand: arm(1, j0.r) }, l: { hand: arm(-1, j0.l) } } })
  },
}

export { cycle, bench }
