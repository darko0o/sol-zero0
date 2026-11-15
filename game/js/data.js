// SOL ZERO — v4 data: Martian palette, wide ARES-1 dome, 8-Sol progressive campaign,
// meals & variety, crops, science lab, regions, REMS weather, tutorials and difficulty curves.
const WORLD = {
  width: 3500,
  ground: 428,
  dome: { x: 755, rx: 605, ry: 196, left: 150, right: 1360 }
};

const SYSTEMS = {
  life:   { name: 'LIFE SUPPORT',   short: 'VITAL',   color: '#ff9f45' },
  energy: { name: 'POWER GRID',     short: 'POWER',   color: '#f2d6b3' },
  comms:  { name: 'COMMUNICATIONS', short: 'COMMS',   color: '#e0a878' },
  water:  { name: 'PURE WATER',     short: 'WATER',   color: '#d98a5f' },
  food:   { name: 'HYDROPONICS',    short: 'CROPS',   color: '#e8622a' },
  waste:  { name: 'RECYCLING',      short: 'WASTE',   color: '#b0a091' }
};

// Electrical Budget Subsystems (NASA: Martian Dust Storms & Load Priority)
const POWER_LOADS = {
  eclss:      { id: 'eclss',      name: 'ECLSS LIFE SUPPORT',      kw: 3.2, priority: 'CRITICAL', desc: 'CO₂ scrubbing, cabin pressure & O₂ regulation' },
  greenhouse: { id: 'greenhouse', name: 'CROP GROW LIGHTS',        kw: 2.8, priority: 'HIGH',     desc: 'Keeps the hydroponic harvest alive' },
  lab:        { id: 'lab',        name: 'LAB & X-BAND TELEMETRY',  kw: 2.2, priority: 'MEDIUM',   desc: 'Science instruments and Earth uplink' },
  rover:       { id: 'rover',     name: 'ROVER-2 CHARGING DOCK',   kw: 1.8, priority: 'LOW',      desc: 'Powers the external vehicle capacitor bank' }
};

