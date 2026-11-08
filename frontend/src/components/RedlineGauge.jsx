import { useEffect, useState } from 'react'
import { redlineOf, bandOf } from '../lib/redline.js'
import { t } from '../lib/i18n.js'

// Redrep's Redline gauge: a workout's 0 to 100 intensity (lib/redline.js) as a tachometer, the
// last ten points its red zone. The arc fills from 0 when it first shows; reduced motion shows it
// filled. `history` is the other saved workouts, the score's yardstick for "your usual".
// `value` shows a fixed score instead, without its parts (the welcome's example).

const ARC = 'M10 60 A50 50 0 0 1 110 60'
const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function RedlineGauge({ w, history = [], compact = false, value = null }) {
  const fixed = value != null ? Math.max(0, Math.min(100, Math.round(Number(value) || 0))) : null
  const { score, band, parts } = fixed != null ? { score: fixed, band: bandOf(fixed), parts: null } : redlineOf(w, history)
  const [shown, setShown] = useState(reduceMotion() ? score : 0)
  useEffect(() => {
    if (reduceMotion()) { setShown(score); return undefined }
    const id = requestAnimationFrame(() => setShown(score))
    return () => cancelAnimationFrame(id)
  }, [score])

  const pct = n => (n == null ? null : Math.round(n * 100))
  const bits = !parts ? [] : [
    parts.effort != null && `${t('Effort')} ${pct(parts.effort)}`,
    `${t('Sets')} ${pct(parts.work)}`,
    `${t('PRs')} ${pct(parts.records)}`,
  ].filter(Boolean)

  return <div className={'redline' + (compact ? ' compact' : '') + ' band-' + band.id}
    role="img" aria-label={t('Intensity {0} of 100, {1}', score, t(band.label))}>
    <svg viewBox="0 0 120 66" aria-hidden="true">
      <path d={ARC} pathLength="100" className="redline-track" />
      <path d={ARC} pathLength="100" className="redline-zone" strokeDasharray="10 100" strokeDashoffset="-90" />
      <path d={ARC} pathLength="100" className="redline-fill" strokeDasharray={`${shown} 100`} />
    </svg>
    <div className="redline-read" aria-hidden="true">
      <div className="redline-num">{score}</div>
      <div className="redline-band">{t(band.label)}</div>
    </div>
    {!compact && bits.length > 0 && <div className="redline-parts dim small" aria-hidden="true">{bits.join(' · ')}</div>}
  </div>
}
