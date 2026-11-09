import { useEffect, useMemo, useRef } from 'react'
import { figureFor, shapesAt, frameAt } from '../lib/figure/index.js'
import { exerciseOf } from '../lib/exercises.js'
import { t } from '../lib/i18n.js'

// Redrep's code-drawn exercise figure (lib/figure/): an SVG that loops one rep of the exercise.
// Every catalogue exercise has one, picked from its name (lib/figure/classify.js). `still` and a
// paused figure show one frame; offscreen it stops drawing. Like the exercise videos it replaces,
// it plays under the system's Reduce Motion too: it is the instruction, not decoration, and a tap
// pauses it.
// Colours come from the theme: --fig-body, --fig-far, --fig-plate and so on, and the accent for
// the muscles the exercise works (index.css).
//
// The loop draws each frame straight into the SVG (no React state per frame): sixty renders a
// second of a list of exercises would cost far more than writing a few dozen paths.

const VAR = {
  body: 'var(--fig-body)', far: 'var(--fig-far)', acc: 'var(--acc)', accFar: 'var(--fig-acc-far)',
  acc2: 'var(--fig-acc-2)', acc2Far: 'var(--fig-acc-2-far)', plate: 'var(--fig-plate)', plateRim: 'var(--fig-plate-rim)',
  steel: 'var(--fig-steel)', floor: 'var(--fig-floor)', pad: 'var(--fig-pad)', frame: 'var(--fig-frame)', band: 'var(--fig-band)',
}
const STILL_T = 0.45
const REST_CUES = new Set(['Brace', 'Hold', 'Breathe'])

/** The SVG markup of one frame's shapes (our own path data and colour tokens only). */
function frameMarkup(fig, time, fem) {
  return shapesAt(fig, time, { fem }).shapes.map(s => (s.s
    ? `<path d="${s.d}" fill="none" stroke="${VAR[s.s]}" stroke-width="${s.w}" stroke-linecap="round"/>`
    : `<path d="${s.d}" fill="${VAR[s.c]}"/>`)).join('')
}

/** Whether an exercise (or id) has a code-drawn figure. */
export const hasFigure = idOrEx => !!figureFor(exerciseOf(idOrEx))

/**
 * The figure for an exercise (`ex`, or its `id`), or nothing when it has none (a custom exercise).
 * `cue` shows the coaching word (Lower, Drive up, Hold…) under it; `still` draws one frame;
 * `playing={false}` pauses it where it is.
 */
export default function ExerciseFigure({ ex, id, cue = false, className = '', label, still = false, playing = true, fem = false }) {
  const exercise = ex || exerciseOf(id)
  const fig = useMemo(() => figureFor(exercise), [exercise])
  const ref = useRef(null), body = useRef(null), cueEl = useRef(null), at = useRef(STILL_T)
  const animate = !!fig && !still
  const first = animate ? 0 : STILL_T
  const markup = useMemo(() => (fig ? frameMarkup(fig, first, fem) : ''), [fig, first, fem])

  useEffect(() => {
    at.current = first
  }, [fig]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!animate || !playing || !body.current) return undefined
    let raf = 0, visible = true, start = null
    const draw = time => {
      at.current = time
      if (body.current) body.current.innerHTML = frameMarkup(fig, time, fem)
      if (cueEl.current) {
        const c = frameAt(fig, time).cue
        if (cueEl.current.dataset.cue !== c) {
          cueEl.current.dataset.cue = c
          cueEl.current.textContent = t(c)
          cueEl.current.classList.toggle('rest', REST_CUES.has(c))
        }
      }
    }
    const io = typeof IntersectionObserver === 'function' && ref.current
      ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { start = null; loop() } }, { rootMargin: '60px 0px' })
      : null
    function loop() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(now => {
        if (start == null) start = now - at.current * fig.seconds * 1000
        draw(((now - start) / 1000 / fig.seconds) % 1)
        if (visible && !document.hidden) loop()
      })
    }
    const onVis = () => { if (!document.hidden) { start = null; loop() } }
    io?.observe(ref.current)
    document.addEventListener('visibilitychange', onVis)
    loop()
    return () => { cancelAnimationFrame(raf); io?.disconnect(); document.removeEventListener('visibilitychange', onVis) }
  }, [fig, animate, playing, fem])

  if (!fig) return null
  const [x, y, w, h] = fig.box
  const firstCue = frameAt(fig, first).cue
  return <figure ref={ref} className={'ex-figure ' + className} role="img" aria-label={label || t('Exercise demonstration')}>
    <svg viewBox={`${x} ${y} ${w} ${h}`} aria-hidden="true" focusable="false">
      <rect x={x} y={-0.004} width={w} height={0.008} rx={0.004} fill={VAR.floor} />
      <g ref={body} dangerouslySetInnerHTML={{ __html: markup }} />
    </svg>
    {cue && <figcaption ref={cueEl} data-cue={firstCue} className={'ex-figure-cue' + (REST_CUES.has(firstCue) ? ' rest' : '')}>{t(firstCue)}</figcaption>}
  </figure>
}