// ============================================================================
// ONE-TIME TUTORIALS (docked side panel, pauses the sim & protects from Stalkers)
// Each entry owns a small animated Canvas demo: tutorialDemo(mode, ctx, t)
// ============================================================================
const TUTORIALS = {
  meal: {
    kicker: 'NEW MECHANIC · SOL 01',
    npc: 'DR. INÉS VELA', npcRole: 'FLIGHT SURGEON',
    title: 'EATING WELL',
    desc: 'Food is morale. Eat once per Sol.',
    steps: [
      'Walk to the MESS GALLEY inside the dome.',
      'Press [E] to open today\'s rations.',
      'Pick a ration you did not eat yesterday.',
      'Repeat the same meal 3 times and MENU FATIGUE slows every task by 50%.'
    ],
    keys: 'E · OPEN GALLEY',
    demo: 'meal'
  },
  water: {
    kicker: 'NEW MECHANIC · SOL 02',
    npc: 'ENG. TOMÁS RÍOS', npcRole: 'SYSTEMS ENGINEER',
    title: 'WATER PURIFIER',
    desc: 'Martian ice is full of toxic perchlorates.',
    steps: [
      'Reach the H₂O PURIFIER (x 470).',
      'Click the glowing ClO₄ toxins with the UV laser.',
      'Let clean H₂O droplets reach the membrane.',
      'Reach 100% purity before toxicity fills the tank.'
    ],
    keys: 'MOUSE · FIRE UV LASER',
    demo: 'water'
  },
  eclss: {
    kicker: 'NEW MECHANIC · SOL 03',
    npc: 'DR. INÉS VELA', npcRole: 'FLIGHT SURGEON',
    title: 'AIR YOU CAN BREATHE',
    desc: 'Full oxygen can still hide lethal CO₂.',
    steps: [
      'Watch O₂ reserve, pressure and air CO₂.',
      'If CO₂ rises, open ECLSS [V] or click the AIR panel.',
      'Isolate the greenhouse, spend a spare filter, or purge with O₂.',
      'Repair the ECLSS console (x 620) to restore scrubbing.'
    ],
    keys: 'V · ECLSS PANEL',
    demo: 'eclss'
  },
  power: {
    kicker: 'NEW MECHANIC · SOL 04',
    npc: 'ENG. TOMÁS RÍOS', npcRole: 'SYSTEMS ENGINEER',
    title: 'POWER BUDGET',
    desc: 'Dust kills solar output, not the wind.',
    steps: [
      'Storms and dust on the panels reduce generation.',
      'Open POWER [B] or click the POWER ring.',
      'Shed low-priority loads so life support keeps running.',
      'Clean the array at x 1700 after the storm.'
    ],
    keys: 'B · POWER PANEL',
    demo: 'power'
  },
  rest: {
    kicker: 'NEW MECHANIC · SOL 05',
    npc: 'CMDR. YUKI HIRAOKA', npcRole: 'MISSION COMMANDER',
    title: 'SLEEP OR FINISH',
    desc: 'Exhaustion makes every repair slower.',
    steps: [
      'Fatigue climbs while you work and sprint.',
      'At the BUNKS (x 770) choose: nap, sleep until dawn, or keep working.',
      'Above 42% fatigue every repair asks for a double safety check.',
      'Sleep well before Sol ZERO.'
    ],
    keys: 'Z · REST PANEL',
    demo: 'rest'
  },
  garden: {
    kicker: 'NEW MECHANIC · SOL 06',
    npc: 'DR. INÉS VELA', npcRole: 'BOTANIST & SURGEON',
    title: 'THE GREENHOUSE',
    desc: 'Grow your own food, plot by plot.',
    steps: [
      'Open the GREENHOUSE console (x 1070).',
      'Plant one of the four crops in an empty plot.',
      'Each crop needs water, power and time to ripen.',
      'Harvest to refill rations, then upgrade the garden to level 3.'
    ],
    keys: 'E · GARDEN CONSOLE',
    demo: 'garden'
  },
  lab: {
    kicker: 'NEW MECHANIC · SOL 06',
    npc: 'DR. INÉS VELA', npcRole: 'SCIENCE OFFICER',
    title: 'SPECTROMETER LAB',
    desc: 'One scan makes every machine better.',
    steps: [
      'Enter the LAB (x 1220) and run a spectral scan.',
      'Press [SPACE] or click when the sample band enters the target.',
      'Complete five samples to raise MACHINE EFFICIENCY.',
      'Higher efficiency slows wear on every system.'
    ],
    keys: 'SPACE · TAKE SAMPLE',
    demo: 'lab'
  },
  comms: {
    kicker: 'NEW MECHANIC · SOL 07',
    npc: 'CMDR. YUKI HIRAOKA', npcRole: 'MISSION COMMANDER',
    title: 'X-BAND UPLINK',
    desc: 'Earth is twelve light-minutes away.',
    steps: [
      'Reach the X-BAND antenna (x 2280).',
      'Use [A/D] for carrier frequency and [W/S] for phase.',
      'Overlap both waves to charge SIGNAL LOCK to 100%.',
      'The uplink proves the dome is still alive.'
    ],
    keys: 'A D W S · TUNE WAVE',
    demo: 'comms'
  },
  pipes: {
    kicker: 'ECLSS CONSOLE',
    npc: 'ENG. TOMÁS RÍOS', npcRole: 'SYSTEMS ENGINEER',
    title: 'CONDUIT BYPASS',
    desc: 'Route power from the battery to ECLSS.',
    steps: [
      'Click any conduit tile to rotate it 90°.',
      'Energized conduits glow orange.',
      'Connect the battery on the left to the node on the right.',
      'Click a tile no more than twice; think the path first.'
    ],
    keys: 'MOUSE · ROTATE TILE',
    demo: 'pipes'
  },
  food: {
    kicker: 'NUTRIENT SYNTHESIS',
    npc: 'DR. INÉS VELA', npcRole: 'BOTANIST',
    title: 'CROP BOOSTER',
    desc: 'A perfect mix makes plants grow faster.',
    steps: [
      'Press [SPACE] when the cursor enters the lit zone.',
      'Three stages, each slightly faster.',
      'Three misses abort the batch.',
      'Success boosts greenhouse growth and repairs crop faults.'
    ],
    keys: 'SPACE · INJECT',
    demo: 'food'
  },
  solar: {
    kicker: 'SOLAR ARRAY',
    npc: 'ENG. TOMÁS RÍOS', npcRole: 'SYSTEMS ENGINEER',
    title: 'CLEAN THE PANELS',
    desc: 'Deposited dust blinds the cells.',
    steps: [
      'Click all 9 dust spots on the solar cells.',
      'Use [A/D] or click the slider to match the sun angle.',
      'Hold the angle until charge reaches 100%.',
      'Storm dust in the air still lowers output.'
    ],
    keys: 'A D · TILT PANELS',
    demo: 'solar'
  },
  waste: {
    kicker: 'INCINERATOR',
    npc: 'ENG. TOMÁS RÍOS', npcRole: 'SYSTEMS ENGINEER',
    title: 'SORT THE WASTE',
    desc: 'Recycling keeps CO₂ and trash low.',
    steps: [
      'Read the item in the center.',
      '[A] organic · [W] metal · [D] toxic.',
      'Sort 8 items before 3 errors.',
      'Fast sorting recovers extra power.'
    ],
    keys: 'A W D · SORT',
    demo: 'waste'
  },
  reactor: {
    kicker: 'THERMAL REACTOR',
    npc: 'CMDR. YUKI HIRAOKA', npcRole: 'MISSION COMMANDER',
    title: 'COOLANT VALVES',
    desc: 'Keep all three valves in the safe band.',
    steps: [
      'Click a column or press [1] [2] [3].',
      'Centering a valve reverses its drift.',
      'Hold all three inside the orange band.',
      'Stability must reach 100%.'
    ],
    keys: '1 2 3 · VALVES',
    demo: 'reactor'
  },
  rover: {
    kicker: 'ROVER-2 DOCK',
    npc: 'ENG. TOMÁS RÍOS', npcRole: 'SYSTEMS ENGINEER',
    title: 'SUIT RECHARGE',
    desc: 'Borrow power from the rover bank.',
    steps: [
      'Click a node, or press [1] to [6], while it glows.',
      'Reach 100% transfer before time runs out.',
      'Reward: +1 shield, +25% O₂, +18% power.',
      'The rover dock must be ON in the power budget.'
    ],
    keys: '1–6 · DISCHARGE',
    demo: 'rover'
  },
  powerstorm: {
    kicker: 'WARNING · REMS',
    npc: 'CMDR. YUKI HIRAOKA', npcRole: 'MISSION COMMANDER',
    title: 'DUST STORM INBOUND',
    desc: 'The array will fade. The dome must not.',
    steps: [
      'Open POWER [B] and shed the rover dock and lab.',
      'Keep ECLSS online at all costs.',
      'Storms deposit dust: clean the array afterwards.',
      'Never let the battery reach zero.'
    ],
    keys: 'B · SHED LOADS',
    demo: 'power'
  },
  emotion: {
    kicker: 'CREW QUARTERS',
    npc: 'DR. INÉS VELA', npcRole: 'FLIGHT SURGEON',
    title: 'CREW WELLBEING',
    desc: 'Isolation is a system too.',
    steps: [
      'Visit the CREW QUARTERS (x 920) once per Sol.',
      'Pick a short conversation with the crew.',
      'Morale recovers and repairs go faster.',
      'Low morale causes heavy breathing and slow movement.'
    ],
    keys: 'E · TALK',
    demo: 'emotion'
  }
};

