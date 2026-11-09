// Picks the motion for an exercise from its catalogue entry: the name first (it says the movement
// and its variant), then the category, body part and target muscle when the name does not.
// Returns { name, o } (a key of motions.js MOTIONS and its options) or null.
//
// The rules run in order and the first that matches wins, so the narrow ones come first: "leg
// curl" before "curl", "split squat" before "squat", "triceps kickback" before "kickback".

const has = (n, re) => re.test(n)
const BAR = /barbell|trap bar|smith/

function squatLoad(n, eq) {
  if (has(n, /overhead/)) return 'overhead'
  if (has(n, /goblet/) || eq === 'medicine ball' || eq === 'weight plate' || eq === 'sandbag') return 'goblet'
  if (has(n, /front|zercher|cross[- ]arm/)) return 'front'
  if (BAR.test(eq) || eq === 'leverage machine' || eq === 'sled machine') return 'back'
  if (eq === 'dumbbell' || eq === 'kettlebell' || eq === 'band' || eq === 'resistance band' || eq === 'cable') return has(n, /front rack/) ? 'front' : 'sides'
  return 'arms'
}

function stretchPose(n, ex) {
  const rules = [
    [/\bcat\b|\bcow\b/, 'catCow'], [/child|balasana|prayer stretch/, 'child'],
    [/cobra|up(ward)?[- ]dog|sphinx|\bseal\b|press[- ]up|mckenzie|prone (press|extension)|bhujang/, 'cobra'],
    [/down(ward)?[- ]dog|\bdog pose|dolphin|\bpike\b|adho mukha/, 'downDog'], [/pigeon/, 'pigeon'],
    [/butterfly|bound angle|\bfrog\b|groin|adductor|straddle|inner thigh|baddha/, 'butterfly'],
    [/knees? to chest|figure[- ]?(4|four)|piriformis|happy baby|glute stretch|hip stretch lying|lying.*(glute|hip)/, 'kneeHug'],
    [/(lying|supine|floor).*(twist|rotation)|windshield|spinal twist|(twist|rotation).*(lying|supine)/, 'lyingTwist'],
    [/hip flexor|kneeling lunge|low lunge|couch|psoas|half[- ]kneeling|lizard/, 'kneelingLunge'],
    [/warrior|crescent|lunge/, 'warrior'],
    [/quad|heel to (butt|glute)|rectus femoris/, 'quad'], [/calf|achilles|soleus|gastroc|ankle|plantar|toe stretch|shin/, 'calf'],
    [/(seated|sitting|sit).*(hamstring|forward|toe|reach|fold)|paschim|(hamstring|forward|toe).*(seated|sitting)/, 'seatedFold'],
    [/hamstring|toe touch|forward (bend|fold)|uttanasana|jefferson|standing fold|rag ?doll/, 'fold'],
    [/chest|pec|doorway|biceps stretch|shoulder extension|arm(s)? behind/, 'chest'],
    [/cross[- ]?body|across|posterior (shoulder|capsule)|sleeper|rear delt|shoulder stretch/, 'crossBody'],
    [/tricep|overhead (arm|reach)/, 'tricepsStretch'],
    [/side (bend|stretch)|\blat\b|lats stretch|lateral|oblique|half moon|triangle|\bgate\b|banana/, 'sideStretch'],
    [/neck (flexion|extension)|chin tuck|\bnod/, 'nod'], [/neck|levator|scalene|trap|sternocleido|\bhead\b|ear to/, 'neck'],
    [/tree|balance|single[- ]leg stand|eagle|dancer|stork|flamingo/, 'balance'], [/camel|kneel|hero|vajra/, 'kneelUp'],
    [/squat|malasana|garland|deep/, 'deepSquat'], [/corpse|savasana|lying|supine|reclin/, 'supine'],
    [/seated|sitting|sit\b|chair/, 'seated'], [/standing|mountain/, 'stand'],
  ]
  for (const [re, pose] of rules) if (re.test(n)) return pose
  const tg = ex.tg || '', bp = ex.bp || ''
  return { hamstrings: 'fold', quads: 'quad', glutes: 'kneeHug', calves: 'calf', pectorals: 'chest', delts: 'crossBody', 'upper back': 'child',
    lats: 'sideStretch', spine: 'child', abs: 'cobra', obliques: 'sideStretch', 'levator scapulae': 'neck', triceps: 'tricepsStretch', biceps: 'chest',
    'hip flexors': 'kneelingLunge', adductors: 'butterfly', abductors: 'kneeHug', traps: 'neck' }[tg]
    || { neck: 'neck', 'lower legs': 'calf', 'upper legs': 'fold', back: 'child', waist: 'sideStretch', chest: 'chest', shoulders: 'crossBody' }[bp] || 'stand'
}

