// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { startFlow } from './sheets.jsx'

// Start opens the quick weigh-in unless Settings → During a workout → "Weigh in before
// workouts" is off (issue #137) — then the session begins at once, with no body weight on it.

describe('the weigh-in before a workout is a setting', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    useUI.setState({ sheets: [], toasts: [] })
    useStore.setState(s => ({ S: { ...s.S, modules: {}, active: null, routines: [], workouts: [], bodyweight: [], weighIn: true } }))
  })

  it('on (the default): Start opens the weigh-in and the session waits for it', () => {
    act(() => startFlow([]))
    expect(useUI.getState().sheets).toHaveLength(1)
    expect(useUI.getState().sheets[0].locked).toBe(true)   // the required weigh-in, not a plain sheet
    expect(useStore.getState().S.active).toBeNull()
  })

  it('a profile written before the setting existed still asks', () => {
    useStore.setState(s => { const S = { ...s.S }; delete S.weighIn; return { S } })
    act(() => startFlow([]))
    expect(useUI.getState().sheets).toHaveLength(1)
    expect(useUI.getState().sheets[0].locked).toBe(true)
    expect(useStore.getState().S.active).toBeNull()
  })

  it('off: Start begins the session at once, with no sheet and no body weight', () => {
    // Redrep's readiness check off too: it is a sheet of its own (below).
    useStore.setState(s => ({ S: { ...s.S, weighIn: false, modules: { readiness: false } } }))
    act(() => startFlow([]))
    expect(useUI.getState().sheets).toHaveLength(0)
    const { active } = useStore.getState().S
    expect(active).not.toBeNull()
    expect(active.bw).toBeNull()
    expect(active.routineIds).toEqual([])
  })

  // Redrep's readiness check (lib/readiness.js): once a day, after the weigh-in.
  it('asks how you feel once a day, and a lighter day takes a set off and stays out of progression', () => {
    const routine = { id: 'r1', name: 'Push', ex: [{ id: '0025', sets: 3, reps: 5, weight: 60 }] }
    useStore.setState(s => ({ S: { ...s.S, weighIn: false, readiness: {}, routines: [routine] } }))
    act(() => startFlow(['r1']))
    expect(useUI.getState().sheets).toHaveLength(1)
    expect(useStore.getState().S.active).toBeNull()
    // Answer the sheet as it renders: a short night, very sore, no energy.
    const sheet = useUI.getState().sheets[0]
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
    const tap = label => act(() => [...host.querySelectorAll('button')].find(b => b.textContent === label).click())
    tap('Poor'); tap('Very sore'); tap('Low')
    expect(host.textContent).toContain('Take it easier today')
    tap('Go lighter')
    const { active, readiness } = useStore.getState().S
    expect(active).not.toBeNull()
    expect(active.noProg).toBe(true)
    expect(active.entries[0].sets.filter(x => !x.warmup && x.phase !== 'warmup')).toHaveLength(2)
    expect(Object.values(readiness)[0]).toMatchObject({ sleep: 0, sore: 0, energy: 0 })
    act(() => root.unmount())
    // Asked once a day: the next start goes straight in.
    useStore.setState(s => ({ S: { ...s.S, active: null } }))
    useUI.setState({ sheets: [] })
    act(() => startFlow(['r1']))
    expect(useUI.getState().sheets).toHaveLength(0)
    expect(useStore.getState().S.active).not.toBeNull()
  })
})