const DIFFICULTIES = {
  story: {
    id: 'story',
    name: 'CADET',
    sub: 'Story · gentle decay · 1 slow Stalker drone',
    decayMult: 0.68, radMult: 0.72, o2DrainMult: 0.78, stressMult: 0.65,
    miniTimeBonus: 8, enemyCountBase: 1, enemySpeedMult: 0.75,
    enemyDmgMult: 0.65, glitchChance: 0
  },
  normal: {
    id: 'normal',
    name: 'TECHNICIAN',
    sub: 'Standard ARES-7 · balanced · active exterior threat',
    decayMult: 1.0, radMult: 1.0, o2DrainMult: 1.0, stressMult: 1.0,
    miniTimeBonus: 0, enemyCountBase: 1, enemySpeedMult: 1.0,
    enemyDmgMult: 1.0, glitchChance: 0.008
  },
  hard: {
    id: 'hard',
    name: 'SURVIVAL',
    sub: 'Hard · heavy wear · 2 Stalkers · tighter timers',
    decayMult: 1.35, radMult: 1.3, o2DrainMult: 1.22, stressMult: 1.32,
    miniTimeBonus: -5, enemyCountBase: 2, enemySpeedMult: 1.22,
    enemyDmgMult: 1.3, glitchChance: 0.018
  },
  extreme: {
    id: 'extreme',
    name: 'SOL ZERO',
    sub: 'Extreme · 3 lethal Stalkers · random faults',
    decayMult: 1.65, radMult: 1.55, o2DrainMult: 1.4, stressMult: 1.6,
    miniTimeBonus: -8, enemyCountBase: 3, enemySpeedMult: 1.42,
    enemyDmgMult: 1.6, glitchChance: 0.032
  }
};