/** Movements that are the same whatever the category: drills, holds, cardio machines. */
function special(n, eq, ex) {
  if (has(n, /foam roll|\broller\b|massage|lacrosse|trigger point|\bsmr\b/) || eq === 'roller' || eq === 'massage ball') {
    const where = has(n, /calf|calves|shin|achilles|soleus/) || ex.bp === 'lower legs' ? 'calf'
      : has(n, /back|spine|thoracic|lat|trap|shoulder|rhomboid/) || ex.bp === 'back' ? 'back' : 'thigh'
    return { name: 'roll', o: { where, ball: eq === 'massage ball' || has(n, /ball/) } }
  }
  if (has(n, /roll[- ]?out|ab wheel|wheel roll/) || eq === 'wheel roller') return { name: 'rollout' }
  if (has(n, /burpee|squat thrust/)) return { name: 'burpee' }
  if (has(n, /jumping jack|star jump|\bjacks?\b/)) return { name: 'jack', o: { seal: has(n, /seal/) } }
  if (has(n, /jump rope|skip(ping)? rope|double under|rope (jump|skip)/)) return { name: 'jumpRope' }
  if (has(n, /box jump|jump (on|onto) (a )?box|depth jump/)) return { name: 'boxJump' }
  if (has(n, /battl(e|ing) rope/)) return { name: 'battleRope' }
  if (has(n, /mountain climber|\bclimbers?\b|bear crawl|crawl/)) return { name: 'climber' }
  if (has(n, /bicycle crunch|bicycle kick|air bike crunch|elbow to (opposite )?knee/)) return { name: 'crunch', o: { kind: 'bicycle' } }
  if (has(n, /bicycle/) && has(n, /crunch|twist|sit|kick|lying/)) return { name: 'crunch', o: { kind: 'bicycle' } }
  if (has(n, /stationary bike|\bbike\b|cycling|cycle\b|spin bike|air bike|assault bike|upper body ergometer/) || eq === 'stationary bike' || eq === 'upper body ergometer') return { name: 'bike' }
  if (has(n, /rowing machine|\brower\b|ergometer|\berg\b|skierg|ski erg/) || eq === 'skierg machine') return { name: 'rower' }
  if (eq === 'elliptical machine' || eq === 'stepmill machine' || has(n, /elliptical|stepmill|stair climb|treadmill walk|incline walk/)) return { name: 'walk' }
  if (has(n, /\b(punch|punches|jab|uppercut|hook|boxing|shadow ?box|speed bag|heavy bag|cross punch)/)) return { name: 'punch' }
  if ((ex.cat === 'combat' || has(n, /kickboxing|roundhouse|axe kick|side kick|front kick|hook kick|crescent kick|push kick|knee kick|leg front kick|muay/)) && has(n, /kick|knee strike/) && !has(n, /lying|kneeling|crunch|swimmer|flutter|scissor|donkey|glute/)) return { name: 'punch', o: { kick: true } }
  if (has(n, /turkish get[- ]?up/)) return { name: 'crunch', o: { kind: 'situp' } }
  if (has(n, /\bswings?\b/) && (eq === 'kettlebell' || eq === 'dumbbell')) return { name: 'kbSwing' }
  if (has(n, /\bslams?\b|overhead (toss|throw)|wall ball/)) return { name: 'olympic', o: { kind: 'thruster' } }
  if (has(n, /chest (pass|throw|push)|(supine|lying).*throw|throw.*(supine|lying)/)) return { name: 'bench', o: { seated: !has(n, /supine|lying/) } }
  if (has(n, /\bdrill\b|ladder|agility|cone/) && !has(n, /stick drill|jump/)) return { name: 'run' }
  if (has(n, /snatch/)) return { name: 'olympic', o: { kind: 'snatch' } }
  if (has(n, /thruster|wall ball/)) return { name: 'olympic', o: { kind: 'thruster' } }
  if (has(n, /\bjerk|push press|push jerk/)) return { name: 'olympic', o: { kind: 'jerk' } }
  if (has(n, /high pull/)) return { name: 'olympic', o: { kind: 'pull' } }
  if (has(n, /\bclean\b|clean and|power clean|hang clean/)) return { name: 'olympic', o: { kind: 'clean' } }
  if ((has(n, /\bsled\b|prowler|\btire\b|\btyre\b/) || eq === 'tire') && !has(n, /press|hack|calf|squat/)) return { name: 'sled', o: { pull: has(n, /pull|drag|row|backward/) } }
  if (has(n, /high knee/)) return { name: 'highKnees' }
  if (has(n, /\b(run|running|jog|jogging|sprint|butt kicks?|[ab][- ]skips?|shuffle|carioca|grapevine)\b/)) return { name: 'run' }
  if (has(n, /\bmarch(ing)?\b|\bwalk(ing)?\b/) && !has(n, /lunge|plank|hand walk|walkout|walk out|band walk|lateral walk|monster/)) return { name: 'walk' }
  if (has(n, /farmer|suitcase carry|\bcarry\b|\bcarries\b|waiter walk|yoke/)) return { name: 'walk' }
  return null
}

