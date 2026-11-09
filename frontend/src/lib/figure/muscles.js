// Which parts of a Redrep figure are drawn in the accent for an exercise: its target and main
// group strongly, its secondary muscles softly. The catalogue's muscle words (catalogue/README.md)
// map onto the figure's regions; a word with nothing to show (the heart, for cardio) maps to none.

const REGION = {
  quads: 'thigh', quadriceps: 'thigh', hamstrings: 'thigh', 'hip flexors': 'thigh', adductors: 'thigh',
  'inner thighs': 'thigh', groin: 'thigh',
  glutes: 'glute', abductors: 'glute',
  calves: 'shin', soleus: 'shin', shins: 'shin', ankles: 'shin', 'ankle stabilizers': 'shin', feet: 'foot',
  abs: 'belly', abdominals: 'belly', 'lower abs': 'belly', core: 'belly', obliques: 'belly',
  'lower back': 'back', spine: 'back', 'upper back': 'back', lats: 'back', 'latissimus dorsi': 'back',
  back: 'back', rhomboids: 'back', trapezius: 'back', traps: 'back',
  'levator scapulae': 'neck', sternocleidomastoid: 'neck', neck: 'neck',
  pectorals: 'chest', chest: 'chest', 'upper chest': 'chest', 'serratus anterior': 'chest',
  delts: 'delt', shoulders: 'delt', deltoids: 'delt', 'rear deltoids': 'delt', 'rotator cuff': 'delt',
  biceps: 'upperArm', triceps: 'upperArm', brachialis: 'upperArm',
  forearms: 'forearm', 'grip muscles': 'forearm', 'wrist flexors': 'forearm', 'wrist extensors': 'forearm',
  wrists: 'forearm', hands: 'hand',
}

/** `{ region: 1 | 2 }`: 1 the exercise's main work, 2 a muscle that helps. */
export function musclesOf(ex) {
  const out = {}
  const put = (m, lvl) => { const r = REGION[m]; if (r && !(out[r] <= lvl)) out[r] = lvl }
  for (const m of ex?.sm || []) put(m, 2)
  // the target leads; the main group only when the target has nothing to show (the heart)
  put(ex?.mg, REGION[ex?.tg] ? 2 : 1)
  put(ex?.tg, 1)
  // a cardio drill's target is the heart: show the legs it runs on as its main work
  if (!Object.values(out).includes(1)) {
    const firstLeg = (ex?.sm || []).find(m => ['thigh', 'shin', 'glute'].includes(REGION[m]))
    if (firstLeg) out[REGION[firstLeg]] = 1
  }
  return out
}

export const regionOf = m => REGION[m] || null