const EMOTIONAL_STATES = [
  { min: 76, id: 'firme',   label: 'STEADY RESOLVE', color: '#ff9f45', speedMult: 1.06, o2Mult: 0.92, desc: 'Clear mind and steady hands' },
  { min: 48, id: 'estable', label: 'TENSION',        color: '#e0a878', speedMult: 1.00, o2Mult: 1.00, desc: 'Focused under pressure' },
  { min: 25, id: 'ansioso', label: 'ANXIETY',        color: '#d98a5f', speedMult: 0.91, o2Mult: 1.20, desc: 'Rapid breathing · Tense hands' },
  { min: 0,  id: 'panico',  label: 'CRITICAL PANIC', color: '#e04b3a', speedMult: 0.80, o2Mult: 1.48, desc: 'Hyperventilation · Collapse risk' }
];

const EMOTIONAL_MOMENTS = [
  {
    sol: 1,
    who: 'ENG. TOMÁS RÍOS · MEDICAL BAY',
    title: 'The weight of the wrench',
    prompt: 'Ríos sits up on the cot with his right arm immobilized. He looks at your dust-covered helmet and smiles wearily.\n\n"Come here, Spark. Stop clenching your jaw like that. I know what you\'re thinking: that you\'re sixteen years old and this dome is too big for us."',
    choices: [
      { label: '"I\'m afraid of failing you, Tomás. There\'s something moving out there in the sand."', reply: 'Ríos grips your shoulder with his good hand: "Fear keeps you awake, kid. Breathe deep—you\'re not alone in this."', morale: 30 },
      { label: '"The dome will hold. You rest; I\'ll take care of the lines."', reply: 'Ríos lets out a raspy laugh: "Just as stubborn as the day you walked into the workshop. Alright, Chief Technician."', morale: 28 },
      { label: 'Listen together to the old workshop cassette tape in silence.', reply: 'For two minutes, the hum of life support fades beneath an acoustic guitar recorded on Earth forty years ago.', morale: 34 }
    ]
  },
  {
    sol: 2,
    who: 'DR. INÉS VELA · BIOMEDICAL LAB',
    title: 'Twelve light-minutes away',
    prompt: 'Vela holds two metal mugs of warm hydroponic mint infusion. Your hands shake slightly as you remove your gloves.\n\n"I saw your heart telemetry out there, Spark. Drinking helps. Talk, too."',
    choices: [
      { label: '"My mom is still in Coastal Block 9. I don\'t know if she made the lottery."', reply: 'Vela looks at you with fierce tenderness: "When the dome is self-sufficient, crew families get priority. You have my word."', morale: 32 },
      { label: '"I feel like I\'m running out of air every time those drones lock onto me."', reply: 'Vela guides your breathing: "Four seconds in, four out. Your mind is as vital as oxygen."', morale: 30 },
      { label: 'Help her inspect the first green sprouts in the greenhouse.', reply: 'A tiny leaf of terrestrial spirulina has broken through. It smells like damp earth. It smells like a future.', morale: 31 }
    ]
  },
  {
    sol: 3,
    who: 'CMDR. YUKI HIRAOKA · COMMAND DECK',
    title: 'Old-world coffee',
    prompt: 'Hiraoka opens a silver packet kept under lock and key: the last real coffee from Earth orbit. She pours half into your cup.\n\n"They don\'t teach us how to ask a sixteen-year-old to cross a storm toward a leaking reactor."',
    choices: [
      { label: '"I\'m nobody\'s apprentice anymore. I\'m the technician of ARES-7."', reply: 'Hiraoka nods slowly: "You are. And your name will head the founding logbook of Mars."', morale: 34 },
      { label: '"I just need five minutes without alarms ringing in my ears."', reply: 'Hiraoka mutes the console and dims the strobes: "Five minutes, Spark. The universe can wait."', morale: 36 }
    ]
  },
  {
    sol: 4,
    who: 'ARES-7 CREW · CENTRAL DOME',
    title: 'Before Sol Zero',
    prompt: 'The Martian sky glows rust-orange from the coming coronal mass ejection. Ríos, Vela and Hiraoka wait by the airlock.\n\n"Whatever you do out there," Ríos says, adjusting your helmet seal, "walk back through this door."',
    choices: [
      { label: '"I\'ll keep the dome alive. See you on the other side of the storm."', reply: 'All three gently tap your helmet visor in salute. You know exactly which wire to touch.', morale: 38 },
      { label: 'Hug Ríos and Vela before pressurizing the airlock.', reply: 'For the first time since you launched from Earth, this frozen test bench feels like a true home.', morale: 42 }
    ]
  }
];

