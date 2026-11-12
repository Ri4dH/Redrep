// Redrep's Max day (lib/max-day.js): pick a lift, warm up to an opener, take up to three
// attempts, and save the heaviest one made as the lift's tested max. The test is logged as a
// workout kept out of progression. The screen keeps its place only while it is open.
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, exerciseNameFor, exerciseNameClass } from '../lib/i18n.js'
import { fmtNum, fmtDate, todayISO } from '../lib/format.js'
import { exOr, EXIDX } from '../lib/exercises.js'
import { barFloor, modeOf } from '../lib/history.js'
import { best1RM } from '../lib/onerm.js'
import { buildLoggedWorkout, appendLoggedWorkout } from '../lib/log-workout.js'
import { openerFor, warmupFor, nextAttempt, resultOf, testOver, testedMaxOf, testedOrBest, withTestedMax, maxDayWorkout, snapWeight, ATTEMPTS } from '../lib/max-day.js'
import { exercisePicker } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button, NumberField } from '../components/ui.jsx'

const ui = () => useUI.getState()
// The rest before the next step: short between light warm-ups, long before and between attempts.
const restFor = share => (share < 0.6 ? 60 : share < 0.85 ? 120 : 180)

/** The lifts worth testing: logged with weight and reps, with an estimate, heaviest first. */
function candidates(S) {
  const ids = [...new Set((S.workouts || []).flatMap(w => (w.entries || []).map(e => e?.id)).filter(Boolean))]
  return ids.map(id => ({ id, best: testedOrBest(S, id, best1RM(S, id)) }))
    .filter(x => x.best?.est > 0 && modeOf(exOr(x.id) || { id: x.id }) === 'reps')
    .sort((a, b) => b.best.est - a.best.est)
    .slice(0, 8)
}

function Pick({ S, onPick }) {
  const list = useMemo(() => candidates(S), [S])
  const pickOther = () => { const p = exercisePicker(ex => { p.close(); onPick(ex.id) }, { title: t('Max day') }) }
  return <>
    <div className="card">
      <div className="muted small" style={{ marginBottom: 10 }}>{t('Pick the lift to test. You warm up to an opener, then take up to three attempts at a single.')}</div>
      {list.length > 0 && <div className="list" style={{ gap: 0 }}>
        {list.map(x => <div key={x.id} className="item" role="button" tabIndex={0} onClick={() => onPick(x.id)} onKeyDown={e => { if (e.key === 'Enter') onPick(x.id) }}>
          <span className="lrow-i" style={{ background: 'var(--yellow)' }}><Icon name="trophy" /></span>
          <div className="grow"><div className={'tt ' + exerciseNameClass(exOr(x.id))}>{exerciseNameFor(exOr(x.id))}</div>
            <div className="ss">{x.best.tested ? t('Tested max {0}', fmtNum(x.best.est) + ' ' + S.unit) : t('Estimated max {0}', fmtNum(Math.round(x.best.est * 10) / 10) + ' ' + S.unit)}</div></div>
          <Icon name="chevronRight" className="chev" />
        </div>)}
      </div>}
      <div style={{ height: 10 }} />
      <Button icon="magnifier" onClick={pickOther}>{t('Change exercise')}</Button>
    </div>
    <div className="muted small" style={{ padding: '0 6px' }}>{t('Test with a spotter or safety bars. Stop at any sharp pain.')}</div>
  </>
}

