import { describe, expect, it } from 'vitest'
import { readPain, painOf, activePains, withPain, painLevels, painTrend, painsLoadedBy, painFree, LOG_MAX } from './pain.js'

describe('a pain entry', () => {
  it('starts a spell, keeps one level per day, and stays with its log once healed', () => {
    let m = withPain({}, 'deltoids', 4, '2026-11-02', 1)
    expect(m.deltoids).toEqual({ lvl: 4, since: '2026-11-02', log: [['2026-11-02', 4]], _ts: 1 })
    m = withPain(m, 'deltoids', 3, '2026-11-09', 2)
    m = withPain(m, 'deltoids', 2, '2026-11-09', 3)   // the same day again: replaced
    expect(painOf({ pains: m }, 'deltoids')).toEqual({ lvl: 2, since: '2026-11-02', log: [['2026-11-02', 4], ['2026-11-09', 2]] })
    m = withPain(m, 'deltoids', 0, '2026-11-12', 4)
    expect(painOf({ pains: m }, 'deltoids')).toEqual({ lvl: 0, since: null, log: [['2026-11-02', 4], ['2026-11-09', 2], ['2026-11-12', 0]] })
    // Back again: a new spell.
    m = withPain(m, 'deltoids', 1, '2026-11-20', 5)
    expect(m.deltoids.since).toBe('2026-11-20')
  })

  it('ignores unknown areas, bad levels and junk', () => {
    expect(withPain({}, 'elbow', 3, '2026-11-02')).toEqual({})
    expect(withPain({}, 'chest', 7, '2026-11-02')).toEqual({})
    expect(readPain({ lvl: 2, log: [['x', 1], ['2026-11-01', 9], ['2026-11-02', 2]] })).toEqual({ lvl: 2, since: null, log: [['2026-11-02', 2]] })
    expect(readPain(null)).toBeNull()
  })

  it('keeps the newest days of the log', () => {
    let m = {}
    for (let i = 1; i <= LOG_MAX + 5; i++) {
      const d = new Date(2026, 0, i)
      m = withPain(m, 'calves', 1 + (i % 3), d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'), i)
    }
    expect(m.calves.log).toHaveLength(LOG_MAX)
  })
})

describe('what hurts', () => {
  const S = { pains: {
    deltoids: { lvl: 3, since: '2026-11-01', log: [['2026-11-01', 4], ['2026-11-05', 3]], _ts: 1 },
    'lower-back': { lvl: 5, since: '2026-11-03', log: [['2026-11-03', 5]], _ts: 1 },
    calves: { lvl: 0, log: [['2026-10-01', 2], ['2026-10-09', 0]], _ts: 1 },
  } }

  it('lists the areas that hurt, worst first', () => {
    expect(activePains(S)).toEqual([{ area: 'lower-back', lvl: 5, since: '2026-11-03' }, { area: 'deltoids', lvl: 3, since: '2026-11-01' }])
    expect(painLevels(S)).toEqual({ 'lower-back': 4, deltoids: 3 })
  })

  it('says whether it got better', () => {
    expect(painTrend(painOf(S, 'deltoids'))).toBe('better')
    expect(painTrend(painOf(S, 'lower-back'))).toBeNull()
  })

  it('flags an exercise that loads a sore area at half its weight or more', () => {
    const pains = activePains(S)
    expect(painsLoadedBy(pains, { chest: 1, deltoids: 0.5, triceps: 0.5 })).toEqual([{ area: 'deltoids', lvl: 3, since: '2026-11-01' }])
    expect(painsLoadedBy(pains, { chest: 1, deltoids: 0.3 })).toEqual([])
  })

  it('suggests only exercises that load nothing that hurts', () => {
    const pains = activePains(S)
    const list = [{ id: 'press', w: { deltoids: 1 } }, { id: 'dl', w: { 'lower-back': 0.6 } }, { id: 'curl', w: { biceps: 1 } }, { id: 'ext', w: { quadriceps: 1 } }]
    expect(painFree(list, pains, ex => ex.w, 3).map(e => e.id)).toEqual(['curl', 'ext'])
  })
})
