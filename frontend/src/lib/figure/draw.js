// Turns a figure pose (body.js) into flat shapes: { d, c } filled paths and { d, s, w } strokes,
// in SVG coordinates (y down). `c` and `s` are colour tokens (TONES), which the React component
// maps to CSS variables and figureSvg() to fixed colours. Also returns the points the drawing
// covers, so a whole rep can be framed.

import { add, sub, norm, len, ccw } from './geom.js'
import { B } from './body.js'

const FAR = [-0.016, 0.008]          // far limbs sit a little behind and above, for depth
const f4 = n => (Math.round(n * 1e4) / 1e4).toString()
const P = p => f4(p[0]) + ' ' + f4(-p[1])

function capsule(p1, r1, p2, r2) {
  const v = sub(p2, p1), l = len(v)
  if (l < 1e-6) return circle(p1, Math.max(r1, r2))
  const n = ccw(norm(v))
  const a = add(p1, n, r1), b = add(p2, n, r2), c = add(p2, n, -r2), d = add(p1, n, -r1)
  return `M${P(a)}L${P(b)}A${f4(r2)} ${f4(r2)} 0 1 1 ${P(c)}L${P(d)}A${f4(r1)} ${f4(r1)} 0 1 1 ${P(a)}Z`
}
function circle(p, r) {
  return `M${f4(p[0] - r)} ${f4(-p[1])}a${f4(r)} ${f4(r)} 0 1 0 ${f4(2 * r)} 0a${f4(r)} ${f4(r)} 0 1 0 ${f4(-2 * r)} 0Z`
}
function rect(x0, y0, x1, y1, r = 0.01) {
  const [a, b] = [Math.min(x0, x1), Math.max(x0, x1)], [c, d] = [Math.min(y0, y1), Math.max(y0, y1)]
  const k = Math.min(r, (b - a) / 2, (d - c) / 2)
  return `M${f4(a + k)} ${f4(-d)}H${f4(b - k)}A${f4(k)} ${f4(k)} 0 0 1 ${f4(b)} ${f4(-d + k)}V${f4(-c - k)}`
    + `A${f4(k)} ${f4(k)} 0 0 1 ${f4(b - k)} ${f4(-c)}H${f4(a + k)}A${f4(k)} ${f4(k)} 0 0 1 ${f4(a)} ${f4(-c - k)}`
    + `V${f4(-d + k)}A${f4(k)} ${f4(k)} 0 0 1 ${f4(a + k)} ${f4(-d)}Z`
}
const line = (a, b) => `M${P(a)}L${P(b)}`

/* ---------- equipment ---------- */