function Test({ S, exId, onDone }) {
  const unit = S.unit === 'lb' ? 'lb' : 'kg'
  const step = unit === 'lb' ? 5 : 2.5
  const floor = barFloor(S, exId)
  const known = testedOrBest(S, exId, best1RM(S, exId))
  const [guess, setGuess] = useState(known?.est ? Math.round(known.est * 10) / 10 : null)
  const [started] = useState(Date.now())
  const opener = guess > 0 ? openerFor(guess, step, floor) : null
  const [warm, setWarm] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [next, setNext] = useState(null)
  const [lifting, setLifting] = useState(false)
  const rows = warm || (opener ? warmupFor(opener, step, floor).map(r => ({ ...r, done: false })) : [])
  const target = next ?? opener
  const phase = !opener ? 'guess' : lifting ? 'attempts' : 'warmup'

  const tickWarm = i => {
    setWarm(rows.map((r, j) => (j === i ? { ...r, done: !r.done } : r)))
    if (!rows[i].done) ui().startRest(restFor(rows[i].w / opener), null)
  }
  const startAttempts = () => { setWarm(rows); setLifting(true); setNext(opener) }
  const attempt = feel => {
    const w = snapWeight(target, step, floor)
    const list = [...attempts, { w, made: feel !== 'missed' }]
    setAttempts(list)
    if (testOver(list)) { finish(list); return }
    setNext(nextAttempt(w, feel, step))
    ui().startRest(180, null)
  }
  const finish = list => {
    ui().stopRest()
    onDone({ attempts: list, warmups: rows, started, prev: known })
  }

  return <>
    <div className="card">
      <div className="lbl2">{t('Max day')}</div>
      <div className={'ttl ' + exerciseNameClass(exOr(exId))} style={{ fontSize: 'var(--fs-title3)' }}>{exerciseNameFor(exOr(exId))}</div>
      <div className="row" style={{ gap: 8, marginTop: 8, alignItems: 'center' }}>
        <span className="small">{t('Your max now')}</span>
        <NumberField nullable value={guess} aria-label={t('Your max now')} style={{ width: 90 }}
          onChange={v => { if (!lifting) { setGuess(v); setWarm(null); setNext(null) } }} />
        <span className="small">{unit}</span>
      </div>
      <div className="muted small" style={{ marginTop: 4 }}>{known?.est
        ? (known.tested ? t('Tested on {0}.', fmtDate(known.d, true)) : t('Estimated from {0} × {1} on {2}.', fmtNum(known.w), known.r, fmtDate(known.d, true)))
        : t('No estimate yet. Enter your best guess.')}</div>
    </div>

    {phase === 'warmup' && <div className="card">
      <h4 className="sec" style={{ marginTop: 0 }}>{t('Warm-up')}</h4>
      <div className="list" style={{ gap: 0 }}>
        {rows.map((r, i) => <div key={i} className="item" role="button" tabIndex={0} onClick={() => tickWarm(i)} onKeyDown={e => { if (e.key === 'Enter') tickWarm(i) }}>
          <div className="grow"><div className="tt">{fmtNum(r.w)} {unit} × {r.r}</div></div>
          <Icon name={r.done ? 'checkCircle' : 'dot'} style={r.done ? { color: 'var(--green)' } : undefined} />
        </div>)}
      </div>
      <div style={{ height: 10 }} />
      <Button variant="primary" onClick={startAttempts}>{t('On to the attempts')}</Button>
    </div>}

    {phase === 'attempts' && target > 0 && <div className="card max-attempt">
      <div className="lbl2">{t('Attempt {0} of {1}', attempts.length + 1, ATTEMPTS)}</div>
      <div className="big" style={{ fontSize: 44, margin: '6px 0' }}>{fmtNum(snapWeight(target, step, floor))} <span className="muted" style={{ fontSize: 'var(--fs-callout)' }}>{unit}</span></div>
      <div className="row" style={{ gap: 8 }}>
        <Button size="sm" aria-label={t('Decrease by {0}', fmtNum(step))} onClick={() => setNext(Math.max(floor, snapWeight(target - step, step, floor)))}>−{fmtNum(step)}</Button>
        <Button size="sm" aria-label={t('Increase by {0}', fmtNum(step))} onClick={() => setNext(snapWeight(target + step, step, floor))}>+{fmtNum(step)}</Button>
      </div>
      <div style={{ height: 12 }} />
      <Button variant="primary" onClick={() => attempt('easy')}>{t('Made it, felt easy')}</Button>
      <div style={{ height: 8 }} /><Button onClick={() => attempt('hard')}>{t('Made it, it was hard')}</Button>
      <div style={{ height: 8 }} /><Button variant="ghost" onClick={() => attempt('missed')}>{t('Missed it')}</Button>
      {attempts.length > 0 && <>
        <div className="small" style={{ marginTop: 12 }}>{attempts.map((a, i) => <span key={i} style={{ marginInlineEnd: 10, color: a.made ? 'var(--green)' : 'var(--red)' }}>
          <Icon name={a.made ? 'check' : 'xmark'} /> {fmtNum(a.w)}</span>)}</div>
        <div style={{ height: 8 }} /><Button variant="ghost" className="dim" onClick={() => finish(attempts)}>{t('End the test here')}</Button>
      </>}
    </div>}
  </>
}

