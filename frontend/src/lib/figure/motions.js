// Every motion a figure can show, by name (classify.js picks one for each exercise).
import { rep } from './geom.js'
import * as legs from './motions-legs.js'
import * as push from './motions-push.js'
import * as pull from './motions-pull.js'
import * as arms from './motions-arms.js'
import * as core from './motions-core.js'
import * as cardio from './motions-cardio.js'
import * as st from './motions-stretch.js'

export const MOTIONS = {
  squat: legs.squat, jumpSquat: legs.jumpSquat, lunge: legs.lunge, stepUp: legs.stepUp,
  hinge: legs.hinge, goodMorning: legs.goodMorning, bridge: legs.bridge, calfRaise: legs.calfRaise,
  legPress: legs.legPress, legExtension: legs.legExtension, legCurl: legs.legCurl, kickback: legs.kickback, abduction: legs.abduction,
  bench: push.benchPress, fly: push.fly, pushUp: push.pushUp, dip: push.dip, press: push.press, raise: push.raise,
  row: pull.row, pullUp: pull.pullUp, sweep: pull.sweep, facePull: pull.facePull,
  crunch: core.crunch, legRaise: core.legRaise, hold: core.hold, climber: core.climber, deadBug: core.deadBug,
  rollout: core.rollout, backExt: core.backExt, superman: core.superman, sideBend: core.sideBend, twist: core.twist, circles: core.circles,
  run: cardio.run, highKnees: cardio.highKnees, walk: cardio.walk, jack: cardio.jack, jumpRope: cardio.jumpRope, burpee: cardio.burpee,
  boxJump: cardio.boxJump, bike: cardio.bike, rower: cardio.rower, battleRope: cardio.battleRope, punch: cardio.punch, kbSwing: cardio.kbSwing,
  olympic: cardio.olympic, sled: cardio.sled,
  stretch: st.stretch, roll: st.roll,
  curl: arms.curl, triceps: arms.triceps, pushdown: { time: rep(0.9, 1.1, 'Press', 'Return'), pose: arms.triceps.pose }, wrist: arms.wrist, cuff: arms.cuff,
}