const INNER_THOUGHTS = {
  outside_calm: [
    '"The silence out here weighs more than the suit..."',
    '"Step by step, Spark. Watch the gauges, don\'t look at the horizon."',
    '"Mom used to say machines listen if you don\'t yell at them."'
  ],
  enemy_near: [
    '"That metallic click... An ARES-6 Stalker smelled my battery."',
    '"I have the EMP pulse on [SPACE] and decoy on [Q]. Don\'t let it corner me."',
    '"Its sensors track heat. If I drop a decoy [Q] or stun it [SPACE], I can slip past."'
  ],
  low_morale: [
    '"I can\'t breathe... No, the tank has O₂, it\'s me. I need to get back to the crew."',
    '"Four hundred million people waiting and I can barely hold the wrench..."',
    '"Easy, easy... head back to the dome and talk to Ríos or Vela."'
  ],
  high_fatigue: [
    '"My eyelids are heavy... If I keep working without sleep [Z], I\'ll make mistakes."',
    '"Rest window active and I\'m still standing. My hands take twice as long to respond."'
  ],
  co2_hazard: [
    '"My tank has O₂, but cabin CO₂ is rising! We must isolate or scrub the filter [V]."',
    '"My head is pounding... CO₂ hypercapnia. I need to purge the air or isolate the module [V]."'
  ],
  dome_safe: [
    '"Pressure stable. In here, the sound of the wind doesn\'t hurt."',
    '"The warmth of the dome. I can breathe again."'
  ],
  hungry: [
    '"My hands are cold. I skipped the galley again."',
    '"Eat something, Spark. A tired brain makes bad wiring decisions."'
  ],
  menu: [
    '"Spirulina bread again... I can barely taste it."',
    '"The same ration three days in a row. My fork feels heavier than the wrench."'
  ]
};

const INTRO_LINES = [
  { text: '2063. Earth has spent twelve years saying goodbye.', hl: true },
  { text: 'Acidic oceans. Filter-cities. A global harvest that no longer meets the threshold.' },
  { text: 'ARES-7 is not a scientific mission.', hl: false },
  { text: 'It is the last door still standing open.', hl: true },
  { text: 'Four astronauts. One dome. Hostile machines from fallen missions prowling in the dust.' },
  { text: 'And a sixteen-year-old technician whose steady hands are the only shield between the colony and extinction.' },
  { text: 'This is the story of how he stopped being the spare.', hl: true, small: true }
];