function strength(n, eq, ex) {
  const tg = ex.tg || ''
  // --- legs and hips
  if (has(n, /wall sit|wall squat hold/)) return { name: 'hold', o: { kind: 'wallsit' } }
  if (has(n, /bulgarian|rear foot elevated|\brfe\b/)) return { name: 'lunge', o: { kind: 'bulgarian' } }
  if (has(n, /lunge|split squat|split stance|curtsy|step back|scissor (jump|lunge)/)) return { name: 'lunge' }
  if (has(n, /step[- ]?ups?\b|box step/)) return { name: 'stepUp' }
  if (has(n, /leg press|hack press|sled press|calf press/) && !has(n, /calf/)) return { name: 'legPress' }
  if (has(n, /calf|heel raise|toe raise|tibialis|plantar flexion|donkey calf/)) return { name: 'calfRaise', o: { seated: has(n, /seated|sitting/) } }
  if (has(n, /push[- ]?ups?\b|press[- ]?ups?\b|pushups?/)) {
    return { name: 'pushUp', o: { knees: has(n, /knee|kneeling/), incline: has(n, /incline|wall|elevated hand|hands elevated|bench push|box push/), decline: has(n, /decline|feet elevated|pike/), close: has(n, /diamond|close|narrow|triangle/) } }
  }
  if (has(n, /split jump|jump(ing)? lunge|lunge jump|scissor jump/)) return { name: 'lunge' }
  if (has(n, /jump squat|squat jump|tuck jump|\bjumps?\b|\bhops?\b|\bleap|broad jump|pogo|bound(s|ing)?\b|skater|plyo/)) return { name: 'jumpSquat' }
  if (has(n, /squat|pistol|sissy|\bsit to stand|chair stand/)) {
    return { name: 'squat', o: { load: has(n, /sissy|pistol/) ? 'arms' : squatLoad(n, eq), machine: has(n, /hack|machine|lever|pendulum|belt squat/) || eq === 'leverage machine' } }
  }
  if (has(n, /good ?morning/)) return { name: 'goodMorning' }
  if (has(n, /deadlift|\brdl\b|romanian|stiff[- ]leg|rack pull|pull[- ]through|hinge/)) {
    const kind = has(n, /romanian|\brdl\b|pull[- ]through/) ? 'romanian' : has(n, /stiff/) ? 'stiff' : has(n, /sumo/) ? 'sumo'
      : has(n, /rack pull|block pull/) ? 'rack' : has(n, /trap bar|hex/) || eq === 'trap bar' ? 'trap' : 'conventional'
    return { name: 'hinge', o: { kind: has(n, /single|one[- ]leg/) && kind === 'conventional' ? 'romanian' : kind, single: has(n, /single[- ]leg|one[- ]leg|unilateral/) } }
  }
  if (has(n, /hip thrust|glute bridge|\bbridge|hip raise|hip lift|frog pump/)) return { name: 'bridge', o: { kind: has(n, /thrust|bench|elevated/) ? 'thrust' : 'bridge', single: has(n, /single|one[- ]leg|marching/) } }
  if (has(n, /leg extension|knee extension|quad extension/)) return { name: 'legExtension' }
  if (has(n, /leg curl|hamstring curl|nordic|glute[- ]ham|ham raise|\bghr\b/)) return { name: 'legCurl', o: { seated: has(n, /seated|sitting/) } }
  if (has(n, /abduct|hip out|clam|side[- ]lying (leg|hip)|lateral leg raise|side leg raise|monster walk|lateral (band )?walk|band walk|fire hydrant/)) {
    const kind = has(n, /clam/) ? 'clam' : has(n, /lying|side[- ]lying/) ? 'lying' : has(n, /seated|machine|lever/) || eq === 'leverage machine' ? 'seated' : 'standing'
    return { name: 'abduction', o: { kind } }
  }
  if (has(n, /adduct|hip in\b|copenhagen|inner thigh/)) {
    return { name: 'abduction', o: { adduct: true, kind: has(n, /lying|side|copenhagen/) ? 'lying' : has(n, /seated|machine|lever/) || eq === 'leverage machine' ? 'seated' : 'standing' } }
  }
  if (has(n, /kick ?back|donkey kick|glute kick|hip extension|reverse hyper|leg swing/) && !has(n, /tricep/) && tg !== 'triceps') {
    return { name: 'kickback', o: { quadruped: has(n, /donkey|quadruped|all fours|kneeling|bird/), straight: has(n, /straight/) } }
  }
  // --- pushing
  if (has(n, /push[- ]?ups?\b|press[- ]?ups?\b|pushups?/)) {
    return { name: 'pushUp', o: { knees: has(n, /knee|kneeling/), incline: has(n, /incline|wall|elevated hand|hands elevated|bench push|box push/), decline: has(n, /decline|feet elevated|pike/), close: has(n, /diamond|close|narrow|triangle/) } }
  }
  if (has(n, /\bdips?\b/)) return { name: 'dip', o: { bench: has(n, /bench|chair|seated|box|floor/) } }
  if (has(n, /rear delt|reverse fly|reverse flye|reverse pec|bent[- ]over (lateral|raise|fly)|rear raise/)) return { name: 'raise', o: { kind: 'rear' } }
  if (has(n, /\bfly\b|\bflye|\bflyes\b|\bflies\b|crossover|pec deck|butterfly/)) {
    return { name: 'fly', o: { standing: eq === 'cable' || eq === 'band' || eq === 'resistance band' ? !has(n, /lying|bench|incline|decline/) : false, machine: has(n, /pec deck|machine|lever|butterfly/) || eq === 'leverage machine', low: has(n, /low/), mid: has(n, /middle|mid/), incline: has(n, /incline/) ? 35 : has(n, /decline/) ? -15 : 0 } }
  }
  if (has(n, /pull[- ]?over/)) return { name: 'sweep', o: { lying: true } }
  if (has(n, /lateral raise|side raise|lateral delt|\by[- ]raise|\blu raise|side lateral|power partial/)) return { name: 'raise', o: { kind: has(n, /\by[- ]raise/) ? 'y' : 'lateral', seated: has(n, /seated/), single: has(n, /one arm|single arm/) } }
  if (has(n, /front raise|plate raise|front delt raise/)) return { name: 'raise', o: { kind: 'front', seated: has(n, /seated/) } }
  if (has(n, /\braise\b|\braises\b/) && (ex.bp === 'shoulders' || tg === 'delts')) return { name: 'raise', o: { kind: has(n, /rear|bent|prone|lying|incline/) ? 'rear' : has(n, /cross|front|plate/) ? 'front' : 'lateral' } }
  if (has(n, /upright row/)) return { name: 'raise', o: { kind: 'upright' } }
  if (has(n, /shrug/)) return { name: 'raise', o: { kind: 'shrug' } }
  if (has(n, /face pull|band pull[- ]apart|pull[- ]apart/)) return { name: 'facePull' }
  // arms before presses and rows: "close grip bench press" is a bench press, "jm press" is triceps
  if (has(n, /wrist|forearm|finger|pronation|supination|radial|ulnar|hand ?grip|gripper|grip (squeeze|crush|hold|trainer)|plate pinch|pinch grip/) && !has(n, /curl(?!.*wrist)|press|row|pull|raise/)) return { name: 'wrist' }
  if (has(n, /(external|internal|medial|lateral) rotation|rotator|\bcuban\b|scaption/) && !has(n, /hip|leg|knee|ankle|foot|feet|neck|thoracic|trunk|torso/)) return { name: 'cuff', o: { internal: has(n, /internal|medial/) } }
  if (has(n, /curl/) && !has(n, /leg curl|hamstring curl/)) {
    const kind = has(n, /preacher|scott|prone incline/) ? 'preacher' : has(n, /concentration/) ? 'concentration' : has(n, /spider/) ? 'spider'
      : has(n, /incline/) ? 'incline' : has(n, /seated|sitting/) ? 'seated' : 'standing'
    return { name: 'curl', o: { kind } }
  }
  if (has(n, /tricep|skull|french press|jm press|tate press|pushdown|push[- ]down|press[- ]?down/) || (has(n, /extension|kick ?back/) && (tg === 'triceps' || ex.bp === 'upper arms'))) {
    if (has(n, /kick ?back/)) return { name: 'triceps', o: { kind: 'kickback' } }
    if (has(n, /lying|skull|french|tate|jm press|decline|floor/)) return { name: 'triceps', o: { kind: 'lying' } }
    if (has(n, /pushdown|push[- ]down|press[- ]?down/) || (eq === 'cable' && !has(n, /overhead/))) return { name: 'pushdown' }
    return { name: 'triceps', o: { kind: 'overhead', seated: has(n, /seated/) } }
  }
  if (has(n, /bench press|chest press|floor press|incline press|decline press|board press|guillotine|svend|squeeze press|close[- ]grip press|hex press/) || (has(n, /press/) && (ex.bp === 'chest' || tg === 'pectorals'))) {
    return { name: 'bench', o: { incline: has(n, /incline/) ? 35 : has(n, /decline/) ? -15 : 0, floor: has(n, /floor/), seated: has(n, /seated|machine|lever|standing|cable chest press|chest press/) && !has(n, /bench/) } }
  }
  if (has(n, /press|military|arnold|landmine/) && (ex.bp === 'shoulders' || tg === 'delts' || has(n, /shoulder|overhead|military|arnold/))) return { name: 'press', o: { seated: has(n, /seated|sitting|kneeling/) } }
  // --- pulling
  if (has(n, /straight[- ]arm (pull|lat)|lat prayer/)) return { name: 'sweep' }
  if (has(n, /pull[- ]?down|lat pull|pull[- ]down/)) return { name: 'pullUp', o: { pulldown: true } }
  if (has(n, /pull[- ]?ups?\b|chin[- ]?ups?\b|muscle[- ]up|\bchin\b|pullups?/)) return { name: 'pullUp' }
  if (has(n, /\brows?\b|rowing/)) {
    const kind = has(n, /inverted|australian|body row|ring row|trx|suspension|bodyweight row/) || eq === 'suspension trainer' ? 'inverted'
      : has(n, /seated|sitting|cable row|machine|lever|chest[- ]supported|low row|high row/) || eq === 'leverage machine' ? 'seated'
        : has(n, /one[- ]arm|single[- ]arm|kroc|bench row|unilateral/) ? 'single' : has(n, /t[- ]bar|landmine/) ? 'tbar' : 'bent'
    return { name: 'row', o: { kind, floor: kind === 'seated' && eq === 'cable' && !has(n, /machine|bench|high/), chestPad: has(n, /chest[- ]supported|machine|lever/) } }
  }
  // --- core
  if (has(n, /toes to bar|knees to elbows|hanging|captain|dip station|vertical (knee|leg)/)) return { name: 'legRaise', o: { hanging: true, knees: has(n, /knee|tuck/) } }
  if (has(n, /shoulder tap|plank tap|plank jack|plank to/)) return { name: 'hold', o: { kind: 'high' } }
  if (has(n, /neck/) && has(n, /extension|flexion|nod/)) return { name: 'stretch', o: { pose: 'nod' } }
  if (has(n, /\bv[- ]?ups?\b|jack ?knife|toe touch|v[- ]sit up/)) return { name: 'crunch', o: { kind: 'vup' } }
  if (has(n, /reverse crunch|hip roll/)) return { name: 'crunch', o: { kind: 'reverse' } }
  if (has(n, /sit[- ]?ups?\b|curl[- ]?ups?\b|situps?/)) return { name: 'crunch', o: { kind: 'situp', decline: has(n, /decline/) } }
  if (has(n, /crunch/)) return { name: 'crunch', o: { decline: has(n, /decline/) } }
  if (has(n, /leg raise|leg lift|flutter|scissor|knee raise|knee tuck|\btuck\b|leg drop|lying leg/)) return { name: 'legRaise', o: { knees: has(n, /knee|tuck/) } }
  if (has(n, /dead ?bug/)) return { name: 'deadBug' }
  if (has(n, /bird ?dog/)) return { name: 'deadBug', o: { birdDog: true } }
  if (has(n, /superman|swimmer|locust/)) return { name: 'superman' }
  if (has(n, /hyperextension|back extension|back raise|roman chair/)) return { name: 'backExt' }
  if (has(n, /side bend|oblique bend|side crunch|windmill/)) return { name: 'sideBend' }
  if (has(n, /russian twist|seated twist|twist/)) return { name: 'twist', o: { seated: has(n, /russian|seated|sitting|v[- ]sit/) } }
  if (has(n, /wood ?chop|\bchop\b|rotation|pallof|cable lift|torso rot|anti[- ]rot/)) return { name: 'twist' }
  return null
}

