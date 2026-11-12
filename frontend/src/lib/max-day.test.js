import { describe, expect, it } from 'vitest'
import { snapWeight, openerFor, warmupFor, nextAttempt, resultOf, testOver, testedMaxOf, withTestedMax, testedOrBest, maxDayWorkout } from './max-day.js'

describe('the plan', () => {
  it('opens at 92 % of the estimate, on the grid', () => {
    expect(openerFor(150, 2.5)).toBe(137.5)
    expect(openerFor(100, 5)).toBe(90)
    expect(snapWeight(10, 2.5, 20)).toBe(20)
  })

  it('warms up from the empty bar to the opener, each step heavier, none at the opener', () => {
    const rows = warmupFor(137.5, 2.5, 20)
    expect(rows[0]).toEqual({ w: 20, r: 10 })
    expect(rows.map(r => r.w)).toEqual([20, 55, 75, 97.5, 110, 125])
    expect(rows.every((r, i) => i === 0 || r.w > rows[i - 1].w)).toBe(true)
    expect(rows.every(r => r.w < 137.5)).toBe(true)
  })

  it('drops warm-up steps that land on the same weight for a light opener', () => {
    const rows = warmupFor(25, 2.5, 20)
    expect(rows.map(r => r.w)).toEqual([20, 22.5])
  })
})

describe('the attempts', () => {
  it('jumps more after an easy one, less after a hard one, and repeats a miss', () => {
    expect(nextAttempt(137.5, 'easy', 2.5)).toBe(145)
    expect(nextAttempt(145, 'hard', 2.5)).toBe(147.5)
    expect(nextAttempt(147.5, 'missed', 2.5)).toBe(147.5)
    expect(nextAttempt(40, 'easy', 2.5)).toBe(45)   // at least two steps
  })

  it('keeps the heaviest one made, and ends after three', () => {
    const a = [{ w: 137.5, made: true }, { w: 147.5, made: true }, { w: 152.5, made: false }]
    expect(resultOf(a)).toBe(147.5)
    expect(resultOf([{ w: 100, made: false }])).toBeNull()
    expect(testOver(a)).toBe(true)
    expect(testOver(a.slice(0, 2))).toBe(false)
  })
})

describe('the tested max', () => {
  it('is stored per exercise and read back', () => {
    const m = withTestedMax({}, '0025', 147.5, '2026-11-12', 9)
    expect(m['0025']).toEqual({ w: 147.5, d: '2026-11-12', _ts: 9 })
    expect(testedMaxOf({ maxTests: m }, '0025')).toEqual({ w: 147.5, d: '2026-11-12' })
    expect(withTestedMax(m, '0025', 0, '2026-11-12')).toBe(m)
  })

  it('wins over the estimate until a later session estimates more', () => {
    const S = { maxTests: { x: { w: 140, d: '2026-11-10', _ts: 1 } } }
    expect(testedOrBest(S, 'x', { est: 150, w: 120, r: 6, d: '2026-11-01' })).toMatchObject({ est: 140, tested: true })
    expect(testedOrBest(S, 'x', { est: 138, w: 130, r: 2, d: '2026-11-20' })).toMatchObject({ est: 140, tested: true })
    expect(testedOrBest(S, 'x', { est: 145, w: 130, r: 4, d: '2026-11-20' })).toMatchObject({ est: 145 })
    expect(testedOrBest({}, 'x', { est: 100, d: '2026-11-01' })).toEqual({ est: 100, d: '2026-11-01' })
  })
})

describe('the saved test', () => {
  it('logs the warm-ups done and the attempts made, and notes the misses', () => {
    const start = new Date(2026, 10, 12, 18, 5).getTime()
    const input = maxDayWorkout({
      exId: '0025', d: '2026-11-12', start, end: start + 40 * 60000, name: 'Max day',
      warmups: [{ w: 20, r: 10, done: true }, { w: 60, r: 5, done: false }],
      attempts: [{ w: 137.5, made: true }, { w: 147.5, made: false }],
      missedNote: ws => 'Missed: ' + ws.join(', '),
    })
    expect(input).toEqual({
      date: '2026-11-12', start: '18:05', durationMin: 40, name: 'Max day', note: 'Missed: 147.5',
      exercises: [{ exercise: '0025', sets: [{ reps: 10, weight: 20, warmup: true }, { reps: 1, weight: 137.5 }] }],
    })
  })
})

describe('the saved test’s times', () => {
  it('never ends after it was saved, however short', () => {
    const at = (h, m, sec) => new Date(2026, 10, 12, h, m, sec).getTime()
    for (const [start, end] of [[at(19, 39, 10), at(19, 40, 50)], [at(19, 39, 59), at(19, 40, 1)], [at(18, 0, 0), at(18, 41, 30)]]) {
      const input = maxDayWorkout({ exId: 'x', d: '2026-11-12', start, end, warmups: [], attempts: [{ w: 100, made: true }] })
      const [h, m] = input.start.split(':').map(Number)
      expect(new Date(2026, 10, 12, h, m).getTime() + input.durationMin * 60000).toBeLessThanOrEqual(end)
      expect(input.durationMin).toBeGreaterThanOrEqual(1)
    }
  })
})