// ============================================================================
// PROGRESSIVE CAMPAIGN — each Sol unlocks one mechanic and explains it
// ============================================================================
const SOLS = [
  {
    n: 1, title: 'FIRST MEAL', len: 95,
    unlock: ['meal'],
    objective: { text: 'EAT A RATION AT THE MESS GALLEY (x 320)', flag: 'ate' },
    start: [
      { who: 'VELA', text: 'Landing shook everyone. Eat something at the galley, Spark. Food is morale.' },
      { who: 'RÍOS', text: 'For today, only one system matters: you. Press E at the galley.' }
    ],
    events: [
      { t: 48, type: 'msg', who: 'HIRAOKA', text: 'The dome is holding. Tomorrow we bring the water purifier online.' }
    ]
  },
  {
    n: 2, title: 'WATER', len: 105,
    unlock: ['meal', 'water'],
    objective: { text: 'PURIFY WATER AT THE H₂O UNIT (x 470)', sys: 'water' },
    reqSystems: ['water'],
    start: [
      { who: 'RÍOS', text: 'Martian ice is full of perchlorates. Burn the toxins with the UV laser.' },
      { who: 'VELA', text: 'Eat first. Then reach 100% water purity.' }
    ],
    events: [
      { t: 55, type: 'msg', who: 'VELA', text: 'The purifier is drinking power. Keep an eye on the gauge.' }
    ]
  },
  {
    n: 3, title: 'BREATH', len: 112,
    unlock: ['meal', 'water', 'air'],
    objective: { text: 'REPAIR THE ECLSS CONSOLE (x 620)', sys: 'life' },
    reqSystems: ['life'],
    start: [
      { who: 'VELA', text: 'Today you learn the real rule: full O₂ is not clean air.' },
      { who: 'RÍOS', text: 'If CO₂ climbs, isolate the module or reroute the conduits.' }
    ],
    events: [
      { t: 32, type: 'co2_fault', module: 'main', text: 'CENTRAL DOME CO₂ FILTER FAULT · AIR TURNING TOXIC [V]' },
      { t: 70, type: 'msg', who: 'HIRAOKA', text: 'Pressure is holding. Good lungs, technician.' }
    ]
  },
  {
    n: 4, title: 'POWER', len: 115,
    unlock: ['meal', 'water', 'air', 'power', 'storm', 'enemies'],
    objective: { text: 'CLEAN THE SOLAR ARRAY (x 1700)', sys: 'energy' },
    reqSystems: ['energy'],
    start: [
      { who: 'RÍOS', text: 'Dust cuts solar output. Never let the battery hit zero.' },
      { who: 'HIRAOKA', text: 'ARES-6 drones patrol beyond the airlock. Use [SPACE] and [Q].' }
    ],
    events: [
      { t: 34, type: 'warning', text: 'DUST STORM APPROACHING · SOLAR GENERATION WILL DROP' },
      { t: 46, type: 'storm', kind: 'dust', dur: 24 },
      { t: 84, type: 'msg', who: 'RÍOS', text: 'Panels will be filthy after this. Clean them at x 1700.' }
    ]
  },
  {
    n: 5, title: 'REST', len: 118,
    unlock: ['meal', 'water', 'air', 'power', 'storm', 'enemies', 'sleep', 'crew'],
    objective: { text: 'SLEEP OR NAP AT THE BUNKS (x 770)', flag: 'slept' },
    start: [
      { who: 'HIRAOKA', text: 'You have been awake too long. Fatigue slows every repair.' },
      { who: 'VELA', text: 'Ríos and Hiraoka are waiting at the crew quarters too.' }
    ],
    events: [
      { t: 42, type: 'rest_window', text: 'REST SCHEDULE [Z]: WORKING NOW ACCUMULATES FATIGUE FAST' },
      { t: 80, type: 'msg', who: 'VELA', text: 'Four seconds in, four seconds out. You earned the sleep.' }
    ]
  },
  {
    n: 6, title: 'CROPS', len: 120,
    unlock: ['meal', 'water', 'air', 'power', 'storm', 'enemies', 'sleep', 'crew', 'crops', 'lab', 'waste'],
    objective: { text: 'GROW AND HARVEST A CROP (GREENHOUSE x 1070)', flag: 'harvest' },
    start: [
      { who: 'VELA', text: 'Ice is not enough. Today we plant.' },
      { who: 'RÍOS', text: 'The lab can boost every machine. One scan at a time.' }
    ],
    events: [
      { t: 36, type: 'crop_fault', text: 'GREENHOUSE VALVE STUCK · ONE PLOT IS NOT GETTING WATER' },
      { t: 90, type: 'msg', who: 'VELA', text: 'Harvest something before the sun sets. Anything green counts.' }
    ]
  },
  {
    n: 7, title: 'SIGNAL', len: 122,
    unlock: ['meal', 'water', 'air', 'power', 'storm', 'enemies', 'sleep', 'crew', 'crops', 'lab', 'waste', 'comms', 'rad'],
    objective: { text: 'ALIGN THE X-BAND ANTENNA (x 2280)', sys: 'comms' },
    reqSystems: ['comms'],
    start: [
      { who: 'HIRAOKA', text: 'Earth is calling. Align the X-band dish and answer.' },
      { who: 'VELA', text: 'A radiation front is rising. Watch your dose and shelter.' }
    ],
    events: [
      { t: 26, type: 'warning', text: 'RADIATION STORM INCOMING · SEEK SHELTER OR LIMIT EVA' },
      { t: 38, type: 'storm', kind: 'rad', dur: 26 },
      { t: 96, type: 'msg', who: 'HIRAOKA', text: 'If the uplink locks, all four hundred million hear it.' }
    ]
  },
  {
    n: 8, title: 'SOL ZERO', len: 135,
    unlock: ['meal', 'water', 'air', 'power', 'storm', 'enemies', 'sleep', 'crew', 'crops', 'lab', 'waste', 'comms', 'rad', 'final'],
    objective: null,
    start: [
      { who: 'HIRAOKA', text: 'Coronal mass ejection impact. Keep the dome breathing.' },
      { who: 'RÍOS', text: 'Final Sol, Spark. Pressure, CO₂, batteries and a full pantry.' }
    ],
    events: [
      { t: 8, type: 'warning', text: 'CME IMPACT · 10s TO WAVEFRONT' },
      { t: 18, type: 'storm', kind: 'rad', dur: 52 },
      { t: 44, type: 'co2_fault', module: 'main', text: 'CRITICAL CO₂ SATURATION IN CENTRAL DOME · REPAIR OR USE SPARE [V]' },
      { t: 66, type: 'leak' },
      { t: 104, type: 'overload', sys: 'comms', text: 'IONOSPHERIC INTERFERENCE · X-BAND -18%' }
    ]
  }
];