const HOLD = /plank|\bhold\b|isometric|hollow|l[- ]sit|dead hang|\bhang\b|bear hold|boat|v[- ]sit/
function holdOf(n) {
  const kind = has(n, /side plank|side bridge|copenhagen/) ? 'side' : has(n, /hollow/) ? 'hollow' : has(n, /l[- ]sit/) ? 'lsit'
    : has(n, /boat|v[- ]sit/) ? 'boat' : has(n, /wall sit/) ? 'wallsit' : has(n, /hang/) ? 'hang' : has(n, /superman/) ? 'superman'
      : has(n, /high plank|straight[- ]arm plank|push[- ]?up (hold|position)|top/) ? 'high' : 'plank'
  return { name: 'hold', o: { kind } }
}

/** What an exercise of this body part and target most likely looks like, when its name says nothing. */
function fallback(ex) {
  const tg = ex.tg || '', bp = ex.bp || '', eq = ex.eq || ''
  if (ex.cat === 'cardio' || bp === 'cardio') return { name: 'run' }
  if (ex.cat === 'plyometrics') return { name: 'jumpSquat' }
  if (ex.cat === 'isometric' || ex.hd) return { name: 'hold' }
  switch (bp) {
    case 'upper legs': return tg === 'hamstrings' ? { name: 'hinge', o: { kind: 'romanian' } } : tg === 'glutes' ? { name: 'bridge' } : tg === 'adductors' || tg === 'abductors' ? { name: 'abduction', o: { adduct: tg === 'adductors' } } : { name: 'squat', o: { load: squatLoad('', eq) } }
    case 'lower legs': return { name: 'calfRaise' }
    case 'waist': return tg === 'obliques' ? { name: 'twist', o: { seated: true } } : { name: 'crunch' }
    case 'back': return tg === 'lats' ? { name: 'pullUp', o: { pulldown: eq !== 'body weight' } } : tg === 'spine' ? { name: 'backExt' } : tg === 'traps' ? { name: 'raise', o: { kind: 'shrug' } } : { name: 'row' }
    case 'chest': return eq === 'body weight' ? { name: 'pushUp' } : { name: 'bench' }
    case 'shoulders': return eq === 'body weight' ? { name: 'circles', o: { arms: true } } : { name: 'press' }
    case 'upper arms': return tg === 'biceps' ? { name: 'curl' } : { name: eq === 'cable' ? 'pushdown' : 'triceps', o: { kind: 'overhead' } }
    case 'lower arms': return { name: 'wrist' }
    case 'neck': return { name: 'stretch', o: { pose: 'neck' } }
    default: return { name: 'squat', o: { load: squatLoad('', eq) } }
  }
}

