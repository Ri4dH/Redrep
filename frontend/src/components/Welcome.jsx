import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { PRESETS, applyPreset, presetOf } from '../lib/modules.js'
import { Button } from './ui.jsx'
import ExerciseFigure from './ExerciseFigure.jsx'
import RedlineGauge from './RedlineGauge.jsx'

// Redrep's welcome: three screens before anything else on a new device. What Redrep is, what the
// Redline score means, and how much of the app to start with (a Modules preset, lib/modules.js).
// Shown once per device, and never to a profile that already has workouts or routines.

export const WELCOME_KEY = 'redrep_welcome_v1'
const DEMO_EXERCISE = '3593'   // barbell squat, the figure from lib/figure-rig.js

// '1' skipped, 'picked' finished with a preset picked (the tour's offer then does not ask again).
const read = () => { try { return localStorage.getItem(WELCOME_KEY) } catch { return '1' } }
const seen = () => read() != null
const markSeen = (how = '1') => { try { localStorage.setItem(WELCOME_KEY, how) } catch { /* private mode: shown again, harmless */ } }

/** Whether the welcome's last step already had this device pick a Modules preset. */
export const welcomePicked = () => read() === 'picked'

/** Whether this device should see the welcome: not seen yet, and nothing in the profile. */
export function needsWelcome(S) {
  // The test setup switches it off for every suite that is not about the welcome (test-setup.js).
  if (globalThis.__REDREP_NO_WELCOME__ === true) return false
  if (seen()) return false
  const has = k => Array.isArray(S?.[k]) && S[k].length > 0
  return !has('workouts') && !has('routines')
}

export default function Welcome({ onDone }) {
  const [step, setStep] = useState(0)
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const current = presetOf(S)
  const [pick, setPick] = useState(current === 'custom' ? 'training' : current)
  const finish = () => {
    update(s => { applyPreset(s, pick) })
    markSeen('picked')
    onDone?.()
  }
  const skip = () => { markSeen(); onDone?.() }
  const dots = <div className="welcome-dots" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className={i === step ? 'on' : ''} />)}</div>

  return <div className="welcome narrow" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
    {step < 2 && <div className="welcome-skip"><Button size="sm" variant="ghost" onClick={skip}>{t('Skip')}</Button></div>}

    {step === 0 && <div className="welcome-step">
      <ExerciseFigure id={DEMO_EXERCISE} cue className="welcome-fig" />
      <h1 id="welcome-title" className="welcome-title">{t('Welcome to Redrep')}</h1>
      <p className="welcome-text">{t('Plan your week, log every set and watch yourself get stronger. No account, no ads, no tracking.')}</p>
    </div>}

    {step === 1 && <div className="welcome-step">
      <RedlineGauge value={82} />
      <h1 id="welcome-title" className="welcome-title">{t('Every workout gets a Redline')}</h1>
      <p className="welcome-text">{t('A score from 0 to 100 for how hard you trained: your effort, your sets against your usual, and your records.')}</p>
    </div>}

    {step === 2 && <div className="welcome-step">
      <h1 id="welcome-title" className="welcome-title">{t('How much do you want to see?')}</h1>
      <div className="welcome-presets" role="radiogroup" aria-labelledby="welcome-title">
        {PRESETS.map(p => <button key={p.id} type="button" role="radio" aria-checked={pick === p.id}
          className={'welcome-preset' + (pick === p.id ? ' on' : '')} onClick={() => setPick(p.id)}>
          <span className="welcome-preset-t">{t(p.title)}</span>
          <span className="welcome-preset-d">{t(p.desc)}</span>
        </button>)}
      </div>
      <p className="welcome-text dim">{t('You can switch any part on or off later in Settings → Modules.')}</p>
    </div>}

    <div className="welcome-foot">
      {dots}
      {step < 2
        ? <Button variant="primary" onClick={() => setStep(step + 1)}>{t('Next')}</Button>
        : <Button variant="primary" onClick={finish}>{t('Get started')}</Button>}
    </div>
  </div>
}
