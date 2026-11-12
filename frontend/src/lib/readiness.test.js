import { describe, expect, it } from 'vitest'
import { readReadiness, readinessOn, verdictOf, withReadiness, needsReadiness, lighterSession, readinessTrend, readinessScore } from './readiness.js'

const a = (sleep, sore, energy) => ({ sleep, sore, energy })

describe('the readiness answers', () => {
  it('reads back only complete answers of 0, 1 or 2', () => {
    expect(readReadiness({ sleep: 2, sore: 1, energy: 0, _ts: 5 })).toEqual(a(2, 1, 0))
    expect(readReadiness({ sleep: 2, sore: 1 })).toBeNull()
    expect(readReadiness({ sleep: 3, sore: 1, energy: 1 })).toBeNull()
    expect(readReadiness('x')).toBeNull()
  })

  it('is stored per day, stamped, and incomplete answers are not written', () => {
    const map = withReadiness({}, '2026-11-12', a(1, 1, 1), 100)
    expect(map['2026-11-12']).toEqual({ sleep: 1, sore: 1, energy: 1, _ts: 100 })
    expect(withReadiness(map, '2026-11-13', { sleep: 1 }, 200)).toBe(map)
    expect(readinessOn({ readiness: map }, '2026-11-12')).toEqual(a(1, 1, 1))
    expect(needsReadiness({ readiness: map }, '2026-11-12')).toBe(false)
    expect(needsReadiness({ readiness: map }, '2026-11-13')).toBe(true)
    expect(needsReadiness({}, '2026-11-13')).toBe(true)
  })
})

describe('the verdict', () => {
  it('goes lighter on a low score or a short night with no energy', () => {
    expect(verdictOf(a(0, 1, 1))).toBe('lighter')   // 2
    expect(verdictOf(a(0, 2, 0))).toBe('lighter')   // no sleep, no energy, however fresh
    expect(verdictOf(a(1, 1, 1))).toBe('normal')
    expect(verdictOf(a(2, 1, 1))).toBe('normal')    // 4
    expect(verdictOf(a(2, 1, 2))).toBe('push')      // 5
    expect(verdictOf(a(2, 2, 2))).toBe('push')
    expect(verdictOf(null)).toBeNull()
    expect(readinessScore(a(2, 2, 2))).toBe(6)
  })
})

describe('a lighter session', () => {
  const session = () => ({
    entries: [
      { id: 'a', sets: [{ w: 20, r: 10, warmup: true, phase: 'warmup' }, { w: 60, r: 5 }, { w: 60, r: 5 }, { w: 60, r: 5 }] },
      { id: 'b', sets: [{ w: 30, r: 8 }] },
      { id: 'c', sets: [{ w: 40, r: 8, done: true }, { w: 40, r: 8 }, { w: 40, r: 8 }] },
    ],
  })

  it('takes the last open work set off exercises with two or more, never a warm-up or a done set', () => {
    const s = session()
    expect(lighterSession(s)).toBe(2)
    expect(s.entries[0].sets).toHaveLength(3)
    expect(s.entries[0].sets[0].warmup).toBe(true)
    expect(s.entries[1].sets).toHaveLength(1)
    expect(s.entries[2].sets).toHaveLength(2)
    expect(s.entries[2].sets[0].done).toBe(true)
  })

  it('keeps the whole session out of progression', () => {
    const s = session()
    lighterSession(s)
    expect(s.noProg).toBe(true)
    expect(s.entries.every(e => e.noProg === true)).toBe(true)
    expect(s.readiness).toBe('lighter')
  })
})

describe('the trend', () => {
  it('lists the answered days of the window, oldest first', () => {
    const S = { readiness: { '2026-11-10': { ...a(2, 2, 2), _ts: 1 }, '2026-11-12': { ...a(0, 0, 0), _ts: 1 }, '2026-10-01': { ...a(1, 1, 1), _ts: 1 } } }
    expect(readinessTrend(S, '2026-11-12', 7)).toEqual([{ d: '2026-11-10', score: 6 }, { d: '2026-11-12', score: 0 }])
  })
})
