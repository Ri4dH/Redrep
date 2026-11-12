// The readiness check before a workout (lib/readiness.js): three rows of three, then what Redrep
// makes of them. Asked once a day, after the weigh-in, when the Readiness check module is on.
// Closing the sheet starts nothing, like the weigh-in's ×; "Skip" starts the workout unasked.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { READINESS_QUESTIONS, VERDICT_COPY, verdictOf, withReadiness } from '../lib/readiness.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

const VERDICT_ICON = { lighter: 'moon', normal: 'checkCircle', push: 'bolt' }
const VERDICT_TINT = { lighter: 'var(--orange)', normal: 'var(--green)', push: 'var(--acc)' }

function Readiness({ close, onDone }) {
  const [a, setA] = useState({})
  const complete = READINESS_QUESTIONS.every(q => a[q.id] != null)
  const verdict = complete ? verdictOf(a) : null
  // Saved with the choice, not on every tap: a sheet closed half-way leaves no half answer.
  const go = lighter => {
    useStore.getState().update(s => { s.readiness = withReadiness(s.readiness, todayISO(), a) })
    close()
    onDone({ lighter })
  }
  return <>
    <div className="row between" style={{ marginBottom: 6 }}>
      <h3 style={{ marginBottom: 0 }}>{t('How do you feel today?')}</h3>
      <button className="iconbtn" aria-label={t('Cancel')} onClick={close}><Icon name="xmark" /></button>
    </div>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('Three taps, and Redrep suggests how hard to go.')}</div>
    {READINESS_QUESTIONS.map(q => <div key={q.id} className="ready-q" role="group" aria-label={t(q.title)}>
      <div className="small" style={{ fontWeight: 600, margin: '10px 0 6px' }}>{t(q.title)}</div>
      <div className="chips" style={{ margin: 0 }}>
        {q.options.map((label, v) => <button key={label} className={'chip nocap' + (a[q.id] === v ? ' on' : '')} aria-pressed={a[q.id] === v}
          onClick={() => setA(x => ({ ...x, [q.id]: v }))}>{t(label)}</button>)}
      </div>
    </div>)}
    {verdict && <div className="card ready-verdict" style={{ marginTop: 16, borderInlineStart: `4px solid ${VERDICT_TINT[verdict]}` }}>
      <div className="row" style={{ gap: 8 }}><Icon name={VERDICT_ICON[verdict]} style={{ color: VERDICT_TINT[verdict] }} />
        <div style={{ fontWeight: 600 }}>{t(VERDICT_COPY[verdict].title)}</div></div>
      <div className="muted small" style={{ marginTop: 4 }}>{t(VERDICT_COPY[verdict].line)}</div>
    </div>}
    <div style={{ height: 14 }} />
    {verdict === 'lighter'
      ? <>
          <Button variant="primary" onClick={() => go(true)}>{t('Go lighter')}</Button>
          <div style={{ height: 8 }} /><Button onClick={() => go(false)}>{t('Train as planned')}</Button>
        </>
      : <Button variant="primary" disabled={!complete} onClick={() => go(false)}>{t('Start workout')}</Button>}
    <div style={{ height: 8 }} />
    <Button variant="ghost" className="dim" onClick={() => { close(); onDone({ lighter: false }) }}>{t('Skip')}</Button>
  </>
}

/** Opens the check; `onDone({ lighter })` starts the workout. */
export const readinessSheet = onDone => useUI.getState().openSheet(close => <Readiness close={close} onDone={onDone} />)
