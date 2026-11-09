// Pulling motions: rows, pull-ups and pulldowns, straight-arm pulls, pullovers and face pulls.

import { add, dir, rep, lerp, mixP, cw } from './geom.js'
import { B, side, hang } from './body.js'
import { sideLoad, bench, pad, kind } from './kit.js'

const ANK = [0, B.ankleH]

/** A bent-over stance: soft knees, hips back, the torso `lean` degrees forward. */
function bentOver(lean = 65) {
  const knee = add(ANK, dir(14), B.shin)
  const hip = add(knee, dir(-50), B.thigh)
  return { hip, knee, S: add(hip, dir(lean), B.torso), u: dir(lean), fr: cw(dir(lean)) }
}

export const row = {
  time: rep(0.9, 1.1, 'Pull', 'Lower'),
  pose(p, o = {}, eq) {
    const k = o.kind || 'bent'
    if (k === 'seated') {       // cable or machine row, seated, the pull straight back to the belly
      const hip = o.floor ? [-0.22, 0.13] : [-0.2, 0.42]
      const lean = lerp(22, -6, p), u = dir(lean), S = add(hip, u, B.torso), fr = cw(u)
      const hand = mixP(add(S, dir(lean + 95), B.arm * 0.96), add(add(hip, u, 0.12), fr, 0.12), p)
      const ankle = o.floor ? [0.27, 0.1] : [0.22, B.ankleH]
      const props = o.floor ? [{ k: 'block', x0: 0.32, y0: 0, x1: 0.36, y1: 0.2, c: 'frame', z: -1 }] : [pad([hip[0] - 0.06, hip[1] - 0.075], [hip[0] + 0.2, hip[1] - 0.075]), { k: 'post', a: [hip[0], 0], b: [hip[0], hip[1] - 0.1], z: -1 }]
      if (o.chestPad) props.push(pad(add(S, [0.11, -0.25]), add(S, [0.11, 0.0]), 0.035))
      return side({ hip, torso: lean, legs: { n: { ankle } }, arms: { n: { hand, elbowSide: [-1, 0] } },
        props: [...props, ...(kind(eq) === 'machine' ? [{ k: 'db', at: hand, r: 0.025, z: 1 }] : sideLoad(eq, [hand, hand], { anchor: [0.42, ankle[1] + 0.06] }))] })
    }
    if (k === 'inverted') {     // under a bar, heels down, chest to the bar
      const bar = [-0.05, 0.66]
      const heel = [0.62, B.ankleH]
      const sy = lerp(bar[1] - B.arm * 0.96, bar[1] - 0.12, p)
      const len = B.leg + B.torso, dy = sy - heel[1]
      const S = [heel[0] - Math.sqrt(Math.max(0, len * len - dy * dy)), sy]
      const u = [(heel[0] - S[0]) / len, (heel[1] - S[1]) / len]
      const hip = add(S, u, B.torso)
      const hand = [S[0] + 0.03, bar[1]]
      return side({ hip, shoulder: S, head: 280, legs: { n: { ankle: heel, footDir: 10 } }, arms: { n: { hand } }, props: kind(eq) === 'suspension trainer' ? [{ k: 'strap', from: [hand[0], 1.4], to: hand, z: -1 }] : [{ k: 'pullbar', at: bar, z: -1 }] })
    }
    if (k === 'single') {       // one arm, the other hand and knee on a bench
      const hip = [-0.12, 0.5], lean = 80, u = dir(lean), S = add(hip, u, B.torso)
      const down = hang(S, 0.96), up = add(add(hip, u, 0.17), cw(u), 0.1)
      const hand = mixP(down, up, p)
      return side({ hip, torso: lean, head: 70, legs: { n: { ankle: [-0.2, B.ankleH] }, f: { knee: [hip[0] + 0.02, 0.39], ankle: [hip[0] - 0.21, 0.39] } },
        arms: { n: { hand, elbowSide: [-0.5, 1] }, f: { hand: [S[0] + 0.03, 0.39] } }, props: [...bench(-0.4, 0.4, 0.36), ...sideLoad(eq, [hand, hand])] })
    }
    const lean = k === 'tbar' ? 50 : 65
    const st = bentOver(lean)
    const down = hang(st.S, 0.97)
    const up = add(add(st.hip, st.u, 0.12), st.fr, 0.09)
    const hand = mixP(down, up, p)
    return side({ hip: st.hip, torso: lean, head: lean * 0.75, legs: { n: { ankle: ANK, knee: st.knee } }, arms: { n: { hand, elbowSide: [-0.4, 1] } },
      props: sideLoad(kind(eq) === 'none' ? 'body weight' : eq, [hand, hand], { anchor: [0.5, 0.06], pivot: [-0.7, 0.03] }) })
  },
}