function drawProp(pr, out) {
  const { shapes, pts } = out
  const fill = (d, c) => shapes.push({ d, c })
  const stroke = (d, s, w) => shapes.push({ d, s, w })
  switch (pr.k) {
    case 'plate': {            // a barbell end, seen side-on
      const r = pr.r || 0.125
      fill(circle(pr.at, r), 'plateRim'); fill(circle(pr.at, r - 0.012), 'plate'); fill(circle(pr.at, 0.03), 'plateRim')
      pts.push(add(pr.at, [-r, -r]), add(pr.at, [r, r])); break
    }
    case 'sleeve': fill(circle(pr.at, 0.016), 'steel'); break
    case 'db': {               // a dumbbell end-on
      const r = pr.r || 0.045
      fill(circle(pr.at, r), 'plateRim'); fill(circle(pr.at, r - 0.01), 'plate')
      pts.push(add(pr.at, [-r, -r]), add(pr.at, [r, r])); break
    }
    case 'dbH': {              // a dumbbell side-on, front view
      const a = add(pr.at, [-0.05, 0]), b = add(pr.at, [0.05, 0])
      stroke(line(a, b), 'steel', 0.014)
      fill(rect(a[0] - 0.012, a[1] - 0.04, a[0] + 0.012, a[1] + 0.04, 0.008), 'plateRim')
      fill(rect(b[0] - 0.012, b[1] - 0.04, b[0] + 0.012, b[1] + 0.04, 0.008), 'plateRim')
      pts.push(add(a, [-0.02, -0.04]), add(b, [0.02, 0.04])); break
    }
    case 'barH': {             // a barbell side-on, front view
      const w = pr.w || 0.34, a = add(pr.at, [-w, 0]), b = add(pr.at, [w, 0])
      stroke(line(a, b), 'steel', 0.012)
      for (const e of [a, b]) for (const dx of [0, 0.024]) {
        const x = e[0] + (e === a ? dx : -dx) * -1
        fill(rect(x - 0.01, e[1] - 0.1 + dx, x + 0.01, e[1] + 0.1 - dx, 0.008), dx ? 'plate' : 'plateRim')
      }
      pts.push(add(a, [-0.04, -0.1]), add(b, [0.04, 0.1])); break
    }
    case 'kb': {               // a kettlebell, the bell under the handle
      const c = add(pr.at, [0, -0.06])
      stroke(`M${P(add(pr.at, [-0.03, -0.035]))}Q${P(add(pr.at, [0, 0.03]))} ${P(add(pr.at, [0.03, -0.035]))}`, 'plateRim', 0.014)
      fill(circle(c, 0.05), 'plateRim'); fill(circle(c, 0.04), 'plate')
      pts.push(add(c, [-0.05, -0.05]), add(pr.at, [0.05, 0.03])); break
    }
    case 'ball': fill(circle(pr.at, pr.r), pr.c || 'pad'); pts.push(add(pr.at, [-pr.r, -pr.r]), add(pr.at, [pr.r, pr.r])); break
    case 'roller': fill(circle(pr.at, pr.r || 0.06), 'pad'); fill(circle(pr.at, (pr.r || 0.06) * 0.45), 'frame'); pts.push(add(pr.at, [-0.06, -0.06])); break
    case 'wheel': fill(circle(pr.at, 0.07), 'plateRim'); fill(circle(pr.at, 0.025), 'steel'); pts.push(add(pr.at, [-0.07, -0.07]), add(pr.at, [0.07, 0.07])); break
    case 'pad': {              // a bench top, a seat, a back rest: a thick rounded bar from a to b
      fill(capsule(pr.a, pr.w || 0.028, pr.b, pr.w || 0.028), 'pad'); pts.push(pr.a, pr.b); break
    }
    case 'post': stroke(line(pr.a, pr.b), 'frame', pr.w || 0.018); pts.push(pr.a, pr.b); break
    case 'box': fill(rect(pr.x0, 0, pr.x1, pr.h, 0.012), 'pad'); pts.push([pr.x0, 0], [pr.x1, pr.h]); break
    case 'cable': {            // a pulley and its cable to the hand
      fill(circle(pr.from, 0.024), 'frame'); fill(circle(pr.from, 0.01), 'steel')
      stroke(line(pr.from, pr.to), 'steel', 0.006); pts.push(pr.from, pr.to); break
    }
    case 'band': stroke(line(pr.from, pr.to), 'band', 0.014); pts.push(pr.from, pr.to); break
    case 'strap': stroke(line(pr.from, pr.to), 'frame', 0.01); pts.push(pr.from, pr.to); break
    case 'bar': stroke(line(pr.a, pr.b), 'steel', pr.w || 0.014); pts.push(pr.a, pr.b); break
    case 'pullbar': {          // a fixed bar end-on, on its frame
      stroke(line(pr.at, add(pr.at, [-0.25, 0])), 'frame', 0.016)
      fill(circle(pr.at, 0.018), 'steel'); pts.push(pr.at, add(pr.at, [-0.25, 0.02])); break
    }
    case 'block': fill(rect(pr.x0, pr.y0, pr.x1, pr.y1, 0.012), pr.c || 'pad'); pts.push([pr.x0, pr.y0], [pr.x1, pr.y1]); break
    default: break
  }
}

/* ---------- the body ---------- */

const tone = (lvl, far) => (lvl === 1 ? (far ? 'accFar' : 'acc') : lvl === 2 ? (far ? 'acc2Far' : 'acc2') : (far ? 'far' : 'body'))

