// Arm motions: curls, triceps extensions, pushdowns, kickbacks and wrist curls. The upper arm
// stays put and the forearm turns about the elbow.

import { add, dir, rep, lerp, cw } from './geom.js'
import { B, side, front } from './body.js'
import { sideLoad, bench, pad, kind } from './kit.js'

const seat = hip => [pad([hip[0] - 0.05, hip[1] - 0.075], [hip[0] + 0.2, hip[1] - 0.075]), { k: 'post', a: [hip[0], 0], b: [hip[0], hip[1] - 0.1], z: -1 }]

export const curl = {
  time: rep(0.9, 1.2, 'Lift', 'Lower'),
  pose(p, o = {}, eq) {
    const k = o.kind || 'standing'
    let hip = [0, B.standHip], lean = 0, upper = 180, props = [], legs = { n: { ankle: [0, B.ankleH] } }
    let from = 176, to = 28
    if (k === 'seated' || k === 'concentration' || k === 'preacher' || k === 'incline') {
      hip = [-0.08, 0.47]
      legs = { n: { ankle: [hip[0] + B.thigh + 0.03, B.ankleH] } }
      props = seat(hip)
    }
    if (k === 'preacher') { upper = 140; from = 132; to = 8; props.push(pad(add(hip, [0.06, 0.29]), add(hip, [0.22, 0.12]), 0.03)) }
    if (k === 'incline') { lean = -38; props.push(pad(add(hip, [-0.07, 0.0]), add(hip, dir(-38), 0.36), 0.03)) }
    if (k === 'concentration') { lean = 34; upper = 182; from = 180; to = 40 }
    if (k === 'spider') { hip = [-0.12, 0.52]; lean = 55; upper = 182; from = 180; to = 40; props = [pad([hip[0] - 0.02, hip[1] - 0.07], [hip[0] + 0.12, hip[1] - 0.07]), pad(add(hip, dir(55), 0.06), add(hip, dir(55), 0.26), 0.03)]; legs = { n: { ankle: [hip[0] - 0.02, B.ankleH] } } }
    const u = dir(lean), S = add(hip, u, B.torso)
    const elbow = add(S, dir(upper + (k === 'standing' || k === 'seated' ? -3 : 0)), B.upperArm)
    const hand = add(elbow, dir(lerp(from, to, p)), B.forearm)
    const arms = { n: { hand, elbow } }
    if (k === 'concentration') arms.f = { hand: add(hip, [0.22, 0.08]) }
    return side({ hip, torso: lean, head: lean * 0.6, legs, arms, props: [...props, ...sideLoad(kind(eq) === 'none' ? 'dumbbell' : eq, [hand, hand], { anchor: [hand[0] + 0.25, 0.1] })] })
  },
}

/** Triceps: overhead extension, lying extension (skull crusher), pushdown, kickback. */
export const triceps = {
  time: rep(1.0, 0.9, 'Lower', 'Press'),
  pose(p, o = {}, eq) {
    const k = o.kind || 'pushdown'
    if (k === 'lying') {
      const hip = [0.08, 0.435], ta = 270, S = add(hip, dir(ta), B.torso)
      const elbow = add(S, dir(-12), B.upperArm)
      const hand = add(elbow, dir(lerp(-12, -140, p)), B.forearm)
      return side({ hip, torso: ta, legs: { n: { ankle: [0.36, B.ankleH] } }, arms: { n: { hand, elbow } }, props: [...bench(-0.36, 0.3), ...sideLoad(kind(eq) === 'none' ? 'ez barbell' : eq, [hand, hand])] })
    }
    if (k === 'overhead') {
      const seated = o.seated
      const hip = seated ? [-0.05, 0.47] : [0, B.standHip], S = add(hip, [0, 1], B.torso)
      const elbow = add(S, dir(-4), B.upperArm)
      const hand = add(elbow, dir(lerp(-2, -158, p)), B.forearm)
      return side({ hip, torso: 0, head: 6, legs: { n: { ankle: seated ? [hip[0] + B.thigh + 0.03, B.ankleH] : [0, B.ankleH] } }, arms: { n: { hand, elbow } },
        props: [...(seated ? seat(hip) : []), ...sideLoad(eq, [hand, hand], { anchor: [-0.5, 0.1] })] })
    }
    if (k === 'kickback') {
      const hip = [-0.1, 0.5], lean = 72, u = dir(lean), S = add(hip, u, B.torso)
      const elbow = add(S, dir(lean + 180 - 15), B.upperArm)
      const hand = add(elbow, dir(lerp(178, lean + 180 - 12, p)), B.forearm)
      return side({ hip, torso: lean, head: 65, legs: { n: { ankle: [0.02, B.ankleH] } }, arms: { n: { hand, elbow } }, props: sideLoad(eq, [hand, hand], { anchor: [hand[0] + 0.3, 0.1] }) })
    }
    // pushdown: elbows pinned at the sides, the cable from above
    const hip = [0, B.standHip], lean = 10, S = add(hip, dir(lean), B.torso)
    const elbow = add(S, dir(176), B.upperArm)
    const hand = add(elbow, dir(lerp(52, 172, p)), B.forearm)
    return side({ hip, torso: lean, legs: { n: { ankle: [0, B.ankleH] } }, arms: { n: { hand, elbow } }, props: sideLoad(kind(eq) === 'none' ? 'cable' : eq, [hand, hand], { anchor: [hand[0] + 0.08, 1.35] }) })
  },
}

/** Wrist curls: forearms on the thighs, only the hands move. */
export const wrist = {
  time: rep(0.7, 0.9, 'Lift', 'Lower'),
  pose(p, o = {}, eq) {
    const hip = [-0.08, 0.47], lean = 30, S = add(hip, dir(lean), B.torso)
    const knee = [hip[0] + B.thigh, hip[1]]
    const elbow = add(knee, [-0.12, 0.04])
    const wristP = add(elbow, [B.forearm * 0.92, 0.0])
    const hand = add(wristP, dir(lerp(150, 60, p)), 0.035)
    return side({ hip, torso: lean, head: 40, legs: { n: { knee, ankle: [knee[0] + 0.02, B.ankleH] } }, arms: { n: { hand, elbow } }, props: [...seat(hip), ...sideLoad(kind(eq) === 'none' ? 'dumbbell' : eq, [hand, hand])] })
  },
}

/** Rotator cuff rotations, seen from the front: the elbow at the side, bent square, the forearm
 * swinging out (external) or in across the belly (internal). */
export const cuff = {
  time: rep(1.0, 1.1, 'Lift', 'Return'),
  pose(p, o = {}, eq) {
    const hip = [0, B.standHip], j = front({ hip })
    const el = add(j.r.shoulder, [0.015, -B.upperArm])
    const a = o.internal ? lerp(90, 0, p) : lerp(0, 90, p)        // 0: forearm toward the viewer, 90: out to the side
    const reachX = Math.sin(a * Math.PI / 180) * B.forearm * (o.internal ? -1 : 1)
    const hand = add(el, [o.internal ? reachX - 0.0 : reachX, 0.02])
    return front({ hip, arms: { r: { elbow: el, hand } }, props: kind(eq) === 'cable' || kind(eq) === 'band' ? [{ k: kind(eq) === 'cable' ? 'cable' : 'band', from: [o.internal ? 0.6 : -0.5, el[1]], to: hand, z: -1 }] : kind(eq) === 'db' ? [{ k: 'db', at: hand, z: 1 }] : [] })
  },
}

export { cw }
