import { describe, it, expect } from 'vitest'
import { squatPose, squatCycle, motionFor, frameOf, elbowIK, BODY, MIDFOOT_X } from './figure-rig.js'

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

describe('squatPose', () => {
  it('keeps the bar over mid-foot at every depth', () => {
    for (const d of [0, 0.25, 0.5, 0.75, 1]) expect(squatPose(d).bar[0]).toBeCloseTo(MIDFOOT_X, 4)
  })
  it('keeps every segment its own length', () => {
    for (const d of [0, 0.5, 1]) {
      const p = squatPose(d)
      expect(dist(p.ankle, p.knee)).toBeCloseTo(BODY.shin)
      expect(dist(p.knee, p.hip)).toBeCloseTo(BODY.thigh)
      expect(dist(p.hip, p.shoulder)).toBeCloseTo(BODY.torso)
    }
  })
  it('reaches below parallel at the bottom and leans forward more as it goes down', () => {
    const top = squatPose(0), bottom = squatPose(1)
    expect(bottom.hip[1]).toBeLessThan(bottom.knee[1])
    expect(bottom.lean).toBeGreaterThan(top.lean)
    expect(bottom.lean).toBeGreaterThan(25)
    expect(bottom.lean).toBeLessThan(45)
  })
})

describe('elbowIK', () => {
  it('returns an elbow at upper-arm length from the shoulder, bending downward', () => {
    const s = [0, 1], h = [0.1, 1]
    const e = elbowIK(s, h, 0.14, 0.13)
    expect(dist(s, e)).toBeCloseTo(0.14)
    expect(dist(e, h)).toBeCloseTo(0.13)
    expect(e[1]).toBeLessThan(1)
  })
})

describe('squatCycle', () => {
  it('starts and ends standing, braced, and is at the bottom in the middle', () => {
    expect(squatCycle(0)).toEqual({ depth: 0, phase: 'Brace' })
    expect(squatCycle(0.999).phase).toBe('Brace')
    expect(squatCycle(1.8 / 3.2 + 0.01).depth).toBe(1)
    expect(squatCycle(0.3).phase).toBe('Lower')
    expect(squatCycle(0.75).phase).toBe('Drive up')
  })
  it('wraps times outside 0..1', () => {
    for (const t of [1.3, -0.7]) {
      expect(squatCycle(t).phase).toBe(squatCycle(0.3).phase)
      expect(squatCycle(t).depth).toBeCloseTo(squatCycle(0.3).depth, 9)
    }
  })
})

describe('motionFor', () => {
  it('knows the barbell squats and nothing else yet', () => {
    expect(motionFor('3593')).toBeTruthy()
    expect(motionFor('0043')).toBeTruthy()
    expect(motionFor('9999')).toBeNull()
    expect(motionFor(undefined)).toBeNull()
  })
  it('gives a pose and a cue for a cycle time', () => {
    const f = frameOf(motionFor('3593'), 0.5)
    expect(f.joints.knee).toHaveLength(2)
    expect(['Brace', 'Lower', 'Drive up']).toContain(f.phase)
  })
})