function sideBody(j, mus, out, fem) {
  const fill = (d, c) => out.shapes.push({ d, c })
  const m = r => mus[r] || 0
  const limb = (L, far) => {
    const o = far ? FAR : [0, 0], s = p => add(p, o)
    fill(capsule(s(L.heel), 0.02, s(L.toe), 0.012), tone(m('foot'), far))
    fill(capsule(s(L.ankle), 0.022, s(L.knee), 0.034), tone(m('shin'), far))
    fill(capsule(s(L.knee), 0.036, s(L.hip), 0.054), tone(m('thigh'), far))
  }
  const armOf = (L, far) => {
    const o = far ? FAR : [0, 0], s = p => add(p, o)
    fill(capsule(s(L.shoulder), 0.027, s(L.elbow), 0.021), tone(m('upperArm'), far))
    // the deltoid caps the top of the upper arm
    fill(capsule(s(L.shoulder), 0.034, s(add(L.shoulder, sub(L.elbow, L.shoulder), 0.35)), 0.026), tone(m('delt'), far))
    fill(capsule(s(L.elbow), 0.021, s(L.hand), 0.017), tone(m('forearm'), far))
    fill(circle(s(L.hand), 0.02), tone(m('hand'), far))
  }
  const u = j.u, fr = j.front
  const at = (d, o) => add(add(j.hip, u, d), fr, o)
  armOf(j.f, true)
  limb(j.f, true)
  for (const pr of j.props) if (pr.z === 0) drawProp(pr, out)
  fill(capsule(j.hip, 0.058, j.shoulder, 0.064), 'body')
  fill(circle(at(B.torso - 0.1, 0.01), 0.062), tone(m('chest')))
  fill(circle(at(0.1, 0.012), 0.05), tone(m('belly')))
  // the back: a band down the back of the torso, from the shoulder blades to the waist
  fill(capsule(at(B.torso - 0.06, -0.03), 0.04, at(0.1, -0.026), 0.034), tone(m('back')))
  fill(circle(at(0.005, -0.02 - (fem ? 0.006 : 0)), 0.056 + (fem ? 0.005 : 0)), tone(m('glute')))
  fill(capsule(j.shoulder, 0.03, j.head, 0.028), tone(m('neck')))
  fill(circle(j.head, B.headR), 'body')
  if (fem) fill(circle(add(add(j.head, norm(sub(j.head, j.shoulder)), 0.012), fr, -0.06), 0.03), 'body')
  limb(j.n, false)
  armOf(j.n, false)
  out.pts.push(j.head, j.n.toe, j.f.toe, j.n.heel, j.n.hand, j.f.hand, j.n.knee, j.f.knee, j.hip, j.n.elbow)
}

function frontBody(j, mus, out, fem) {
  const fill = (d, c) => out.shapes.push({ d, c })
  const m = r => mus[r] || 0
  const across = j.across, u = j.u
  const at = (d, o) => add(add(j.hip, u, d), across, o)
  for (const L of [j.l, j.r]) {
    fill(capsule(L.ankle, 0.022, L.toe, 0.016), tone(m('foot')))
    fill(capsule(L.ankle, 0.024, L.knee, 0.036), tone(m('shin')))
    fill(capsule(L.knee, 0.038, L.hip, 0.056), tone(m('thigh')))
  }
  fill(capsule(j.l.hip, 0.06 + (fem ? 0.008 : 0), j.r.hip, 0.06 + (fem ? 0.008 : 0)), 'body')
  fill(capsule(j.hip, 0.068, j.shoulder, 0.072), 'body')
  fill(capsule(j.l.shoulder, 0.045, j.r.shoulder, 0.045), 'body')
  for (const s of [-1, 1]) fill(capsule(at(B.torso - 0.06, s * 0.075), 0.035, at(B.torso - 0.17, s * 0.06), 0.028), tone(m('back')))
  for (const s of [-1, 1]) fill(circle(at(B.torso - 0.075, s * 0.045), 0.05), tone(m('chest')))
  fill(capsule(at(0.06, 0), 0.045, at(0.15, 0), 0.045), tone(m('belly')))
  fill(capsule(j.shoulder, 0.03, j.head, 0.03), tone(m('neck')))
  fill(circle(j.head, B.headR), 'body')
  if (fem) fill(circle(add(j.head, u, 0.06), 0.03), 'body')
  for (const L of [j.l, j.r]) {
    fill(capsule(L.shoulder, 0.028, L.elbow, 0.022), tone(m('upperArm')))
    fill(capsule(L.shoulder, 0.038, add(L.shoulder, sub(L.elbow, L.shoulder), 0.33), 0.027), tone(m('delt')))
    fill(capsule(L.elbow, 0.022, L.hand, 0.017), tone(m('forearm')))
    fill(circle(L.hand, 0.02), tone(m('hand')))
  }
  out.pts.push(j.head, j.l.toe, j.r.toe, j.l.hand, j.r.hand, j.l.elbow, j.r.elbow, j.l.knee, j.r.knee)
}

/** Shapes and covered points for pose `j` with muscles `mus` (muscles.js). */
export function drawPose(j, mus = {}, { fem = false, floor = true } = {}) {
  const out = { shapes: [], pts: [] }
  for (const pr of j.props) if (pr.z == null || pr.z < 0) drawProp(pr, out)
  if (j.view === 'front') frontBody(j, mus, out, fem)
  else sideBody(j, mus, out, fem)
  for (const pr of j.props) if (pr.z > 0) drawProp(pr, out)
  if (floor) out.floor = true
  return out
}

export const TONES = ['body', 'far', 'acc', 'accFar', 'acc2', 'acc2Far', 'plate', 'plateRim', 'steel', 'floor', 'pad', 'frame', 'band']
export { capsule, circle, rect }
