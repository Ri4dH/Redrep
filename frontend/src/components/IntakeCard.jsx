// Redrep's protein, water and supplements card on Home (lib/intake.js): today's totals against
// their goals, a few quick buttons, the supplements to tick off, and a sheet for the goals, the
// list and the reminder.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fmtNum, todayISO, uid } from '../lib/format.js'
import { lastBW } from '../lib/history.js'
import {
  proteinGoalOf, waterGoalOf, supplementsOf, intakeOn, addIntake, toggleSupplement, withSupplement,
  withoutSupplement, shareOf, PROTEIN_STEPS, WATER_STEPS, NAME_MAX, SUPPLEMENTS_MAX,
} from '../lib/intake.js'
import Icon from './Icon.jsx'
import CardHead from './CardHead.jsx'
import { Button, NumberField, Switch } from './ui.jsx'

const LB_KG = 0.45359237
const update = fn => useStore.getState().update(fn)
const bwKgOf = S => { const b = lastBW(S); return b ? (S.unit === 'lb' ? b.w * LB_KG : b.w) : null }
const litres = ml => fmtNum(Math.round(ml / 100) / 10)

function Bar({ share, tint }) {
  return <div className="intake-bar" aria-hidden="true"><div style={{ width: Math.round(share * 100) + '%', background: tint }} /></div>
}

export default function IntakeCard({ S }) {
  const today = todayISO()
  const day = intakeOn(S, today)
  const pGoal = proteinGoalOf(S, bwKgOf(S))
  const wGoal = waterGoalOf(S)
  const sups = supplementsOf(S)
  const add = (what, n) => update(s => { s.intake = addIntake(s.intake, today, what, n) })
  return <div className="card intake-card">
    <CardHead icon="target" tint="var(--blue)" title={t('Protein and water')}
      action={<button className="iconbtn" aria-label={t('Goals and supplements')} onClick={intakeSettingsSheet}><Icon name="gear" /></button>} />
    <div className="intake-row">
      <div className="row between"><span className="small" style={{ fontWeight: 600 }}>{t('Protein')}</span>
        <span className="small">{day.p} / {pGoal} g</span></div>
      <Bar share={shareOf(day.p, pGoal)} tint="var(--acc)" />
      <div className="row intake-btns">
        <Button size="sm" aria-label={t('Remove {0}', '10 g')} onClick={() => add('p', -10)}>−10</Button>
        {PROTEIN_STEPS.map(n => <Button key={n} size="sm" variant="tinted" onClick={() => add('p', n)}>+{n} g</Button>)}
      </div>
    </div>
    <div className="intake-row" style={{ marginTop: 12 }}>
      <div className="row between"><span className="small" style={{ fontWeight: 600 }}>{t('Water')}</span>
        <span className="small">{litres(day.water)} / {litres(wGoal)} L</span></div>
      <Bar share={shareOf(day.water, wGoal)} tint="var(--blue)" />
      <div className="row intake-btns">
        <Button size="sm" aria-label={t('Remove {0}', '250 ml')} onClick={() => add('water', -250)}>−250</Button>
        {WATER_STEPS.map(n => <Button key={n} size="sm" variant="tinted" onClick={() => add('water', n)}>+{n} ml</Button>)}
      </div>
    </div>
    <div style={{ marginTop: 12 }}>
      <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>{t('Supplements')}</div>
      {sups.length
        ? <div className="chips" style={{ margin: 0 }}>
            {sups.map(x => {
              const on = day.sup.includes(x.id)
              return <button key={x.id} className={'chip nocap ichip' + (on ? ' on' : '')} aria-pressed={on}
                onClick={() => update(s => { s.intake = toggleSupplement(s.intake, today, x.id) })}>
                <Icon name={on ? 'checkCircle' : 'dot'} />{x.name}</button>
            })}
          </div>
        : <Button size="sm" variant="ghost" icon="plus" onClick={intakeSettingsSheet}>{t('Add what you take, like creatine')}</Button>}
    </div>
  </div>
}

function IntakeSettings() {
  const S = useStore(s => s.S)
  const [name, setName] = useState('')
  const sups = supplementsOf(S)
  const autoGoal = proteinGoalOf({}, bwKgOf(S))
  const remind = /^\d{2}:\d{2}$/.test(String(S.supReminder || ''))
  const resync = () => import('../lib/intake-notify.js').then(m => m.syncSupplementReminder(useStore.getState().S, true)).catch(() => {})
  const addSup = () => {
    if (!name.trim()) return
    update(s => { s.supplements = withSupplement(s.supplements, name, uid()) })
    setName('')
    resync()
  }
  return <>
    <h3>{t('Goals and supplements')}</h3>
    <label className="intake-field">
      <span>{t('Protein a day (g)')}</span>
      <NumberField nullable decimal={false} value={S.proteinGoal ?? null} placeholder={String(autoGoal)} aria-label={t('Protein a day (g)')}
        onChange={v => update(s => { s.proteinGoal = v > 0 ? v : null })} />
    </label>
    <div className="muted small" style={{ margin: '4px 0 12px' }}>{t('Empty: {0} g, 1.8 g per kg of your body weight.', autoGoal)}</div>
    <label className="intake-field">
      <span>{t('Water a day (ml)')}</span>
      <NumberField nullable decimal={false} value={S.waterGoal ?? null} placeholder="2500" aria-label={t('Water a day (ml)')}
        onChange={v => update(s => { s.waterGoal = v > 0 ? v : null })} />
    </label>
    <h4 className="sec">{t('Supplements')}</h4>
    <div className="list" style={{ gap: 0 }}>
      {sups.map(x => <div key={x.id} className="item"><div className="grow"><div className="tt">{x.name}</div></div>
        <button className="iconbtn" aria-label={t('Remove {0}', x.name)} onClick={() => { update(s => { s.supplements = withoutSupplement(s.supplements, x.id) }); resync() }}><Icon name="trash" /></button></div>)}
    </div>
    {sups.length < SUPPLEMENTS_MAX && <div className="row" style={{ gap: 8, marginTop: 8 }}>
      <input className="field" style={{ flex: 1 }} maxLength={NAME_MAX} value={name} placeholder={t('Creatine, vitamin D…')}
        aria-label={t('Supplement name')} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addSup() }} />
      <Button size="sm" icon="plus" onClick={addSup}>{t('Add')}</Button>
    </div>}
    <div className="row between" style={{ marginTop: 16 }}>
      <span>{t('Daily reminder')}</span>
      <Switch checked={remind} aria-label={t('Daily reminder')} onChange={on => { update(s => { s.supReminder = on ? '09:00' : null }); resync() }} />
    </div>
    {remind && <label className="intake-field" style={{ marginTop: 8 }}>
      <span>{t('Time')}</span>
      <input type="time" className="timef" value={S.supReminder} aria-label={t('Time')}
        onChange={e => { const v = e.target.value; if (/^\d{2}:\d{2}$/.test(v)) { update(s => { s.supReminder = v }); resync() } }} />
    </label>}
    {remind && <div className="muted small" style={{ marginTop: 6 }}>{t('Skipped on a day you already ticked everything off.')}</div>}
  </>
}

export const intakeSettingsSheet = () => useUI.getState().openSheet(() => <IntakeSettings />)
