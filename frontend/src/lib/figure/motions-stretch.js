// Stretches, yoga poses and mobility drills: held positions that breathe, deepening a little on
// each breath (p 0..1). `o.pose` names the position; the classifier picks it from the name.

import { add, dir, lerp, breathe, swing } from './geom.js'
import { B, side, front } from './body.js'
import { bench } from './kit.js'

const ANK = [0, B.ankleH]
const KNEEL = [-0.15, 0.06]

const POSES = {
  // standing forward fold: legs straight, the torso hanging toward the feet
  fold(p) {
    const ta = lerp(118, 132, p)
    const hip = [-0.06, B.standHip - 0.01]
    const S = add(hip, dir(ta), B.torso)
    return side({ hip, torso: ta, head: ta + 15, legs: { n: { ankle: [0.02, B.ankleH] } }, arms: { n: { hand: add(S, dir(178), B.arm * 0.95) } } })
  },
  // seated forward fold: legs out in front, reaching for the toes
  seatedFold(p) {
    const hip = [0, 0.065], ta = lerp(50, 62, p)
    const S = add(hip, dir(ta), B.torso)
    return side({ hip, torso: ta, head: ta + 10, legs: { n: { ankle: add(hip, dir(89), B.leg * 0.99), footDir: 5 } }, arms: { n: { hand: add(S, dir(ta + 30), B.arm * 0.95) } } })
  },
  // standing quad stretch: one heel pulled to the glute
  quad(p) {
    const hip = [0, B.standHip], S = add(hip, dir(3), B.torso)
    const knee = add(hip, dir(lerp(182, 192, p)), B.thigh)
    const ankle = add(knee, dir(lerp(14, 6, p)), B.shin)
    return side({ hip, torso: 3, legs: { f: { ankle: ANK }, n: { knee, ankle, footDir: -60 } }, arms: { n: { hand: add(ankle, [0, 0.02]) }, f: { hand: add(S, dir(95), B.arm * 0.95) } } })
  },
  // half-kneeling hip flexor stretch: rear knee down, hips pushed forward
  kneelingLunge(p) {
    const hip = [lerp(-0.04, 0.0, p), 0.3]
    return side({ hip, torso: lerp(0, -6, p), legs: { n: { ankle: [0.26, B.ankleH] }, f: { knee: [-0.12, 0.06], ankle: [-0.33, 0.06] } }, arms: { n: { hand: add(hip, [0.13, 0.02]) } } })
  },
  // low lunge with the arms overhead (crescent, warrior)
  warrior(p) {
    const hip = [-0.03, lerp(0.33, 0.3, p)], S = add(hip, dir(-4), B.torso)
    return side({ hip, torso: -4, head: -10, legs: { n: { ankle: [0.24, B.ankleH] }, f: { ankle: [-0.42, B.ankleH], footDir: 75 } }, arms: { n: { hand: add(S, dir(-8), B.arm * 0.97) } } })
  },
  // calf stretch against a wall: rear leg straight, heel down
  calf(p) {
    const hip = [lerp(0.02, 0.05, p), 0.48], ta = 24, S = add(hip, dir(ta), B.torso)
    return side({ hip, torso: ta, legs: { n: { ankle: [0.18, B.ankleH] }, f: { ankle: [-0.24, B.ankleH] } }, arms: { n: { hand: [0.5, S[1] + 0.02] } }, props: [{ k: 'block', x0: 0.54, y0: 0, x1: 0.6, y1: 1.2, c: 'pad', z: -1 }] })
  },
  // chest opener: hands clasped behind, the arms drawn back
  chest(p) {
    const hip = [0, B.standHip], S = add(hip, dir(-2), B.torso)
    return side({ hip, torso: -2, head: -12, legs: { n: { ankle: ANK } }, arms: { n: { hand: add(S, dir(lerp(205, 218, p)), B.arm * 0.97) } } })
  },
  // arm across the chest, held by the other (front view)
  crossBody(p) {
    const hip = [0, B.standHip], j = front({ hip })
    const r = add(j.l.shoulder, [lerp(-0.04, -0.08, p), -0.03])
    return front({ hip, arms: { r: { hand: r, elbowSide: [0, -1] }, l: { hand: add(j.r.shoulder, [0.06, -0.12]), elbow: add(j.l.shoulder, [0.02, -0.13]) } } })
  },
  // overhead triceps stretch: elbow up, hand down the back (front view)
  tricepsStretch(p) {
    const hip = [0, B.standHip], j = front({ hip })
    const el = add(j.r.shoulder, [0.0, B.upperArm])
    return front({ hip, arms: { r: { elbow: el, hand: add(el, [-0.08, -0.12]) }, l: { hand: add(el, [0.0, 0.02]), elbowSide: [-1, 1] } }, head: lerp(0, -5, p) })
  },
  // side stretch: arms overhead, leaning to one side (front view)
  sideStretch(p) {
    const hip = [0, B.standHip], tilt = lerp(-14, -24, p), j = front({ hip, tilt })
    const up = add(j.shoulder, dir(tilt), 0.3)
    return front({ hip, tilt, legs: { r: { ankle: [0.08, B.ankleH] }, l: { ankle: [-0.08, B.ankleH] } }, arms: { r: { hand: up }, l: { hand: add(up, [-0.03, 0]) } } })
  },
  // neck: the head tilted toward one shoulder, a hand resting on it (front view)
  neck(p) {
    const hip = [0, B.standHip], j = front({ hip, head: lerp(-14, -26, p) })
    return front({ hip, head: lerp(-14, -26, p), arms: { l: { hand: add(j.head, [0.03, 0.05]), elbowSide: [-1, 0.4] } } })
  },
  // neck flexion and extension: a slow nod (side view)
  nod(p) {
    const hip = [0, B.standHip]
    return side({ hip, torso: 0, head: lerp(-25, 35, p), legs: { n: { ankle: ANK } }, arms: { n: { hand: [0.02, 0.48] } } })
  },
  // child's pose: kneeling, sitting back, arms long on the floor
  child(p) {
    const knee = [0.02, 0.06], hip = [-0.12, lerp(0.17, 0.15, p)]
    const ta = 76, S = add(hip, dir(ta), B.torso)
    return side({ hip, torso: ta, head: 110, legs: { n: { knee, ankle: [-0.2, 0.05], footDir: 270 } }, arms: { n: { hand: [S[0] + 0.28, 0.03] } } })
  },
  // cobra / upward dog: hips down, chest lifted on straight arms
  cobra(p) {
    const hip = [0, 0.07], ta = lerp(58, 50, p), S = add(hip, dir(ta), B.torso)
    return side({ hip, torso: ta, head: ta - 25, legs: { n: { ankle: add(hip, dir(270), B.leg * 0.99), footDir: 180 } }, arms: { n: { hand: [S[0] + 0.02, 0.02] } } })
  },
  // downward dog: an upside-down V, heels toward the floor
  downDog(p) {
    const hands = [0.36, 0.02], ank = [-0.3, B.ankleH + lerp(0.04, 0.01, p)]
    const hip = [-0.02, 0.6]
    return side({ hip, shoulder: add(hands, dir(-28), B.arm * 0.97), head: 205, legs: { n: { ankle: ank, toe: [ank[0] + 0.09, 0.012] } }, arms: { n: { hand: hands } } })
  },
  // cat-cow on all fours: the head and hips rise and fall
  catCow(p) {
    const hip = [-0.15, lerp(0.32, 0.35, p)], S = add([0.14, lerp(0.35, 0.32, p)], [0, 0])
    return side({ hip, shoulder: S, head: lerp(60, 140, p), legs: { n: { knee: KNEEL, ankle: [-0.37, 0.05] } }, arms: { n: { hand: [0.14, 0.02] } } })
  },
  // pigeon: front shin across, back leg long, chest up
  pigeon(p) {
    const hip = [0, 0.13], ta = lerp(10, 40, p)
    return side({ hip, torso: ta, legs: { n: { knee: [0.2, 0.06], ankle: [0.05, 0.05], footDir: 260 }, f: { ankle: add(hip, dir(266), B.leg * 0.99), footDir: 180 } }, arms: { n: { hand: [0.27, 0.03] } } })
  },
  // butterfly: seated, soles together, knees out (front view)
  butterfly(p) {
    const hip = [0, 0.09], drop = lerp(0.2, 0.14, p)
    return front({ hip, tilt: 0, head: 0, legs: { r: { knee: [0.28, drop], ankle: [0.05, 0.06] }, l: { knee: [-0.28, drop], ankle: [-0.05, 0.06] } }, arms: { r: { hand: [0.06, 0.07] }, l: { hand: [-0.06, 0.07] } } })
  },
  // knee to chest / figure four: lying on the back, one knee hugged in
  kneeHug(p) {
    const hip = [0, 0.07]
    const knee = add(hip, dir(lerp(355, 340, p)), B.thigh)
    return side({ hip, torso: 270, head: 270, legs: { n: { knee, ankle: add(knee, dir(110), B.shin) }, f: { ankle: add(hip, dir(89), B.leg * 0.99), footDir: 0 } }, arms: { n: { hand: add(knee, [0.0, -0.03]) } } })
  },
  // lying twist: knees dropped to one side, shoulders flat
  lyingTwist(p) {
    const hip = [0, 0.09]
    const knee = add(hip, dir(lerp(70, 80, p)), B.thigh)
    return side({ hip, torso: 270, head: 270, legs: { n: { knee, ankle: add(knee, dir(185), B.shin) } }, arms: { n: { hand: [-0.6, 0.03] } } })
  },
  // standing on one leg, the other foot at the knee (tree, balance; front view)
  balance(p) {
    const hip = [0, B.standHip], j = front({ hip })
    const up = add(j.shoulder, [0, lerp(0.3, 0.32, p)])
    return front({ hip, legs: { r: { knee: add(j.r.hip, [0.17, -0.15]), ankle: add(j.l.hip, [0.04, -0.27]) } }, arms: { r: { hand: up }, l: { hand: add(up, [-0.02, 0]) } } })
  },
  // standing tall, breathing
  stand(p) {
    const hip = [0, B.standHip + p * 0.004]
    return side({ hip, torso: 0, legs: { n: { ankle: ANK } }, arms: { n: { hand: [0.02, 0.48] } } })
  },
  // lying still on the back
  supine(p) {
    return side({ hip: [0, 0.07], torso: 270, head: 270 + p * 2, legs: { n: { ankle: add([0, 0.07], dir(89), B.leg * 0.99), footDir: 0 } }, arms: { n: { hand: [B.arm * 0.98 - B.torso, 0.03] } } })
  },
  // seated on the heels, upright (and camel, leaning back)
  kneelUp(p) {
    const hip = [-0.1, 0.32], ta = lerp(-6, -18, p)
    return side({ hip, torso: ta, head: ta - 10, legs: { n: { knee: [0.0, 0.06], ankle: [-0.22, 0.05], footDir: 270 } }, arms: { n: { hand: add(hip, [-0.1, -0.12]) } } })
  },
  // a squat held at the bottom, hands together (deep squat, malasana)
  deepSquat(p) {
    const hip = [-0.08, 0.16 + p * 0.01], ta = 22, S = add(hip, dir(ta), B.torso)
    return side({ hip, torso: ta, legs: { n: { ankle: [0.04, B.ankleH] } }, arms: { n: { hand: add(S, [0.12, -0.1]) } } })
  },
  // seated on a bench or the floor, upright: a generic seated stretch or mobility hold
  seated(p) {
    const hip = [-0.1, 0.42]
    return side({ hip, torso: lerp(0, 8, p), legs: { n: { ankle: [0.16, B.ankleH] } }, arms: { n: { hand: add(hip, [0.2, 0.03]) } }, props: bench(-0.35, 0.05, 0.36) })
  },
}

