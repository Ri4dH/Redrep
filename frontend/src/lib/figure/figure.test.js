import { describe, it, expect } from 'vitest'
import { EXDB } from '../exercises-data.js'
import { ik, cycle, rep, len, sub } from './geom.js'
import { B, side } from './body.js'
import { classify } from './classify.js'
import { musclesOf } from './muscles.js'
import { MOTIONS } from './motions.js'
import { figureFor, frameAt, shapesAt, figureSvg } from './index.js'

const byName = n => EXDB.find(e => e.n === n)

describe('geometry', () => {
  it('two-bone IK keeps both bones their length and bends to the side asked for', () => {
    const a = [0, 0], c = [0.3, 0]
    const k = ik(a, c, 0.2, 0.2, [0, 1])
    expect(len(sub(k, a))).toBeCloseTo(0.2, 6)
    expect(len(sub(c, k))).toBeCloseTo(0.2, 6)
    expect(k[1]).toBeGreaterThan(0)
    expect(ik(a, c, 0.2, 0.2, [0, -1])[1]).toBeLessThan(0)
  })
  it('a target out of reach straightens the limb toward it', () => {
    const k = ik([0, 0], [1, 0], 0.2, 0.2, [0, 1])
    expect(k[0]).toBeCloseTo(0.2, 3)
    expect(Math.abs(k[1])).toBeLessThan(0.01)
  })
  it('a rep starts and ends at the start position and names its phases', () => {
    const r = rep(1, 1, 'Lower', 'Drive up')
    expect(r.at(0).p).toBe(0)
    expect(r.at(0.999).p).toBeCloseTo(0, 2)
    const cues = new Set(Array.from({ length: 50 }, (_, i) => r.at(i / 50).cue))
    expect([...cues]).toEqual(expect.arrayContaining(['Brace', 'Lower', 'Drive up']))
    expect(cycle([[1, 0, 1, 'A']]).at(0.5).p).toBeCloseTo(0.5, 6)
  })
  it('a standing pose has the legs their length and the feet on the floor', () => {
    const j = side({ hip: [0, B.standHip], torso: 0, legs: { n: { ankle: [0, B.ankleH] } }, arms: { n: { hand: [0, 0.48] } } })
    expect(len(sub(j.n.knee, j.n.hip))).toBeCloseTo(B.thigh, 5)
    expect(len(sub(j.n.ankle, j.n.knee))).toBeCloseTo(B.shin, 5)
    expect(j.n.toe[1]).toBeLessThan(0.02)
  })
})

describe('classify', () => {
  const pick = n => { const c = classify(byName(n)); return c && [c.name, c.o?.kind || c.o?.pose || c.o?.load || null] }
  it('reads the movement and its variant from the name', () => {
    expect(pick('barbell squat')).toEqual(['squat', 'back'])
    expect(pick('barbell front squat')?.slice(0, 2)).toEqual(['squat', 'front'])
    expect(pick('barbell bench press')?.[0]).toBe('bench')
    expect(pick('barbell romanian deadlift')).toEqual(['hinge', 'romanian'])
    expect(pick('push-up')?.[0]).toBe('pushUp')
    expect(pick('pull-up')?.[0]).toBe('pullUp')
    expect(pick('dumbbell lateral raise')).toEqual(['raise', 'lateral'])
    expect(pick('dumbbell biceps curl')?.[0]).toBe('curl')
    expect(pick('lever lying leg curl')?.[0]).toBe('legCurl')
  })
  it('puts the narrow rules first: a leg curl is not a biceps curl, a close grip press is not a wrist curl', () => {
    for (const e of EXDB.filter(e => /leg curl/.test(e.n))) expect(classify(e).name, e.n).toBe('legCurl')
    for (const e of EXDB.filter(e => /close grip bench press/.test(e.n))) expect(classify(e).name, e.n).toBe('bench')
    for (const e of EXDB.filter(e => /split squat/.test(e.n) && e.cat === 'strength')) expect(classify(e).name, e.n).toBe('lunge')
  })
  it('gives every catalogue exercise a motion that exists, and none to a custom one', () => {
    for (const e of EXDB) {
      const c = classify(e)
      expect(MOTIONS[c?.name], e.id + ' ' + e.n).toBeTruthy()
    }
    expect(classify({ custom: true, n: 'my squat' })).toBeNull()
  })
})

describe('muscles', () => {
  it('draws the target strongly and the helpers softly', () => {
    expect(musclesOf({ tg: 'quads', mg: 'quadriceps', sm: ['glutes', 'hamstrings'] })).toEqual({ thigh: 1, glute: 2 })
    expect(musclesOf({ tg: 'pectorals', sm: ['triceps', 'shoulders'] })).toEqual({ chest: 1, upperArm: 2, delt: 2 })
  })
  it('a cardio drill shows the legs it runs on', () => {
    expect(musclesOf({ tg: 'cardiovascular system', sm: ['quadriceps', 'calves'] }).thigh).toBe(1)
  })
})

describe('every exercise draws', () => {
  it('at every point of its loop, with no broken numbers, inside its frame', () => {
    for (const e of EXDB) {
      const f = figureFor(e)
      expect(f, e.n).toBeTruthy()
      const [x, y, w, h] = f.box
      expect(w).toBeGreaterThan(0.5)
      expect(w).toBe(h)
      for (const t of [0, 0.25, 0.5, 0.75]) {
        const { shapes, cue } = shapesAt(f, t)
        expect(typeof cue, e.n).toBe('string')
        for (const s of shapes) expect(s.d, e.n).not.toMatch(/NaN|Infinity/)
        const { pose } = frameAt(f, t)
        expect(pose.head[0], e.n).toBeGreaterThan(x - 0.05)
        expect(pose.head[0], e.n).toBeLessThan(x + w + 0.05)
        expect(-pose.head[1], e.n).toBeGreaterThan(y - 0.1)
      }
    }
  }, 60000)
  it('writes a standalone SVG for print', () => {
    const svg = figureSvg(byName('barbell squat'))
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox=/)
    expect(svg).toContain('#ff1f2f')
    expect(figureSvg({ custom: true })).toBeNull()
  })
})
