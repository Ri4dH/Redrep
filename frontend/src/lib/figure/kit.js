// Equipment for a pose: what the hands hold and where a cable or band runs, from the exercise's
// equipment word (catalogue/README.md). Motions place the hands; this draws the load on them.

import { add, mixP } from './geom.js'

export const BAR_EQ = new Set(['barbell', 'olympic barbell', 'ez barbell', 'trap bar', 'smith machine'])
export const kind = eq => (BAR_EQ.has(eq) ? 'bar'
  : eq === 'dumbbell' ? 'db'
    : eq === 'kettlebell' ? 'kb'
      : eq === 'cable' || eq === 'rope' ? 'cable'
        : eq === 'band' || eq === 'resistance band' || eq === 'assisted' ? 'band'
          : eq === 'medicine ball' || eq === 'weight plate' || eq === 'sandbag' || eq === 'weighted' ? 'ball'
            : eq === 'suspension trainer' ? 'strap'
              : eq === 'landmine' ? 'landmine'
                : eq === 'leverage machine' || eq === 'sled machine' ? 'machine'
                  : 'none')

/**
 * Props for a side-view pose: `hands` [near, far], `o.anchor` where a cable or band starts (a
 * pulley, the floor under the feet), `o.bar` where a bar sits when it is not in the hands (on the
 * back, across the hips).
 */
export function sideLoad(eq, hands, o = {}) {
  const k = kind(eq)
  const [n, f] = hands
  const out = []
  const barAt = o.bar || n
  if (k === 'bar' || (o.bar && k !== 'none' && k !== 'band' && k !== 'cable')) {
    out.push({ k: 'plate', at: barAt, r: eq === 'trap bar' ? 0.115 : 0.125, z: -1 }, { k: 'sleeve', at: barAt, z: 1 })
    if (eq === 'smith machine') out.push({ k: 'post', a: [barAt[0] - 0.02, 0], b: [barAt[0] - 0.02, 1.25], z: -1, w: 0.014 })
  } else if (k === 'db') {
    out.push({ k: 'db', at: f, z: -1 }, { k: 'db', at: n, z: 1 })
  } else if (k === 'kb') {
    out.push({ k: 'kb', at: n, z: 1 })
  } else if (k === 'ball') {
    const at = o.ballAt || mixP(n, f, 0.5)
    out.push(eq === 'weight plate' ? { k: 'plate', at, r: 0.085, z: 1 } : { k: 'ball', at, r: eq === 'medicine ball' ? 0.07 : 0.06, c: 'plateRim', z: 1 })
  } else if (k === 'cable') {
    out.push({ k: 'cable', from: o.anchor || [n[0] + 0.35, 0.1], to: n, z: -1 })
  } else if (k === 'band') {
    out.push({ k: 'band', from: o.anchor || [n[0] + 0.02, 0.02], to: n, z: 1 })
  } else if (k === 'strap') {
    out.push({ k: 'strap', from: o.strapAt || [n[0] + 0.1, 1.5], to: n, z: -1 })
  } else if (k === 'landmine') {
    const pivot = o.pivot || [n[0] + 0.75, 0.03]
    out.push({ k: 'bar', a: pivot, b: add(n, [n[0] - pivot[0], n[1] - pivot[1]], 0.08), z: -1 }, { k: 'plate', at: add(n, [n[0] - pivot[0], n[1] - pivot[1]], 0.06), r: 0.09, z: -1 })
  }
  return out
}

/** Props for a front-view pose: hands [right, left]. */
export function frontLoad(eq, hands, o = {}) {
  const k = kind(eq)
  const [r, l] = hands
  if (k === 'bar') return [{ k: 'barH', at: mixP(r, l, 0.5), z: 1 }]
  if (k === 'db') return [{ k: 'dbH', at: r, z: 1 }, { k: 'dbH', at: l, z: 1 }]
  if (k === 'kb') return [{ k: 'kb', at: r, z: 1 }, { k: 'kb', at: l, z: 1 }]
  if (k === 'cable') return [{ k: 'cable', from: o.anchorR || [r[0] + 0.35, 0.1], to: r, z: -1 }, { k: 'cable', from: o.anchorL || [l[0] - 0.35, 0.1], to: l, z: -1 }]
  if (k === 'band') return [{ k: 'band', from: o.anchorR || [r[0], 0.02], to: r, z: 1 }, { k: 'band', from: o.anchorL || [l[0], 0.02], to: l, z: 1 }]
  if (k === 'ball') return [{ k: 'ball', at: o.ballAt || mixP(r, l, 0.5), r: 0.07, c: 'plateRim', z: 1 }]
  return []
}

/** A flat bench whose top runs from x0 to x1 at height y, with its legs. */
export const bench = (x0, x1, y = 0.36) => [
  { k: 'post', a: [x0 + 0.06, 0], b: [x0 + 0.06, y], z: -1 }, { k: 'post', a: [x1 - 0.06, 0], b: [x1 - 0.06, y], z: -1 },
  { k: 'pad', a: [x0, y], b: [x1, y], w: 0.03, z: -1 },
]
/** A pad from a to b (a seat, a back rest), drawn behind the figure. */
export const pad = (a, b, w = 0.03) => ({ k: 'pad', a, b, w, z: -1 })