const LOGS = [
  {
    who: 'CMDR. YUKI HIRAOKA · PRIVATE LOG · SOL 1',
    title: 'On bringing a child to the end of the world',
    body: `I approved it myself. In the briefing I said "we need hands," as if those hands weren't sixteen years old with a mother watching the launch from a flooded rooftop.\n\nThe original manifest had twelve technicians. All veterans. All killed in the Hangar 3 fire.\n\nIf the dome fails, the fault won't be the boy's. It will be mine, for believing the species is worth more than a childhood.`
  },
  {
    who: 'DR. INÉS VELA · FIELD NOTE · SOL 3',
    title: 'Oxygen available, air hazardous (ECLSS)',
    body: `Back on Earth, people think surviving on Mars is just about not running out of oxygen. They're wrong.\n\nIf the carbon dioxide scrubber fails in a module, you can die of hypercapnia with O₂ tanks at 100%. We only have one spare lithium hydroxide cartridge per cycle: using it in the greenhouse saves the harvest, but leaves the main dome without a backup.`
  },
  {
    who: 'EARTH TRANSMISSION · X-BAND · RECEIVED SOL 7',
    title: 'Four hundred million',
    body: `...repeating: ARES-7, confirm dome viability before the launch window closes.\n\nThere are four hundred million applications for passage. They aren't numbers—they're people standing in line beneath failing air filters.\n\nDo not lose it.\n\n...cutting transmission due to radiation.`
  },
  {
    who: 'ENG. TOMÁS RÍOS · INTERNAL AUDIO · SOL 4',
    title: 'The myth of the wind and the truth of the dust',
    body: `The Martian atmosphere has 1% of Earth's density: a storm isn't going to rip the antenna out of the ground. The real killer is the twilight.\n\nSuspended dust blocks the sun and deposited dust blinds the solar cells. When generation drops, disconnect the rover dock or the crop lamps from the power grid before the batteries die.`
  },
  {
    who: 'HANDWRITTEN NOTE · SHELTER · SOL 6',
    title: 'Not yet',
    body: `Ares-1 isn't a home. It's a heated test bench.\n\nBut this morning Vela found liquid water twelve centimeters beneath the greenhouse floor. Twelve centimeters. Hiraoka cried in front of everyone and claimed it was the dust.\n\nIf we survive this storm, we'll plant something. Even if it's just a weed.\n\nIt isn't a home yet. But it can be.`
  }
];

