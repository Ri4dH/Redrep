// Redrep's own exercise figures: the public face of lib/figure/. An exercise (catalogue entry or
// id) gets a motion from classify.js; frameAt() poses it at a point of its loop, shapesAt() turns
// that into flat shapes (draw.js), and figureSvg() writes one frame as a standalone SVG (print,
// tests). Original artwork drawn by code: nothing here is derived from the licensed exercise
// media (NOTICE.md).

import { drawPose, TONES } from './draw.js'
import { musclesOf } from './muscles.js'
import { classify } from './classify.js'
import { MOTIONS } from './motions.js'
import { breathe } from './geom.js'

const HOLD_TIME = breathe(4)

const cache = new Map()

/** The figure for an exercise: { name, motion, o, eq, mus, seconds, box } or null. */
export function figureFor(ex) {
  if (!ex || typeof ex !== 'object' || ex.custom) return null
  const key = ex.id || ex.n
  if (key && cache.has(key)) return cache.get(key)
  const c = classify(ex)
  let motion = c && MOTIONS[c.name]
  // a held version of a movement ("squat hold"): its pose near the far end, breathing
  if (motion && c.o?.hold != null) { const m = motion, at = c.o.hold; motion = { time: HOLD_TIME, pose: (p, o, eq) => m.pose(at + p * 0.04, o, eq) } }
  const fig = motion ? { name: c.name, motion, o: c.o || {}, eq: ex.eq || 'body weight', mus: musclesOf(ex), seconds: motion.time.seconds } : null
  if (fig) fig.box = frameBox(fig)
  if (key) cache.set(key, fig)
  return fig
}

/** Pose and coaching cue of `fig` at loop time t (0..1). */
export function frameAt(fig, t) {
  const { p, cue } = fig.motion.time.at(t)
  return { pose: fig.motion.pose(p, fig.o, fig.eq), cue }
}

/** The drawing of `fig` at loop time t: { shapes, cue }. */
export function shapesAt(fig, t, opts = {}) {
  const { pose, cue } = frameAt(fig, t)
  return { ...drawPose(pose, fig.mus, opts), cue }
}

/** A square view box that holds the whole loop, the floor at the bottom: [x, y, w, h] (SVG, y down). */
function frameBox(fig) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (let i = 0; i < 12; i++) {
    for (const [x, y] of drawPose(frameAt(fig, i / 12).pose, {}).pts) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
    }
  }
  y0 = Math.min(y0, 0)
  const pad = 0.09
  const w = Math.max(x1 - x0, y1 - y0, 0.8) + pad * 2
  const cx = (x0 + x1) / 2
  // floor near the bottom edge; any room left over goes above the head
  const top = Math.max(y1 + pad, y0 - pad * 0.6 + w)
  return [cx - w / 2, -top, w, w]
}

/** Fixed colours for figureSvg (the dark theme's). */
export const SVG_COLOURS = {
  body: '#cecdd4', far: '#68686e', acc: '#ff1f2f', accFar: '#8c1520', acc2: '#e8868c', acc2Far: '#6e3a3e',
  plate: '#2c2c30', plateRim: '#54545a', steel: '#aaaab0', floor: '#3a3a3e', pad: '#3a3a40', frame: '#4a4a50', band: '#e05a64',
}

/** Fixed colours for a printed page (light). */
export const SVG_LIGHT = {
  body: '#6e6e76', far: '#b4b4bc', acc: '#e0102a', accFar: '#f28a96', acc2: '#b0606a', acc2Far: '#d8a8ae',
  plate: '#d8d8de', plateRim: '#a8a8b0', steel: '#8e8e96', floor: '#d1d1d6', pad: '#d4d4da', frame: '#c4c4cc', band: '#b8001a',
}

/** One frame of an exercise's figure as an SVG document, or null when it has none. */
export function figureSvg(ex, t = 0.5, { colours = SVG_COLOURS, background = '#0e0e10', size = 360, fem = false } = {}) {
  const fig = figureFor(ex)
  if (!fig) return null
  const { shapes } = shapesAt(fig, t, { fem })
  const [x, y, w, h] = fig.box
  const body = shapes.map(s => (s.s
    ? `<path d="${s.d}" fill="none" stroke="${colours[s.s]}" stroke-width="${s.w}" stroke-linecap="round"/>`
    : `<path d="${s.d}" fill="${colours[s.c]}"/>`)).join('')
  const floor = `<rect x="${x}" y="-0.004" width="${w}" height="0.008" fill="${colours.floor}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${size}" height="${size}">`
    + (background ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${background}"/>` : '') + floor + body + '</svg>'
}

export { TONES }
