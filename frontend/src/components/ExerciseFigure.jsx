import { useEffect, useRef, useState } from 'react'
import { motionFor, frameOf, BODY } from '../lib/figure-rig.js'
import { t } from '../lib/i18n.js'

// Redrep's code-drawn exercise figure (lib/figure-rig.js): an SVG that loops one rep.
// Reduced motion shows the bottom of the rep, still. Offscreen it stops drawing.
// Colours come from the theme: --fig-body, --fig-far, --fig-plate and the accent for the
// muscles the exercise works.

const FAR_DX = -0.016
const toY = y => 1 - (BODY.ankleH + y)        // figure units, y up -> SVG, y down

function capsule(p1, r1, p2, r2) {
  const x1 = p1[0], y1 = toY(p1[1]), x2 = p2[0], y2 = toY(p2[1])
  const len = Math.hypot(x2 - x1, y2 - y1) || 1
  const nx = -(y2 - y1) / len, ny = (x2 - x1) / len
  const f = n => n.toFixed(4)
  return `M${f(x1 + nx * r1)} ${f(y1 + ny * r1)}L${f(x2 + nx * r2)} ${f(y2 + ny * r2)}`
    + `A${f(r2)} ${f(r2)} 0 1 1 ${f(x2 - nx * r2)} ${f(y2 - ny * r2)}`
    + `L${f(x1 - nx * r1)} ${f(y1 - ny * r1)}A${f(r1)} ${f(r1)} 0 1 1 ${f(x1 + nx * r1)} ${f(y1 + ny * r1)}Z`
}
const shift = (p, dx) => [p[0] + dx, p[1]]
const dot = (p, r, fill) => <circle cx={p[0]} cy={toY(p[1])} r={r} fill={fill} />

function Leg({ j, dx, body, muscle }) {
  const s = p => shift(p, dx)
  return <>
    <path d={capsule(s([-0.018, -0.022]), 0.022, s([0.10, -0.032]), 0.012)} fill={body} />
    <path d={capsule(s(j.ankle), 0.022, s(j.knee), 0.034)} fill={body} />
    <path d={capsule(s(j.knee), 0.036, s(j.hip), 0.054)} fill={muscle} />
  </>
}

function Arm({ j, dx, body }) {
  const s = p => shift(p, dx)
  return <>
    <path d={capsule(s(j.shoulder), 0.027, s(j.elbow), 0.021)} fill={body} />
    <path d={capsule(s(j.elbow), 0.021, s(j.hand), 0.017)} fill={body} />
    {dot(s(j.hand), 0.02, body)}
  </>
}

/** The figure for one pose. Exported for tests and for a still preview. */
export function FigurePose({ joints: j }) {
  const body = 'var(--fig-body)', far = 'var(--fig-far)', acc = 'var(--acc)', accFar = 'var(--fig-acc-far)'
  const chest = [j.shoulder[0] - j.u[0] * 0.1 - j.n[0] * 0.01, j.shoulder[1] - j.u[1] * 0.1 - j.n[1] * 0.01]
  const glute = [j.hip[0] + j.n[0] * 0.02 + j.u[0] * 0.005, j.hip[1] + j.n[1] * 0.02 + j.u[1] * 0.005]
  return <g>
    <rect x={-0.4} y={1 - 0.004} width={0.88} height={0.008} rx={0.004} fill="var(--fig-floor)" />
    {dot(j.bar, BODY.plateR, 'var(--fig-plate-rim)')}
    {dot(j.bar, BODY.plateR - 0.012, 'var(--fig-plate)')}
    {dot(j.bar, 0.034, 'var(--fig-plate-rim)')}
    <Arm j={j} dx={FAR_DX} body={far} />
    <Leg j={j} dx={FAR_DX} body={far} muscle={accFar} />
    <path d={capsule(j.hip, 0.058, j.shoulder, 0.064)} fill={body} />
    {dot(chest, 0.062, body)}
    {dot(glute, 0.056, acc)}
    <path d={capsule(j.shoulder, 0.03, j.head, 0.028)} fill={body} />
    {dot(j.head, BODY.headR, body)}
    <Leg j={j} dx={0} body={body} muscle={acc} />
    <Arm j={j} dx={0} body={body} />
    {dot(j.bar, 0.016, 'var(--fig-steel)')}
  </g>
}

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * The looping figure for exercise `id`, or nothing when it has no motion yet.
 * `cue` shows the phase word (Brace, Lower, Drive up) under the figure.
 */
export default function ExerciseFigure({ id, cue = false, className = '', label }) {
  const m = motionFor(id)
  const ref = useRef(null)
  const [time, setTime] = useState(reduceMotion() ? 0.6 : 0)

  useEffect(() => {
    if (!m || reduceMotion()) return undefined
    let raf = 0, visible = true, start = null
    const io = typeof IntersectionObserver === 'function' && ref.current
      ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop() })
      : null
    function loop() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(now => {
        if (start == null) start = now
        setTime(((now - start) / 1000 / m.seconds) % 1)
        if (visible && !document.hidden) loop()
      })
    }
    const onVis = () => { if (!document.hidden) loop() }
    io?.observe(ref.current)
    document.addEventListener('visibilitychange', onVis)
    loop()
    return () => { cancelAnimationFrame(raf); io?.disconnect(); document.removeEventListener('visibilitychange', onVis) }
  }, [m])

  if (!m) return null
  const f = frameOf(m, time)
  return <figure ref={ref} className={'ex-figure ' + className} role="img" aria-label={label || t('Exercise demonstration')}>
    <svg viewBox="-0.42 0.02 0.92 1.02" aria-hidden="true"><FigurePose joints={f.joints} /></svg>
    {cue && <figcaption className={'ex-figure-cue' + (f.phase === 'Brace' ? ' rest' : '')}>{t(f.phase)}</figcaption>}
  </figure>
}
