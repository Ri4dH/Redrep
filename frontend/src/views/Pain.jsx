// Redrep's pain and injury map (lib/pain.js): the body map shaded by what hurts, a tap on a
// muscle to say how much, and the list of what hurts with how it has gone since.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, exerciseNameFor, exerciseNameClass } from '../lib/i18n.js'
import { fmtDate, todayISO } from '../lib/format.js'
import { MUSCLE_NAME, muscleWeightsOf } from '../lib/muscles.js'
import { exOr } from '../lib/exercises.js'
import { PAIN_LABEL, PAIN_MAX, activePains, painLevels, painOf, painTrend, painsLoadedBy, withPain } from '../lib/pain.js'
import BodyMap from '../components/BodyMap.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

const TREND = { better: ['arrowDown', 'var(--green)', 'Getting better'], worse: ['arrowUp', 'var(--red)', 'Getting worse'], same: ['minus', 'var(--label-3)', 'No change'] }

function PainLevel({ area, close }) {
  const S = useStore(s => s.S)
  const had = painOf(S, area)
  const [lvl, setLvl] = useState(had?.lvl || 0)
  const save = () => {
    useStore.getState().update(s => { s.pains = withPain(s.pains, area, lvl, todayISO()) })
    useUI.getState().toast(lvl > 0 ? t('Saved. Redrep will flag the exercises that load it.') : t('Marked as healed.'))
    close()
  }
  return <>
    <h3>{t(MUSCLE_NAME[area])}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('How much does it hurt today?')}</div>
    <div className="chips pain-levels" style={{ margin: '0 0 8px' }}>
      {Array.from({ length: PAIN_MAX + 1 }, (_, v) => <button key={v} className={'chip nocap' + (lvl === v ? ' on' : '')} aria-pressed={lvl === v}
        onClick={() => setLvl(v)}>{v}</button>)}
    </div>
    <div className="small" style={{ marginBottom: 14, color: lvl > 0 ? 'var(--orange)' : 'var(--green)' }}>{t(PAIN_LABEL[lvl])}</div>
    {had?.log?.length > 0 && <>
      <h4 className="sec">{t('History')}</h4>
      <div className="list" style={{ gap: 0, marginBottom: 12 }}>
        {had.log.slice(-6).reverse().map(([d, v]) => <div key={d} className="item"><div className="grow"><div className="tt">{fmtDate(d, true)}</div></div><span className="small">{v}/5 · {t(PAIN_LABEL[v])}</span></div>)}
      </div>
    </>}
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
  </>
}

export const painLevelSheet = area => useUI.getState().openSheet(close => <PainLevel area={area} close={close} />)

export default function Pain() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const pains = activePains(S)
  // Today's planned or running exercises that load something that hurts, by name.
  const flagged = (S.active?.entries || []).map(e => e?.id).filter(Boolean)
    .filter((id, i, all) => all.indexOf(id) === i)
    .map(id => ({ id, hurts: painsLoadedBy(pains, muscleWeightsOf(exOr(id))) }))
    .filter(x => x.hurts.length)
  return <>
    <div className="hdr"><button className="iconbtn" data-back="/home" onClick={() => nav(-1)} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginInlineStart: 12 }}><h1>{t('Pain and injuries')}</h1>
        <div className="sub">{t('Tap where it hurts. Redrep flags the exercises that load it and suggests a swap.')}</div></div></div>

    <div className="card">
      <BodyMap className="tappable bm-pain" body={S.body} levels={painLevels(S)} onMuscle={painLevelSheet} />
      <div className="muted small" style={{ textAlign: 'center', marginTop: 6 }}>{t('Yellow is mild, red hurts most.')}</div>
    </div>

    {pains.length > 0
      ? <div className="card">
          <h4 className="sec" style={{ marginTop: 0 }}>{t('What hurts now')}</h4>
          <div className="list" style={{ gap: 0 }}>
            {pains.map(p => {
              const trend = TREND[painTrend(painOf(S, p.area))]
              return <div key={p.area} className="item" role="button" tabIndex={0} onClick={() => painLevelSheet(p.area)}
                onKeyDown={e => { if (e.key === 'Enter') painLevelSheet(p.area) }}>
                <span className="lrow-i" style={{ background: 'var(--orange)' }}><Icon name="warning" /></span>
                <div className="grow"><div className="tt">{t(MUSCLE_NAME[p.area])} · {p.lvl}/5</div>
                  <div className="ss">{t(PAIN_LABEL[p.lvl])}{p.since ? ' · ' + t('since {0}', fmtDate(p.since, true)) : ''}</div></div>
                {trend && <span className="small row" style={{ gap: 3, color: trend[1] }} title={t(trend[2])} aria-label={t(trend[2])}><Icon name={trend[0]} /></span>}
                <Icon name="chevronRight" className="chev" />
              </div>
            })}
          </div>
        </div>
      : <div className="card"><div className="muted small">{t('Nothing hurts. Keep it that way: warm up, and go lighter on a bad day.')}</div></div>}

    {flagged.length > 0 && <div className="card">
      <h4 className="sec" style={{ marginTop: 0 }}>{t('In your workout')}</h4>
      {flagged.map(x => <div key={x.id} className="small" style={{ marginBottom: 4 }}>
        <Icon name="warning" style={{ color: 'var(--orange)', marginInlineEnd: 5, verticalAlign: '-2px' }} />
        <span className={exerciseNameClass(exOr(x.id))}>{exerciseNameFor(exOr(x.id))}</span> · {x.hurts.map(h => t(MUSCLE_NAME[h.area])).join(', ')}
      </div>)}
      <div style={{ height: 6 }} />
      <Button size="sm" icon="play" onClick={() => nav('/workout')}>{t('Resume')}</Button>
    </div>}
  </>
}

/** Home's card while something hurts: the worst of it, one tap from the map. */
export function PainHomeCard({ S }) {
  const nav = useNavigate()
  const pains = activePains(S)
  const worst = pains[0]
  // Nothing hurts: a quiet way in, so the map is there before it is needed.
  if (!worst) return <div className="card tap-host pain-card" role="button" tabIndex={0} onClick={() => nav('/pain')} onKeyDown={e => { if (e.key === 'Enter') nav('/pain') }}>
    <div className="row" style={{ gap: 10 }}>
      <span className="lrow-i" style={{ background: 'var(--surface-3)', color: 'var(--label-2)' }}><Icon name="warning" /></span>
      <div style={{ flex: 1, minWidth: 0 }}><div className="lbl2">{t('Pain and injuries')}</div><div className="ss">{t('Something hurting? Mark it on the map.')}</div></div>
      <Icon name="chevronRight" className="chev" />
    </div>
  </div>
  return <div className="card tap-host pain-card" role="button" tabIndex={0} onClick={() => nav('/pain')} onKeyDown={e => { if (e.key === 'Enter') nav('/pain') }}>
    <div className="row" style={{ gap: 10 }}>
      <span className="lrow-i" style={{ background: 'var(--orange)' }}><Icon name="warning" /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="lbl2">{t('Pain and injuries')}</div>
        <div className="ttl">{t(MUSCLE_NAME[worst.area])} · {worst.lvl}/5{pains.length > 1 ? ' · +' + (pains.length - 1) : ''}</div>
      </div>
      <Icon name="chevronRight" className="chev" />
    </div>
  </div>
}