function Result({ S, exId, run, onSave }) {
  const max = resultOf(run.attempts)
  const prev = run.prev?.est
  return <div className="card">
    <div className="lbl2">{t('Max day')}</div>
    {max
      ? <>
          <div className="ttl" style={{ fontSize: 'var(--fs-title3)' }}>{t('New tested max: {0}', fmtNum(max) + ' ' + S.unit)}</div>
          {prev > 0 && <div className="muted small" style={{ marginTop: 4 }}>{t('Before: {0}', fmtNum(Math.round(prev * 10) / 10) + ' ' + S.unit)}</div>}
          <div className="muted small" style={{ marginTop: 8 }}>{t('Saved to your history and kept out of progression. Programmes use it for their percentages.')}</div>
        </>
      : <div className="muted small">{t('No attempt made this time. The test is still saved to your history.')}</div>}
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={onSave}>{t('Save')}</Button>
  </div>
}

export default function MaxDay() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const [params, setParams] = useSearchParams()
  const asked = params.get('ex')
  const exId = asked && (EXIDX[asked] || (S.customEx || []).some(c => c?.id === asked)) ? asked : null
  const [run, setRun] = useState(null)
  const save = () => {
    const end = Date.now()
    const d = todayISO()
    const input = maxDayWorkout({ exId, d, start: run.started, end, warmups: run.warmups, attempts: run.attempts, name: t('Max day'),
      missedNote: ws => t('Missed: {0}', ws.map(w => fmtNum(w) + ' ' + S.unit).join(', ')) })
    const max = resultOf(run.attempts)
    let failed = false
    useStore.getState().update(s => {
      if (input.exercises[0].sets.length) {
        const built = buildLoggedWorkout(s, input, { now: end, unit: s.unit })
        failed = !built.workout
        if (built.workout) {
          built.workout.excludeFromProgression = true
          built.workout.maxDay = true
          built.workout.entries.forEach(e => { e.noProg = true })
          appendLoggedWorkout(s, built, { now: end, allowDuplicate: true })
        }
      }
      if (max && !failed) s.maxTests = withTestedMax(s.maxTests, exId, max, d)
    })
    if (failed) { ui().toast(t('Could not save')); return }
    ui().toast(max ? t('Tested max saved.') : t('Saved'))
    nav('/history')
  }
  return <>
    <div className="hdr"><button className="iconbtn" data-back="/workout" onClick={() => nav(-1)} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginInlineStart: 12 }}><h1>{t('Max day')}</h1>
        <div className="sub">{t('Find your real one-rep max, not an estimate.')}</div></div></div>
    {!exId ? <Pick S={S} onPick={id => setParams({ ex: id })} />
      : run ? <Result S={S} exId={exId} run={run} onSave={save} />
        : <Test key={exId} S={S} exId={exId} onDone={setRun} />}
    {exId && testedMaxOf(S, exId) && !run && <div className="muted small" style={{ padding: '0 6px' }}>
      {t('Last tested: {0} on {1}', fmtNum(testedMaxOf(S, exId).w) + ' ' + S.unit, fmtDate(testedMaxOf(S, exId).d, true))}</div>}
  </>
}
