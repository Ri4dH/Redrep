import { describe, expect, it } from 'vitest'
import {
  proteinGoalOf, waterGoalOf, supplementsOf, intakeOn, withIntake, addIntake, toggleSupplement,
  withSupplement, withoutSupplement, allTaken, shareOf, supplementNotifications, REMINDER_ID_BASE, SUPPLEMENTS_MAX,
} from './intake.js'

describe('the goals', () => {
  it('takes the profile’s own, else 1.8 g per kg rounded to 5, else the fallbacks', () => {
    expect(proteinGoalOf({ proteinGoal: 160 }, 80)).toBe(160)
    expect(proteinGoalOf({}, 80)).toBe(145)
    expect(proteinGoalOf({}, null)).toBe(140)
    expect(waterGoalOf({ waterGoal: 3000 })).toBe(3000)
    expect(waterGoalOf({})).toBe(2500)
  })
})

describe('a day', () => {
  it('adds protein and water, never below zero, each day on its own stamp', () => {
    let m = addIntake({}, '2026-11-12', 'p', 25, 1)
    m = addIntake(m, '2026-11-12', 'p', 10, 2)
    m = addIntake(m, '2026-11-12', 'water', 500, 3)
    expect(m['2026-11-12']).toEqual({ p: 35, water: 500, sup: [], _ts: 3 })
    m = addIntake(m, '2026-11-12', 'water', -900, 4)
    expect(intakeOn({ intake: m }, '2026-11-12').water).toBe(0)
    expect(intakeOn({ intake: m }, '2026-11-13')).toEqual({ p: 0, water: 0, sup: [] })
    expect(withIntake(m, '2026-11-12', { p: 99999 })['2026-11-12'].p).toBe(1000)
  })

  it('ticks a supplement on and off', () => {
    let m = toggleSupplement({}, '2026-11-12', 'crea', 1)
    expect(intakeOn({ intake: m }, '2026-11-12').sup).toEqual(['crea'])
    m = toggleSupplement(m, '2026-11-12', 'crea', 2)
    expect(intakeOn({ intake: m }, '2026-11-12').sup).toEqual([])
  })
})

describe('the supplements list', () => {
  it('adds, removes and cleans names', () => {
    let l = withSupplement([], '  Creatine ', 'a')
    l = withSupplement(l, '', 'b')
    l = withSupplement(l, 'Vitamin D', 'c')
    expect(l).toEqual([{ id: 'a', name: 'Creatine' }, { id: 'c', name: 'Vitamin D' }])
    expect(withoutSupplement(l, 'a')).toEqual([{ id: 'c', name: 'Vitamin D' }])
    expect(supplementsOf({ supplements: [{ id: 'x' }, 'junk', { id: 'y', name: 'Fish oil' }, { id: 'y', name: 'Twice' }] })).toEqual([{ id: 'y', name: 'Fish oil' }])
    const full = Array.from({ length: SUPPLEMENTS_MAX }, (_, i) => ({ id: 'i' + i, name: 'S' + i }))
    expect(withSupplement(full, 'One more', 'z')).toHaveLength(SUPPLEMENTS_MAX)
  })

  it('knows when everything is taken', () => {
    const S = { supplements: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], intake: { '2026-11-12': { sup: ['a'], _ts: 1 } } }
    expect(allTaken(S, '2026-11-12')).toBe(false)
    S.intake['2026-11-12'].sup.push('b')
    expect(allTaken(S, '2026-11-12')).toBe(true)
    expect(allTaken({}, '2026-11-12')).toBe(true)
    expect(shareOf(50, 200)).toBe(0.25)
    expect(shareOf(500, 200)).toBe(1)
  })
})

describe('the reminder', () => {
  const S = { supReminder: '09:00', supplements: [{ id: 'a', name: 'Creatine' }], intake: {} }

  it('is one a day for a week, skipping a day already ticked off and anything past', () => {
    const now = new Date(2026, 10, 12, 10, 0)   // after today's 09:00
    const n = supplementNotifications(S, now, { title: 'Supplements', body: names => 'Time for ' + names })
    expect(n).toHaveLength(6)
    expect(n[0]).toMatchObject({ id: REMINDER_ID_BASE + 1, title: 'Supplements', body: 'Time for Creatine' })
    expect(n[0].schedule.at.getHours()).toBe(9)
    const early = new Date(2026, 10, 12, 8, 0)
    expect(supplementNotifications(S, early)).toHaveLength(7)
    const ticked = { ...S, intake: { '2026-11-12': { sup: ['a'], _ts: 1 } } }
    expect(supplementNotifications(ticked, early)).toHaveLength(6)
  })

  it('is nothing without a time or a supplement', () => {
    expect(supplementNotifications({ ...S, supReminder: null })).toEqual([])
    expect(supplementNotifications({ ...S, supplements: [] })).toEqual([])
  })
})