export const stretch = { time: breathe(5, 'Hold'), pose: (p, o = {}) => (POSES[o.pose] || POSES.stand)(p) }
export const STRETCH_POSES = Object.keys(POSES)

/** Foam rolling and massage balls: the body rocking back and forth over the roller. */
export const roll = {
  time: swing(2.2, 'Breathe'),
  pose(p, o = {}) {
    const at = o.where || 'thigh'
    const x = lerp(-0.08, 0.08, p)
    const ball = o.ball
    const r = ball ? 0.04 : 0.06
    if (at === 'back') {
      const S = [-0.25 + x, 0.2], hip = [S[0] + 0.27, 0.13]
      return side({ hip, shoulder: S, head: 280, legs: { n: { ankle: [hip[0] + 0.28, B.ankleH] } }, arms: { n: { hand: add(S, [0.05, 0.1]) } }, props: [{ k: 'roller', at: [S[0] + 0.02, r], r, z: -1 }] })
    }
    if (at === 'calf') {
      const hip = [-0.05 + x, 0.12]
      return side({ hip, torso: -30, legs: { n: { ankle: [hip[0] + 0.46, 0.13], footDir: 10 } }, arms: { n: { hand: [hip[0] - 0.13, 0.02] } }, props: [{ k: 'roller', at: [hip[0] + 0.33, r], r, z: -1 }] })
    }
    // thighs: prone on the forearms, the roller under the front of the thighs
    const S = [0.25 + x, 0.2]
    const ank = [S[0] - 0.78, 0.11]
    return side({ hip: add(ank, [0.47, 0.06]), shoulder: S, head: 85, legs: { n: { ankle: ank, footDir: 180 } }, arms: { n: { elbow: [S[0], 0.035], hand: [S[0] + 0.14, 0.03] } }, props: [{ k: 'roller', at: [S[0] - 0.42, r], r, z: 1 }] })
  },
}
