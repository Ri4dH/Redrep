// @vitest-environment happy-dom
// Redrep's lighter day (lib/readiness.js, sheets.jsx beginWorkout): built without progression, so
// the weights stay where the last session left them instead of going up on an easy day.
import { act } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { beginWorkout } from './sheets.jsx'

const routine = { id: 'r1', name: 'Push', ex: [{ id: '0025', sets: 3, reps: 5, weight: 60, prog: 'linear' }] }
const done = { id: 'w1', d: '2026-11-01', start: Date.parse('2026-11-01T18:00:00'), end: Date.parse('2026-11-01T19:00:00'), routineIds: ['r1'],
  entries: [{ id: '0025', rid: 'r1', target: { sets: 3, reps: 5, weight: 60 }, sets: [1, 2, 3].map(() => ({ w: 60, r: 5, done: true })) }] }

const work = () => useStore.getState().S.active.entries[0].sets.filter(s => !s.warmup && s.phase !== 'warmup')

describe('a lighter day', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    useUI.setState({ sheets: [] })
    useStore.setState(s => ({ S: { ...s.S, modules: {}, active: null, routines: [routine], workouts: [done], bodyweight: [], unit: 'kg' } }))
  })

  it('does not raise the weight the way a normal day does, and has a set fewer', () => {
    act(() => beginWorkout(['r1'], null))
    const normal = work()
    useStore.setState(s => ({ S: { ...s.S, active: null } }))
    act(() => beginWorkout(['r1'], null, { lighter: true }))
    const light = work()
    expect(Math.max(...normal.map(s => s.w))).toBeGreaterThan(60)
    expect(light).toHaveLength(normal.length - 1)
    expect(Math.max(...light.map(s => s.w))).toBeLessThanOrEqual(60)
    expect(useStore.getState().S.active.noProg).toBe(true)
  })
})