const STRETCHY = new Set(['stretching', 'mobility', 'yoga'])

/** The motion for an exercise: { name, o } (motions.js), or null for a custom exercise. */
export function classify(ex) {
  if (!ex || ex.custom) return null
  const n = (ex.n || '').toLowerCase()
  const eq = ex.eq || 'body weight'
  const sp = special(n, eq, ex)
  if (sp) return sp
  if (STRETCHY.has(ex.cat) || has(n, /stretch|\bpose\b|asana|mobili[sz]|release/)) {
    if (has(n, /circle|circling/)) return { name: 'circles', o: { arms: has(n, /arm|shoulder|wrist/), hips: has(n, /hip|waist|torso/) } }
    if (has(n, /bird ?dog/)) return { name: 'deadBug', o: { birdDog: true } }
    if (has(n, /dead ?bug/)) return { name: 'deadBug' }
    if (has(n, /bridge|wheel pose|\bbow\b/)) return { name: 'bridge' }
    if (has(n, /plank|chaturanga/)) return holdOf(n)
    if (has(n, /boat|navasana/)) return { name: 'hold', o: { kind: 'boat' } }
    if (has(n, /\bswing|kick/)) return { name: 'kickback' }
    if (has(n, /(standing|seated).*twist|rotation|windmill/) && !has(n, /lying|supine/)) return { name: 'twist', o: { seated: has(n, /seated|sitting/) } }
    if (has(n, /wrist|finger|forearm/)) return { name: 'wrist' }
    return { name: 'stretch', o: { pose: stretchPose(n, ex) } }
  }
  if (HOLD.test(n) && !has(n, /hang(ing)? (leg|knee)|hang clean|hang snatch/)) {
    // "squat hold", "front raise hold", "isometric chin-up": that movement, held near its far end
    if (!has(n, /plank|hollow|l[- ]sit|dead hang|boat|v[- ]sit|bear hold/)) {
      const m = strength(n.replace(HOLD, ' '), eq, ex)
      if (m && m.name !== 'hold') return { name: m.name, o: { ...(m.o || {}), hold: 0.8 } }
    }
    return holdOf(n)
  }
  return strength(n, eq, ex) || fallback(ex)
}

export { stretchPose, special, strength, fallback }
