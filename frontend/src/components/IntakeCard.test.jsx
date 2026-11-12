// @vitest-environment happy-dom
// Redrep's protein, water and supplements card (lib/intake.js) and the pain card on Home
// (views/Pain.jsx): a tap adds to today, a supplement ticks, and the pain card names the worst.
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from '../store/useStore.js'
import { todayISO } from '../lib/format.js'
import IntakeCard from './IntakeCard.jsx'
import { PainHomeCard } from '../views/Pain.jsx'

const go = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => go }))

let host, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const mount = (Card, extra) => {
  useStore.setState(s => ({ S: { ...s.S, unit: 'kg', bodyweight: [{ d: todayISO(), w: 80 }], intake: {}, supplements: [], proteinGoal: null, waterGoal: null, pains: {}, ...extra } }))
  const draw = () => act(() => root.render(<Card S={useStore.getState().S} />))
  draw()
  return draw
}
const tap = label => act(() => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === label).click())

describe('the protein and water card', () => {
  it('aims at 1.8 g per kg and adds a tap to today', () => {
    const draw = mount(IntakeCard, {})
    expect(host.textContent).toContain('0 / 145 g')
    tap('+25 g'); tap('+10 g'); tap('+500 ml')
    draw()
    expect(host.textContent).toContain('35 / 145 g')
    expect(host.textContent).toContain('0.5 / 2.5 L')
    tap('−10')
    expect(useStore.getState().S.intake[todayISO()]).toMatchObject({ p: 25, water: 500 })
  })

  it('ticks a supplement off for today', () => {
    const draw = mount(IntakeCard, { supplements: [{ id: 'c', name: 'Creatine' }] })
    tap('Creatine')
    draw()
    expect(useStore.getState().S.intake[todayISO()].sup).toEqual(['c'])
    expect(host.querySelector('[aria-pressed="true"]').textContent).toContain('Creatine')
  })
})

describe('the pain card', () => {
  it('names the worst of what hurts, and opens the map', () => {
    mount(PainHomeCard, { pains: { deltoids: { lvl: 3, since: todayISO(), log: [[todayISO(), 3]], _ts: 1 }, calves: { lvl: 1, log: [[todayISO(), 1]], _ts: 1 } } })
    expect(host.textContent).toContain('Shoulders · 3/5 · +1')
    act(() => host.querySelector('.pain-card').click())
    expect(go).toHaveBeenCalledWith('/pain')
  })

  it('is a quiet way in when nothing hurts', () => {
    mount(PainHomeCard, {})
    expect(host.textContent).toContain('Something hurting? Mark it on the map.')
  })
})
