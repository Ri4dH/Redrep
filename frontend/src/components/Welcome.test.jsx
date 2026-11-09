// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

const mocks = vi.hoisted(() => ({ S: { workouts: [], routines: [], modules: {} } }))
vi.mock('../store/useStore.js', () => {
  const update = fn => { fn(mocks.S) }
  const useStore = sel => sel({ S: mocks.S, update })
  useStore.getState = () => ({ S: mocks.S, update })
  return { useStore }
})

import Welcome, { needsWelcome, welcomePicked, WELCOME_KEY } from './Welcome.jsx'

let host, root
beforeEach(() => {
  globalThis.__REDREP_NO_WELCOME__ = false
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  mocks.S = { workouts: [], routines: [], modules: {} }
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount()); host.remove()
  globalThis.__REDREP_NO_WELCOME__ = true
})

const buttonText = txt => [...host.querySelectorAll('button')].find(b => b.textContent === txt)

describe('needsWelcome', () => {
  it('is true for a new device with an empty profile', () => {
    expect(needsWelcome({ workouts: [], routines: [] })).toBe(true)
  })
  it('is false once seen, or for a profile that already has data', () => {
    expect(needsWelcome({ workouts: [{ id: 1 }], routines: [] })).toBe(false)
    expect(needsWelcome({ workouts: [], routines: [{ id: 'r' }] })).toBe(false)
    localStorage.setItem(WELCOME_KEY, '1')
    expect(needsWelcome({ workouts: [], routines: [] })).toBe(false)
  })
  it('is false while the test switch is on', () => {
    globalThis.__REDREP_NO_WELCOME__ = true
    expect(needsWelcome({})).toBe(false)
  })
})

describe('Welcome', () => {
  it('walks three steps and applies the picked preset', () => {
    const onDone = vi.fn()
    act(() => root.render(<Welcome onDone={onDone} />))
    expect(host.querySelector('#welcome-title').textContent).toBe('Welcome to Redrep')
    // where the data lives comes first, and nothing on the first screen needs scrolling to
    expect(host.querySelector('.welcome-step').firstElementChild.textContent).toContain('All data stays on this phone')
    expect(host.querySelector('.ex-figure')).toBeNull()
    act(() => buttonText('Next').click())
    expect(host.querySelector('.redline-num').textContent).toBe('82')
    act(() => buttonText('Next').click())
    const presets = host.querySelectorAll('.welcome-preset')
    expect(presets).toHaveLength(3)
    act(() => presets[2].click())
    expect(presets[2].getAttribute('aria-checked')).toBe('true')
    act(() => buttonText('Get started').click())
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(WELCOME_KEY)).toBe('picked')
    expect(welcomePicked()).toBe(true)
    expect(Object.values(mocks.S.modules).every(Boolean)).toBe(true)
  })
  it('Skip leaves the modules as they are and does not come back', () => {
    const onDone = vi.fn()
    mocks.S.modules = { coach: false }
    act(() => root.render(<Welcome onDone={onDone} />))
    act(() => buttonText('Skip').click())
    expect(onDone).toHaveBeenCalled()
    expect(mocks.S.modules).toEqual({ coach: false })
    expect(needsWelcome(mocks.S)).toBe(false)
    expect(welcomePicked()).toBe(false)
  })
})
