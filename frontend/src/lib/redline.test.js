import { describe, it, expect } from 'vitest'
import { redlineOf, bandOf, workSets } from './redline.js'

const set = (extra = {}) => ({ w: 100, r: 5, done: true, ...extra })
const workout = (id, end, sets, prs = []) => ({ id, end, prs, entries: [{ id: 'squat', sets }] })
const past = (n, count) => Array.from({ length: n }, (_, i) => workout('p' + i, 1000 + i, Array.from({ length: count }, () => set())))

describe('workSets', () => {
  it('counts done work sets only, each ticked side on its own', () => {
    const w = workout('w', 5000, [
      set({ warmup: true }),
      set({ phase: 'warmup' }),
      set({ done: false }),
      set(),
      { sides: { L: { done: true, r: 5 }, R: { done: true, r: 5 } } },
      { sides: { L: { done: true, r: 5 }, R: { done: false } } },
    ])
    expect(workSets(w)).toHaveLength(4)
  })
  it('tolerates malformed workouts', () => {
    expect(workSets(null)).toEqual([])
    expect(workSets({ entries: [{ sets: null }] })).toEqual([])
  })
})

describe('redlineOf', () => {
  it('is 0 for a session without a single done work set', () => {
    expect(redlineOf(workout('w', 5000, [set({ done: false })]), past(3, 10)).score).toBe(0)
  })

  it('scores everything at failure, above usual volume, with 3 records as 100', () => {
    const w = workout('w', 5000, Array.from({ length: 13 }, () => set({ rir: 0 })), ['a', 'b', 'c'])
    const r = redlineOf(w, past(5, 10))
    expect(r.score).toBe(100)
    expect(r.band.id).toBe('redline')
  })

  it('reads RPE as RIR and averages only the rated sets', () => {
    const w = workout('w', 5000, [set({ rpe: 8 }), set({ rir: 2 }), set()])
    expect(redlineOf(w, past(3, 3)).parts.effort).toBeCloseTo(1 - 2 / 5)
  })

  it('drops the effort part when nothing was rated and reweights the rest', () => {
    const w = workout('w', 5000, Array.from({ length: 10 }, () => set()))
    const r = redlineOf(w, past(4, 10))
    expect(r.parts.effort).toBeNull()
    // work 10/10/1.25 = 0.8 at 0.35, records 0 at 0.15, over 0.5
    expect(r.score).toBe(Math.round((0.8 * 0.35) / 0.5 * 100))
  })

  it('treats a first ever session as a normal day for the work part', () => {
    const w = workout('w', 5000, [set({ rir: 5 })])
    expect(redlineOf(w, []).parts.work).toBe(0.6)
  })

  it('compares with the median of the last 8 earlier sessions, ignoring later ones and itself', () => {
    const w = workout('w', 5000, Array.from({ length: 10 }, () => set()))
    const later = workout('later', 9000, Array.from({ length: 40 }, () => set()))
    const r = redlineOf(w, [...past(8, 8), later, w])
    expect(r.parts.work).toBeCloseTo(10 / 8 / 1.25)
  })

  it('caps records and effort at 1 and never goes below 0', () => {
    const w = workout('w', 5000, [set({ rir: 9 })], Array(10).fill('pr'))
    const r = redlineOf(w, past(2, 1))
    expect(r.parts.records).toBe(1)
    expect(r.parts.effort).toBe(0)
  })
})

describe('bandOf', () => {
  it('maps scores to bands at their lower edges', () => {
    expect(bandOf(0).id).toBe('easy')
    expect(bandOf(39).id).toBe('easy')
    expect(bandOf(40).id).toBe('solid')
    expect(bandOf(70).id).toBe('hard')
    expect(bandOf(89).id).toBe('hard')
    expect(bandOf(90).id).toBe('redline')
  })
})