// ---------- Meals & food variety ----------
const RATIONS = [
  { id: 'spirulina', name: 'SPIRULINA BREAD', morale: 14, col: '#9fbf7a', desc: 'Dense, green, honest.' },
  { id: 'stew',      name: 'BEAN & TOMATO STEW', morale: 20, col: '#e8622a', desc: 'The crew favourite.' },
  { id: 'fruit',     name: 'FREEZE-DRIED FRUIT', morale: 17, col: '#ff9f45', desc: 'Sweet. Crunchy. Rare.' },
  { id: 'fungus',    name: 'FUNGUS PROTEIN', morale: 18, col: '#d9b08c', desc: 'Grown in the dark.' }
];
const MENU_FATIGUE_LIMIT = 60;

// ---------- Greenhouse crops ----------
const CROPS = [
  { id: 'potato',   name: 'MARTIAN POTATO',    grow: 34, water: 12, energy: 6, yield: 3, col: '#d9b08c', short: 'POTATO' },
  { id: 'lettuce',  name: 'HYDROPONIC LETTUCE', grow: 24, water: 16, energy: 8, yield: 2, col: '#9fbf7a', short: 'LETTUCE' },
  { id: 'soy',      name: 'SOY BEANS',          grow: 46, water: 10, energy: 7, yield: 4, col: '#c9a66b', short: 'SOY' },
  { id: 'spirulina', name: 'SPIRULINA VAT',     grow: 30, water: 14, energy: 5, yield: 3, col: '#7fb0a8', short: 'ALGAE' }
];

// ---------- Regions visited during EVA ----------
const REGIONS = [
  { min: 0,    max: 1400, name: 'ACIDALIA PLANITIA' },
  { min: 1400, max: 1850, name: 'TEMPE FOSSAE' },
  { min: 1850, max: 2250, name: 'ARABIA TERRA' },
  { min: 2250, max: 2650, name: 'NEPENTHES MENSAE' },
  { min: 2650, max: 3050, name: 'ELYSIUM PLANITIA' },
  { min: 3050, max: 3600, name: 'UTOPIA PLANITIA' }
];

// ---------- Layout ----------
const AIRLOCK_X = 1360;
const DOME_IN = { left: 165, right: 1345 };
const GALLEY_SPOT = 320;
const BUNK_SPOT = 770;
const CREW_SPOT = 920;
const LAB_SPOT = 1220;
const ROVER_SPOT = 1480;
const MED_SPOT = 3240;
const LOG_SPOTS = [1430, 1760, 2120, 2600, 3170];
const SHELTER = { x: 3000, half: 58 };
const START_X = 320;

const MG = { cols: 5, rows: 5, size: 66, time: 38 };

// 7 System Stations (spaced across the wide dome + surface)
const TERMINALS = [
  { x: 470,  sys: 'water',  kind: 'water',   gameType: 'water',   label: 'H₂O WATER PURIFIER' },
  { x: 620,  sys: 'life',   kind: 'console', gameType: 'pipes',   label: 'ECLSS CONSOLE · LIFE SUPPORT' },
  { x: 1070, sys: 'food',   kind: 'food',    gameType: 'food',    label: 'GREENHOUSE · CROP CONSOLE' },
  { x: 1700, sys: 'energy', kind: 'solar',   gameType: 'solar',   label: 'SOLAR COLLECTOR ARRAY' },
  { x: 1970, sys: 'waste',  kind: 'waste',   gameType: 'waste',   label: 'WASTE INCINERATOR' },
  { x: 2280, sys: 'comms',  kind: 'tower',   gameType: 'comms',   label: 'X-BAND ANTENNA' },
  { x: 2680, sys: 'life',   kind: 'reactor', gameType: 'reactor', label: 'THERMAL REACTOR VALVES' }
];

const ENEMY_ZONES = [
  { minX: 1400, maxX: 1920, homeX: 1620, name: 'ARES-6 STALKER α' },
  { minX: 1920, maxX: 2520, homeX: 2220, name: 'ARES-6 STALKER β' },
  { minX: 2520, maxX: 3360, homeX: 2920, name: 'ARES-6 STALKER γ' }
];
