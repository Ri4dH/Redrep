// @vitest-environment happy-dom
// "Share with a friend": the sheet builds the link and hands it to the share sheet (weights and
// name only when switched on), a routine too big for a link goes as a plan file, and a link that
// comes in opens a preview whose Add puts a new routine next to the ones already there.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const m = vi.hoisted(() => {
  const state = { S: null, sheets: [], toasts: [], navs: [], user: null }
  state.store = () => ({
    S: state.S, user: state.user,
    update: mut => { const next = structuredClone(state.S); mut(next); state.S = next },
  })
  return state
})

vi.mock('../store/useStore.js', () => {
  const useStore = sel => (sel ? sel(m.store()) : m.store())
  useStore.getState = m.store
  return { useStore }
})
vi.mock('../store/useUI.js', () => {
  const ui = { openSheet: render => { m.sheets.push(render); return { close: vi.fn() } }, toast: msg => m.toasts.push(msg) }
  const useUI = sel => (sel ? sel(ui) : ui)
  useUI.getState = () => ui
  return { useUI }
})
vi.mock('../lib/nav.js', () => ({ nav: to => m.navs.push(to) }))

import { shareRoutineSheet, openRoutinePayload, _resetRoutineLinksForTests } from './RoutineShare.jsx'
import { routinePayloadFromUrl, decodePayload, encodePayload, routineLinkBundle } from '../lib/routine-link.js'
import { EXIDX } from '../lib/exercises.js'

const BENCH = '0025'
let host, root
const flush = () => act(async () => { for (let i = 0; i < 6; i++) await new Promise(r => setTimeout(r, 0)) })
const render = async el => { await act(async () => { root.render(el) }); await flush() }
const openSheet = async () => { const r = m.sheets.at(-1); await render(<>{r(vi.fn())}</>) }
const click = async el => { await act(async () => { el.click() }); await flush() }
const button = text => [...host.querySelectorAll('button')].find(b => b.textContent.includes(text))
const push = { id: 'r1', name: 'Push Day', ex: [{ id: BENCH, sets: 3, reps: 8, weight: 80 }] }

beforeEach(() => {
  m.S = { unit: 'kg', routines: [push], week: {}, customEx: [], workouts: [] }
  m.sheets = []; m.toasts = []; m.navs = []; m.user = { name: 'Alex' }
  _resetRoutineLinksForTests()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  delete navigator.share
})

// Redrep has no website for a link to open (lib/brand.js LINKS_OFF), so Share hands the routine
// over as a plan file straight away: no sheet, no link.
describe('Share with a friend', () => {
  it('goes as a plan file, without a sheet or a link', async () => {
    const share = vi.fn(() => Promise.resolve())
    navigator.share = share
    let blob = null
    URL.createObjectURL = vi.fn(b => { blob = b; return 'blob:x' }); URL.revokeObjectURL = vi.fn()
    const names = []
    const clicks = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { names.push(this.download) })
    await act(async () => { await shareRoutineSheet(push) })
    expect(m.sheets).toHaveLength(0)
    expect(share).not.toHaveBeenCalled()
    expect(clicks).toHaveBeenCalledTimes(1)
    expect(names[0]).toMatch(/^redrep-routine-\d{4}-\d{2}-\d{2}\.json$/)
    const bundle = JSON.parse(await blob.text())
    expect(JSON.stringify(bundle)).toContain('Push Day')
    clicks.mockRestore()
  })
})

describe('an incoming routine link', () => {
  it('opens a preview, and Add puts a new routine next to yours', async () => {
    const payload = await encodePayload(routineLinkBundle(m.S, push, { weights: true, from: 'Sam' }))
    expect(await openRoutinePayload(payload)).toBe(true)
    await openSheet()
    expect(host.textContent).toContain('Push Day')
    expect(host.textContent).toContain('From Sam')
    await click(button('Add to my routines'))
    expect(m.S.routines).toHaveLength(2)
    expect(m.S.routines[0]).toEqual(push)
    expect(m.S.routines[1].name).toBe('Push Day (from Sam)')
    expect(m.navs.at(-1)).toBe('/plan/r/' + m.S.routines[1].id)
  })

  it('says why a broken or newer link does not open', async () => {
    expect(await openRoutinePayload('1.j.bm9wZQ')).toBe(false)
    expect(m.toasts.at(-1)).toBe('This routine link is broken or cut off.')
    expect(await openRoutinePayload('9.d.abc')).toBe(false)
    expect(m.toasts.at(-1)).toMatch(/newer Redrep/)
    expect(m.sheets).toHaveLength(0)
  })
})