/** Pull-ups and chin-ups (hanging, the bar fixed), and lat pulldowns (seated, the bar moving). */
export const pullUp = {
  time: rep(1.0, 1.2, 'Pull', 'Lower'),
  pose(p, o = {}, eq) {
    if (o.pulldown) {
      const hip = [-0.05, 0.47], lean = lerp(-4, -14, p), u = dir(lean), S = add(hip, u, B.torso)
      const hand = mixP(add(S, dir(-6), B.arm * 0.96), add(add(S, cw(u), 0.07), u, 0.06), p)
      const knee = [hip[0] + B.thigh, hip[1]]
      return side({ hip, torso: lean, legs: { n: { knee, ankle: [knee[0] + 0.02, B.ankleH] } }, arms: { n: { hand } }, armK: 0.9,
        props: [pad([hip[0] - 0.05, hip[1] - 0.075], [hip[0] + 0.18, hip[1] - 0.075]), { k: 'post', a: [hip[0], 0], b: [hip[0], hip[1] - 0.1], z: -1 },
          { k: 'pad', a: [knee[0] - 0.08, knee[1] + 0.085], b: [knee[0] + 0.02, knee[1] + 0.085], w: 0.025, z: 1 },
          { k: 'cable', from: [hand[0] - 0.03, 1.4], to: hand, z: -1 }, { k: 'sleeve', at: hand, z: 1 }] })
    }
    const bar = [0.05, 1.22]
    const S = [lerp(0.0, 0.01, p), lerp(bar[1] - B.arm * 0.97, bar[1] - 0.09, p)]
    const lean = lerp(0, -12, p)
    const hip = add(S, dir(lean + 180), B.torso)
    const knee = add(hip, dir(lerp(170, 160, p)), B.thigh)
    const props = [{ k: 'pullbar', at: bar, z: -1 }]
    const k = kind(eq)
    if (k === 'band') props.push({ k: 'band', from: bar, to: knee, z: 1 })
    if (eq === 'weighted') props.push({ k: 'plate', at: add(hip, [0.02, -0.16]), r: 0.07, z: 1 }, { k: 'strap', from: hip, to: add(hip, [0.02, -0.1]), z: 1 })
    return side({ hip, torso: lean, head: lean * 0.5, legs: { n: { knee, ankle: add(knee, dir(215), B.shin) } }, arms: { n: { hand: bar, elbowSide: [1, -0.2] } }, props })
  },
}

/** Straight-arm pulldown (standing) and pullover (lying): straight arms sweeping through an arc. */
export const sweep = {
  time: rep(1.0, 1.1, 'Pull', 'Return'),
  pose(p, o = {}, eq) {
    if (o.lying) {
      const hip = [0.08, 0.435], ta = 270, S = add(hip, dir(ta), B.torso)
      const hand = add(S, dir(lerp(-100, -8, p)), B.arm * 0.95)
      return side({ hip, torso: ta, legs: { n: { ankle: [0.36, B.ankleH] } }, arms: { n: { hand } }, props: [...bench(-0.36, 0.3), ...sideLoad(kind(eq) === 'none' ? 'dumbbell' : eq, [hand, hand])] })
    }
    const hip = [0, B.standHip - 0.01], lean = 24, S = add(hip, dir(lean), B.torso)
    const hand = add(S, dir(lerp(55, 172, p)), B.arm * 0.96)
    return side({ hip, torso: lean, legs: { n: { ankle: [0.02, B.ankleH] } }, arms: { n: { hand } }, props: sideLoad(eq, [hand, hand], { anchor: [0.55, 1.3] }) })
  },
}

export const facePull = {
  time: rep(0.9, 1.1, 'Pull', 'Return'),
  pose(p, o = {}, eq) {
    const hip = [0, B.standHip], S = add(hip, [0, 1], B.torso)
    const hand = mixP(add(S, dir(88), B.arm * 0.96), add(S, [0.05, 0.09]), p)
    return side({ hip, torso: -3, legs: { n: { ankle: [0.02, B.ankleH] } }, arms: { n: { hand, elbowSide: [-0.5, 1] } }, props: sideLoad(eq, [hand, hand], { anchor: [0.62, S[1] + 0.05] }) })
  },
}
