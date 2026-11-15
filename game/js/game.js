// SOL ZERO — Simulation Logic, Circular Ring Gauges, Sol Transition, One-Time Tutorials & 3 NASA Protocols (English)
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const pad2 = n => String(n).padStart(2, '0');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const screens = Array.from(document.querySelectorAll('.screen'));

  const G = {
    phase: 'title',
    diffKey: 'normal',
    diff: DIFFICULTIES.normal,
    time: 0,
    cam: 0,
    hudT: 0,
    ambT: 0,
    stepT: 0,
    heartbeatT: 0,
    thoughtT: 6,
    thoughtText: '“Wires don\'t lie. Just breathe.”',
    solIdx: 0,
    sol: 1,
    solTime: 0,
    solLen: SOLS[0].len,
    systems: { life: 72, energy: 58, comms: 54, water: 52, food: 58, waste: 60 },
    // Separate ECLSS Indicators (NASA Mechanic: O2 available, but hazardous air via CO2 or Pressure)
    o2: 100,
    pressure: 101.3,
    co2: 4,
    co2Fault: null,
    greenhouseIsolated: false,
    eclssSpares: 1,
    // Biometrics & Fatigue (NASA HRP Mechanic: Sleep or finish a task)
    dose: 0,
    morale: 92,
    fatigue: 8,
    restWindow: false,
    offlineSystems: {},
    talkedThisSol: false,
    restCd: 0,
    roverUsedThisSol: false,
    // Electrical Power Budget & Dust (NASA Dust Storm Mechanic)
    panelDust: 10,
    solarGenKw: 8.5,
    powerLoadKw: 8.2,
    loads: { eclss: true, greenhouse: true, lab: true, rover: true },
    // Player & EVA Tools
    player: { x: START_X, face: 1, moving: false, sprinting: false },
    empCd: 0,
    empFlash: 0,
    empStunBase: 5.0,
    shield: 0,
    decoyCd: 0,
    decoy: { active: false, x: 0, t: 0 },
    stunBanner: { active: false, name: '', t: 0, maxT: 5.0 },
    enemies: [],
    inside: true,
    storm: { active: false, kind: null, remaining: 0, level: 0, warning: false },
    eventsDone: [],
    msgQ: [],
    repairedThisSol: {},
    objectiveDone: false,
    leak: false,
    logs: [false, false, false, false, false],
    logsCount: 0,
    medUsed: false,
    nearest: null,
    minigame: null,
    // One-time Tutorials & Safe Grace Period from Stalker Robots
    tutorialsSeen: {},
    tutorialCallback: null,
    safeGraceT: 0,
    mouse: { x: 0, y: 0, down: false },
    stats: { repairs: 0, fails: 0, stuns: 0 }
  };

  const keys = { left: false, right: false, up: false, down: false, shift: false };
  const sysEls = {};
  const radarStationDots = {};
  let toastTimer = null, bannerTimer = null, introTimers = [];
  let lastFrame = 0, rafId = null;

  const INTERACTABLES = [];
  TERMINALS.forEach(t => INTERACTABLES.push({ x: t.x, type: 'sys', term: t, label: 'OPERATE · ' + t.label }));
  INTERACTABLES.push({ x: BUNK_SPOT, type: 'bunk', label: 'BUNKS · SLEEP OR MANAGE FATIGUE [Z]' });
  INTERACTABLES.push({ x: CREW_SPOT, type: 'crew', label: 'TALK TO CREW (EMOTIONAL SUPPORT)' });
  INTERACTABLES.push({ x: ROVER_SPOT, type: 'rover', label: 'SYNC ROVER-2 (SHIELD & BATTERY)' });
  LOG_SPOTS.forEach((x, i) => INTERACTABLES.push({ x, type: 'log', idx: i, label: 'READ LOG ' + pad2(i + 1) }));
  INTERACTABLES.push({ x: MED_SPOT, type: 'med', label: 'USE ANTI-RADIATION MEDKIT' });

  // ---------- Emotional State & Performance ----------
  function getEmotionalState() {
    for (let i = 0; i < EMOTIONAL_STATES.length; i++) {
      if (G.morale >= EMOTIONAL_STATES[i].min) return EMOTIONAL_STATES[i];
    }
    return EMOTIONAL_STATES[EMOTIONAL_STATES.length - 1];
  }

  function getFatigueSpeedMult() {
    return Math.max(0.52, 1.0 - (G.fatigue / 100) * 0.48);
  }

  function setThought(category) {
    const list = INNER_THOUGHTS[category];
    if (!list || !list.length) return;
    G.thoughtText = list[Math.floor(Math.random() * list.length)];
    G.thoughtT = 9;
    const el = $('hud-thought');
    if (el) el.textContent = G.thoughtText;
  }

  // ---------- Basic UI ----------
  function showScreen(id) { screens.forEach(s => s.classList.toggle('hidden', s.id !== id)); }
  function hideScreens() { screens.forEach(s => s.classList.add('hidden')); }

  function toast(text, cls = '') {
    const el = $('toast');
    el.textContent = text;
    el.className = 'toast show ' + cls;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 4400);
  }

  function banner(kicker, title, sub) {
    $('banner-kicker').textContent = kicker;
    $('banner-title').textContent = title;
    $('banner-sub').textContent = sub;
    const el = $('banner');
    el.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 4100);
  }

  // ---------- ONE-TIME TUTORIAL SYSTEM (PAUSES GAME & PROTECTS FROM STALKERS) ----------
  function openTutorialIfFirst(tutKey, onProceed) {
    if (G.tutorialsSeen[tutKey] || !TUTORIALS || !TUTORIALS[tutKey]) {
      onProceed();
      return;
    }
    G.tutorialsSeen[tutKey] = true;
    G.phase = 'tutorial';
    G.tutorialCallback = onProceed;
    G.safeGraceT = 4.0; // Extra protection after tutorial closes
    keys.left = keys.right = keys.up = keys.down = keys.shift = false;
    G.player.moving = false;

    const t = TUTORIALS[tutKey];
    $('tut-title').textContent = t.title;
    $('tut-body').textContent = t.body;
    $('tut-keys').textContent = t.keys;
    showScreen('screen-tutorial');
    Sound.blip();
  }

  function closeTutorialModal(proceed) {
    if (G.phase !== 'tutorial') return;
    const cb = G.tutorialCallback;
    G.tutorialCallback = null;
    G.safeGraceT = 4.0; // 4s stalker immunity buffer after closing tutorial
    hideScreens();
    G.phase = 'playing';
    Sound.blip();
    if (proceed && typeof cb === 'function') {
      cb();
    } else {
      syncHud();
    }
  }

  // ---------- Circular Ring Gauges Construction ----------
  function buildSystems() {
    const wrap = $('hud-systems');
    wrap.innerHTML = '';

    // 1. Large Primary Ring on the left (LIFE SUPPORT ECLSS)
    const mainWrap = document.createElement('div');
    mainWrap.className = 'ring-main-wrap';
    const mainItem = createRingNode('life', true);
    mainWrap.appendChild(mainItem);
    wrap.appendChild(mainWrap);

    // 2. Row of 5 Secondary Rings on the right (ENERGY, COMMS, WATER, CROPS, WASTE)
    const gridWrap = document.createElement('div');
    gridWrap.className = 'rings-grid';
    ['energy', 'comms', 'water', 'food', 'waste'].forEach(k => {
      gridWrap.appendChild(createRingNode(k, false));
    });
    wrap.appendChild(gridWrap);

    const rStat = $('radar-stations');
    if (rStat) {
      rStat.innerHTML = '';
      TERMINALS.forEach(t => {
        const dot = document.createElement('div');
        dot.className = 'radar-dot station';
        dot.style.left = (t.x / WORLD.width * 100).toFixed(1) + '%';
        dot.style.background = SYSTEMS[t.sys].color;
        rStat.appendChild(dot);
        radarStationDots[t.sys] = dot;
      });
    }
  }

  function createRingNode(k, isMain) {
    const item = document.createElement('div');
    item.className = 'ring-item';
    const ring = document.createElement('div');
    ring.className = 'ring-circle';
    ring.style.setProperty('--ring-fill', isMain ? '#b197fc' : '#9775fa');
    ring.style.setProperty('--pct', '50');
    const val = document.createElement('span');
    val.className = 'ring-val';
    val.textContent = '50';
    ring.appendChild(val);

    const lbl = document.createElement('span');
    lbl.className = 'ring-lbl';
    lbl.textContent = SYSTEMS[k].short;

    item.appendChild(ring);
    item.appendChild(lbl);
    sysEls[k] = { node: item, ring, val, lbl };
    return item;
  }

  function checkObjectiveStatus() {
    const s = SOLS[G.solIdx];
    if (!s.reqSystems || !s.reqSystems.length) return true;
    return s.reqSystems.every(sys => G.repairedThisSol[sys] || G.systems[sys] >= 85);
  }

  // ---------- Electrical Power Budget Calculation ----------
  function computePowerBudget() {
    const healthFactor = 0.45 + 0.55 * (G.systems.energy / 100);
    const atmLoss = G.storm.active
      ? (G.storm.kind === 'dust' ? 0.72 * G.storm.level : 0.42 * G.storm.level)
      : 0;
    const depositLoss = (G.panelDust / 100) * 0.52;

    const eff = Math.max(0.06, (1 - atmLoss) * (1 - depositLoss));
    G.solarGenKw = +(10.2 * healthFactor * eff).toFixed(1);

    let load = 0;
    Object.keys(POWER_LOADS).forEach(k => {
      if (G.loads[k]) load += POWER_LOADS[k].kw;
    });
    G.powerLoadKw = +load.toFixed(1);
    return +(G.solarGenKw - G.powerLoadKw).toFixed(1);
  }

  function syncHud() {
    if (G.phase === 'title') return;
    const s = SOLS[G.solIdx];
    $('hud-sol').textContent = pad2(G.sol);
    $('hud-solname').textContent = s.title;
    $('hud-diff').textContent = G.diff.name;
    const remain = Math.max(0, Math.ceil(G.solLen - G.solTime));
    const clk = $('hud-clock');
    clk.textContent = (G.restWindow ? 'NIGHT T-' : 'T-') + pad2(Math.floor(remain / 60)) + ':' + pad2(remain % 60);
    clk.classList.toggle('rest-mode', G.restWindow);

    let weather = G.restWindow ? 'REST WINDOW [Z]' : 'EXTERIOR · WIND 14 m/s';
    let danger = false;
    if (G.storm.active) {
      weather = (G.storm.kind === 'rad' ? 'SOLAR FLARE' : 'DUST STORM') + ' · ' + Math.ceil(G.storm.remaining) + 's';
      danger = true;
    } else if (G.storm.warning) {
      weather = 'WARNING · STORM APPROACHING';
      danger = true;
    } else if (G.inside && !G.restWindow) {
      weather = 'DOME · PRESSURE ' + G.pressure.toFixed(0) + ' kPa';
    }
    const wEl = $('hud-weather');
    wEl.textContent = weather;
    wEl.classList.toggle('danger', danger);

    // Exterior Threat Pill
    const tEl = $('hud-threat');
    if (tEl) {
      let nearestEn = null, minDist = 9999;
      G.enemies.forEach(en => {
        const d = Math.abs(G.player.x - en.x);
        if (d < minDist) { minDist = d; nearestEn = en; }
      });
      tEl.className = 'threat-pill';
      if (G.inside) {
        tEl.textContent = `SAFE ZONE · ${G.enemies.length} STALKER(S) OUTSIDE`;
      } else if (G.safeGraceT > 0) {
        tEl.textContent = `SAFE SHIELD ACTIVE (${G.safeGraceT.toFixed(1)}s)`;
        tEl.classList.add('stun');
      } else if (nearestEn) {
        const meters = Math.round(minDist / 6);
        if (nearestEn.stun > 0) {
          tEl.textContent = `STALKER IMMOBILIZED (${nearestEn.stun.toFixed(1)}s)`;
          tEl.classList.add('stun');
        } else if (nearestEn.state === 'chase') {
          tEl.textContent = `PURSUIT AT ${meters}m! USE [SPACE] EMP OR [Q] DECOY`;
          tEl.classList.add('alert');
        } else if (minDist < 340) {
          tEl.textContent = `STALKER NEARBY (${meters}m) · [SPACE] EMP`;
          tEl.classList.add('warn');
        } else {
          tEl.textContent = `EXTERIOR PATROL AT ${meters}m`;
        }
      }
    }

    // Top-Right Stun Feed
    const sf = $('stun-feed');
    if (sf) {
      const stunnedEn = G.enemies.find(e => e.stun > 0);
      if (stunnedEn) {
        sf.classList.remove('hidden');
        $('stun-feed-title').textContent = `⚡ ${stunnedEn.name} STUNNED`;
        $('stun-feed-time').textContent = stunnedEn.stun.toFixed(1) + 's';
        const pct = clamp((stunnedEn.stun / G.empStunBase) * 100, 0, 100);
        $('stun-feed-bar').style.width = pct + '%';
      } else {
        sf.classList.add('hidden');
      }
    }

    // Center Panel: Priority Mission
    const mBox = $('mission-box');
    const mKicker = $('mission-kicker');
    const oEl = $('hud-objective');
    const stepsEl = $('hud-mission-steps');

    let objText, done = false;
    if (!s.objective) {
      objText = 'SURVIVE THE CME SUPERSTORM & KEEP SYSTEMS ONLINE';
      mKicker.textContent = '◆ FINAL MISSION · SOL ZERO';
    } else if (G.objectiveDone) {
      objText = 'SOL MISSION COMPLETE! YOU MAY SLEEP [Z] OR MAINTAIN THE DOME';
      mKicker.textContent = '✓ PRIORITY OBJECTIVE COMPLETE';
      done = true;
    } else {
      objText = s.objective.text;
      mKicker.textContent = `◆ ACTIVE MISSION · SOL ${pad2(G.sol)}`;
    }
    oEl.textContent = objText;
    if (mBox) mBox.classList.toggle('done', done);

    if (stepsEl) {
      stepsEl.innerHTML = '';
      if (s.reqSystems && s.reqSystems.length) {
        s.reqSystems.forEach(sysKey => {
          const isOk = !!(G.repairedThisSol[sysKey] || G.systems[sysKey] >= 85 || G.objectiveDone);
          const term = TERMINALS.find(t => t.sys === sysKey);
          const loc = term ? ` (x ${term.x})` : '';
          const chip = document.createElement('span');
          chip.className = 'm-chip' + (isOk ? ' ok' : '');
          chip.textContent = isOk
            ? `✓ ${SYSTEMS[sysKey].name}: READY`
            : `◆ ${SYSTEMS[sysKey].name}${loc}: ${Math.round(G.systems[sysKey])}%`;
          stepsEl.appendChild(chip);
        });
      }
    }

    // ECLSS Pills: O2, Pressure & CO2
    const pO2 = $('pill-o2');
    $('o2-val').textContent = Math.round(G.o2) + '%';
    pO2.className = 'eclss-pill' + (G.o2 < 28 ? ' crit' : (G.o2 < 50 ? ' warn' : ''));

    const pPres = $('pill-pres');
    $('pres-val').textContent = G.pressure.toFixed(0) + ' kPa';
    pPres.className = 'eclss-pill' + (G.pressure < 72 ? ' crit' : (G.pressure < 88 ? ' warn' : ''));

    const pCo2 = $('pill-co2');
    const co2PpmPct = (0.04 + (G.co2 / 100) * 4.46).toFixed(2) + '%';
    $('co2-val').textContent = co2PpmPct + (G.greenhouseIsolated ? ' (ISOL)' : '');
    pCo2.className = 'eclss-pill' + (G.co2 > 60 ? ' crit' : (G.co2 > 30 || G.co2Fault ? ' warn' : ''));

    // Biometric Bars
    $('rad-val').textContent = Math.round(G.dose) + '%';
    $('rad-bar').style.width = G.dose + '%';
    $('m-rad').classList.toggle('low', G.dose > 65);

    const emo = getEmotionalState();
    $('morale-val').textContent = Math.round(G.morale) + '%';
    $('morale-bar').style.width = G.morale + '%';
    $('morale-bar').style.background = emo.color;
    $('m-morale').classList.toggle('low', G.morale < 28);

    $('fatigue-val').textContent = Math.round(G.fatigue) + '%';
    $('fatigue-bar').style.width = G.fatigue + '%';
    $('m-fatigue').classList.toggle('low', G.fatigue > 65);

    $('dust-val').textContent = Math.round(G.panelDust) + '%';
    $('dust-bar').style.width = G.panelDust + '%';
    $('m-dust').classList.toggle('low', G.panelDust > 60);

    // Suit Tools & Net Power Balance
    const empEl = $('hud-emp');
    if (empEl) {
      if (G.empCd <= 0) {
        empEl.textContent = `EMP [SPACE]: READY (${G.empStunBase.toFixed(1)}s)`;
        empEl.classList.remove('cd');
      } else {
        empEl.textContent = `EMP: ${Math.ceil(G.empCd)}s`;
        empEl.classList.add('cd');
      }
    }

    const decoyEl = $('hud-decoy');
    if (decoyEl) {
      if (G.decoy.active) {
        decoyEl.textContent = `DECOY: ${Math.ceil(G.decoy.t)}s`;
        decoyEl.classList.remove('cd');
      } else if (G.decoyCd <= 0) {
        decoyEl.textContent = 'DECOY [Q]: READY';
        decoyEl.classList.remove('cd');
      } else {
        decoyEl.textContent = `DECOY: ${Math.ceil(G.decoyCd)}s`;
        decoyEl.classList.add('cd');
      }
    }

    const netKw = computePowerBudget();
    const pwrEl = $('hud-pwr-net');
    if (pwrEl) {
      const sign = netKw >= 0 ? '+' : '';
      pwrEl.textContent = `GRID [B]: ${sign}${netKw.toFixed(1)} kW`;
      pwrEl.classList.toggle('neg', netKw < 0);
    }

    // NASA Protocol Quick Buttons
    const btnRest = $('btn-hud-rest');
    if (btnRest) {
      $('lbl-hud-rest').textContent = G.restWindow ? 'SLEEP TIME!' : `FATIGUE ${Math.round(G.fatigue)}%`;
      btnRest.className = 'nasa-btn' + (G.fatigue > 70 ? ' alert' : (G.restWindow || G.fatigue > 42 ? ' warn' : ''));
    }
    const btnPwr = $('btn-hud-power');
    if (btnPwr) {
      $('lbl-hud-power').textContent = `${G.solarGenKw} / ${G.powerLoadKw} kW`;
      btnPwr.className = 'nasa-btn' + (netKw < -1.5 ? ' alert' : (netKw < 0 ? ' warn' : ''));
    }
    const btnEclss = $('btn-hud-eclss');
    if (btnEclss) {
      $('lbl-hud-eclss').textContent = G.co2Fault ? 'CO₂ FAULT!' : (G.greenhouseIsolated ? 'GH ISOLATED' : 'ECLSS AIR');
      btnEclss.className = 'nasa-btn' + (G.co2 > 55 || G.co2Fault ? ' alert' : (G.greenhouseIsolated ? ' warn' : ''));
    }

    $('stage').classList.toggle('panic', G.morale < 26 && G.phase === 'playing');
    $('stage').classList.toggle('co2-warn', G.co2 > 55 && G.inside && G.phase === 'playing');

    // Circular Ring Gauges (Purple / Neon Purple / Gray)
    const reqs = (!G.objectiveDone && s.reqSystems) ? s.reqSystems : [];
    Object.keys(SYSTEMS).forEach(k => {
      const v = Math.round(G.systems[k]);
      const e = sysEls[k];
      if (!e) return;
      const isReq = reqs.includes(k) && v < 85 && !G.repairedThisSol[k];
      const isCrit = v < 30;
      e.ring.style.setProperty('--pct', v);
      e.ring.style.setProperty('--ring-fill', isCrit ? '#be4bdb' : (isReq ? '#e599f7' : '#9775fa'));
      e.val.textContent = v;
      e.node.classList.toggle('crit', isCrit);
      e.node.classList.toggle('req', isReq);
      e.node.classList.toggle('offline', !!G.offlineSystems[k]);
      if (radarStationDots[k]) {
        radarStationDots[k].classList.toggle('mission', isReq);
      }
    });

    // Horizontal Radar
    const rPlayer = $('radar-player');
    if (rPlayer) rPlayer.style.left = (G.player.x / WORLD.width * 100).toFixed(1) + '%';
    const rEnemies = $('radar-enemies');
    if (rEnemies) {
      rEnemies.innerHTML = '';
      G.enemies.forEach(en => {
        const d = document.createElement('div');
        d.className = 'radar-dot enemy' + (en.stun > 0 ? ' stun' : '');
        d.style.left = (en.x / WORLD.width * 100).toFixed(1) + '%';
        rEnemies.appendChild(d);
      });
    }

    $('hud-logs').textContent = 'LOGS ' + G.logsCount + '/5';
    const bondEl = $('hud-bond');
    if (bondEl) {
      bondEl.textContent = G.talkedThisSol
        ? 'CREW (x 335): SUPPORT SPOKEN'
        : 'CREW (x 335): SUPPORT AVAILABLE';
    }
    const shEl = $('hud-shield');
    if (shEl) {
      shEl.textContent = `SUIT SHIELD: ${G.shield} · ECLSS SPARE: ${G.eclssSpares}`;
    }
    $('hud').classList.toggle('mini', !!G.minigame);

    const pr = $('prompt');
    if (G.phase === 'playing' && !G.minigame && G.nearest) {
      pr.classList.remove('hidden');
      $('prompt-text').textContent = G.nearest.label;
    } else {
      pr.classList.add('hidden');
    }
  }

  // ---------- Stalker Drone Spawning, Decoy & AI ----------
  function spawnEnemiesForSol(solIdx) {
    G.enemies = [];
    const count = clamp(G.diff.enemyCountBase + (solIdx >= 2 ? 1 : 0), 1, 3);
    for (let i = 0; i < count; i++) {
      const z = ENEMY_ZONES[i % ENEMY_ZONES.length];
      G.enemies.push({
        x: z.homeX,
        minX: z.minX,
        maxX: z.maxX,
        dir: i % 2 === 0 ? -1 : 1,
        state: 'patrol',
        stun: 0,
        atkCd: 0,
        sabotageCd: 8 + i * 4,
        name: z.name
      });
    }
  }

  function triggerEmpPulse() {
    if (G.phase !== 'playing' || G.minigame) return;
    if (G.empCd > 0) {
      toast(`EMP capacitor recharging (${Math.ceil(G.empCd)} s).`, '');
      return;
    }
    G.empCd = 6.0;
    G.empFlash = 1.0;
    G.o2 = Math.max(2, G.o2 - 2);
    Sound.emp();

    const stunDur = G.empStunBase;
    const range = 225;
    let hit = 0;
    G.enemies.forEach(en => {
      const dist = Math.abs(G.player.x - en.x);
      if (dist <= range) {
        en.stun = stunDur;
        en.state = 'patrol';
        const pushDir = en.x >= G.player.x ? 1 : -1;
        en.x = clamp(en.x + pushDir * 52, 520, WORLD.width - 70);
        hit++;
      }
    });

    if (hit > 0) {
      G.stats.stuns += hit;
      G.morale = clamp(G.morale + 5, 0, 100);
    } else {
      toast(`EMP pulse discharged. No Stalker in range.`, '');
    }
    syncHud();
  }

  function deployDecoy() {
    if (G.phase !== 'playing' || G.minigame) return;
    if (G.inside) {
      toast('Decoy Beacon [Q] can only be deployed outside the dome.', '');
      return;
    }
    if (G.decoy.active) {
      toast('A Decoy Beacon is already active on the surface.', '');
      return;
    }
    if (G.decoyCd > 0) {
      toast(`Decoy Beacon recharging (${Math.ceil(G.decoyCd)} s).`, '');
      return;
    }
    G.decoy = { active: true, x: G.player.x, t: 8.5 };
    G.decoyCd = 15.0;
    Sound.blip();
    Sound.pop();
    toast('DECOY BEACON DEPLOYED! Luring nearby Stalker Drones for 8.5 s.', 'good');
    syncHud();
  }

  function updateEnemies(dt) {
    // Pause enemy movement and attacks while player is in any minigame, tutorial, or post-tutorial grace period!
    if (G.minigame || G.phase !== 'playing') return;

    const p = G.player;
    const playerSafe = G.inside || p.x < 495 || Math.abs(p.x - SHELTER.x) < SHELTER.half + 14 || G.safeGraceT > 0;

    G.enemies.forEach(en => {
      if (en.atkCd > 0) en.atkCd = Math.max(0, en.atkCd - dt);
      if (en.sabotageCd > 0) en.sabotageCd = Math.max(0, en.sabotageCd - dt);

      if (en.stun > 0) {
        en.stun = Math.max(0, en.stun - dt);
        return;
      }

      if (G.decoy.active && Math.abs(en.x - G.decoy.x) < 440) {
        en.state = 'chase';
        const dDecoy = G.decoy.x - en.x;
        if (Math.abs(dDecoy) > 10) {
          en.dir = dDecoy >= 0 ? 1 : -1;
          en.x = clamp(en.x + en.dir * 86 * G.diff.enemySpeedMult * dt, 505, WORLD.width - 65);
        }
        return;
      }

      const dist = Math.abs(p.x - en.x);
      const detectRange = (G.storm.active ? 275 : 225) + (p.sprinting ? 45 : 0);

      if (!playerSafe && dist < detectRange) {
        if (en.state !== 'chase') {
          en.state = 'chase';
          Sound.enemyAlert();
          setThought('enemy_near');
        }
      } else if (playerSafe || dist > detectRange + 85) {
        en.state = 'patrol';
      }

      if (en.state === 'chase' && !playerSafe) {
        en.dir = p.x >= en.x ? 1 : -1;
        const chaseSpeed = (94 + G.solIdx * 8) * G.diff.enemySpeedMult;
        en.x = clamp(en.x + en.dir * chaseSpeed * dt, 505, WORLD.width - 65);

        if (dist < 140) {
          G.morale = Math.max(0, G.morale - 1.6 * G.diff.stressMult * dt);
        }

        if (dist < 26 && en.atkCd <= 0) {
          en.atkCd = 2.5;
          if (G.shield > 0) {
            G.shield--;
            en.stun = 3.5;
            en.x = clamp(en.x - en.dir * 48, 510, WORLD.width - 65);
            Sound.emp();
            toast(`SUIT SHIELD ABSORBED IMPACT! (Remaining shields: ${G.shield}).`, 'good');
            syncHud();
            return;
          }
          const dmgM = G.diff.enemyDmgMult;
          G.o2 = Math.max(0, G.o2 - Math.round(11 * dmgM));
          G.dose = Math.min(100, G.dose + Math.round(7 * dmgM));
          G.morale = Math.max(0, G.morale - Math.round(14 * dmgM));
          p.x = clamp(p.x + (p.x >= en.x ? 1 : -1) * 34, 65, WORLD.width - 65);
          en.x = clamp(en.x - en.dir * 38, 510, WORLD.width - 65);

          Sound.fail();
          Sound.alarm();
          toast(`${en.name} ATTACK! O₂ -${Math.round(11 * dmgM)}% · Morale -${Math.round(14 * dmgM)}%. Press [SPACE] for EMP.`, 'bad');
        }
      } else {
        const patSpeed = 52 * G.diff.enemySpeedMult;
        en.x += en.dir * patSpeed * dt;
        if (en.x <= en.minX) { en.x = en.minX; en.dir = 1; }
        if (en.x >= en.maxX) { en.x = en.maxX; en.dir = -1; }

        if (en.sabotageCd <= 0) {
          for (let i = 0; i < TERMINALS.length; i++) {
            const t = TERMINALS[i];
            if (t.x > 500 && Math.abs(en.x - t.x) < 20 && G.systems[t.sys] > 25) {
              G.systems[t.sys] = Math.max(15, G.systems[t.sys] - 4 * G.diff.decayMult);
              en.sabotageCd = 18;
              break;
            }
          }
        }
      }
    });
  }

  // ---------- Emotional Support Modal ----------
  function openEmotionModal() {
    openTutorialIfFirst('emotion', () => {
      if (G.talkedThisSol) {
        if (G.restCd > 0) {
          toast(`You already spoke with the crew this Sol. Take a deep breath (${Math.ceil(G.restCd)}s).`, 'emo');
          return;
        }
        G.restCd = 18;
        G.morale = clamp(G.morale + 14, 0, 100);
        Sound.calm();
        toast(`A quiet moment with the crew restores your composure (+14% Morale).`, 'emo');
        syncHud();
        return;
      }

      G.phase = 'emotion';
      keys.left = keys.right = keys.up = keys.down = keys.shift = false;
      const m = EMOTIONAL_MOMENTS[G.solIdx] || EMOTIONAL_MOMENTS[0];
      $('emo-who').textContent = m.who;
      $('emo-title').textContent = m.title;
      $('emo-prompt').textContent = m.prompt;

      const choicesBox = $('emo-choices');
      const replyBox = $('emo-reply');
      const closeBtn = $('btn-emo-close');
      choicesBox.innerHTML = '';
      choicesBox.classList.remove('hidden');
      replyBox.classList.add('hidden');
      closeBtn.classList.add('hidden');

      m.choices.forEach(ch => {
        const b = document.createElement('button');
        b.className = 'emo-choice-btn';
        b.textContent = ch.label;

        b.addEventListener('click', () => {
          G.talkedThisSol = true;
          G.morale = clamp(G.morale + (ch.morale || 32), 0, 100);
          choicesBox.classList.add('hidden');
          replyBox.textContent = ch.reply;
          replyBox.classList.remove('hidden');
          closeBtn.classList.remove('hidden');
          Sound.calm();
          syncHud();
        });
        choicesBox.appendChild(b);
      });

      showScreen('screen-emotion');
      Sound.blip();
    });
  }

  function closeEmotionModal() {
    if (G.phase !== 'emotion') return;
    hideScreens();
    G.phase = 'playing';
    G.safeGraceT = 3.0;
    toast('Conversation ended. Your morale is stronger.', 'emo');
    syncHud();
  }

  // =========================================================================
  // NASA MECHANIC 1: SLEEP OR FINISH A TASK (HRP FATIGUE & SLEEP)
  // =========================================================================
  function openRestModal() {
    if (G.phase !== 'playing' || G.minigame) return;
    openTutorialIfFirst('rest', () => {
      G.phase = 'rest';
      keys.left = keys.right = keys.up = keys.down = keys.shift = false;

      const perf = Math.round(getFatigueSpeedMult() * 100);
      const s = SOLS[G.solIdx];
      const pendingReqs = (s.reqSystems || []).filter(k => !G.repairedThisSol[k] && G.systems[k] < 85);
      const brokenSys = Object.keys(SYSTEMS).filter(k => G.systems[k] < 45);
      const allPending = Array.from(new Set([...pendingReqs, ...brokenSys]));
      const pendingNames = allPending.length
        ? allPending.map(k => SYSTEMS[k].name).join(', ')
        : 'No critical faults pending';

      $('rest-status-body').textContent =
        `CURRENT CIRCADIAN STATUS:\n` +
        `• Accumulated Fatigue: ${Math.round(G.fatigue)}%  |  Repair Performance: ${perf}%\n` +
        `• Extra Fatigue Verification Checks: ${G.fatigue >= 42 ? 'ACTIVE (requires dual safety lock check)' : 'Inactive (<42%)'}\n` +
        `• Unrepaired / Pending Systems Today: ${pendingNames}\n\n` +
        `NASA HRP DECISION: You may keep working through rest hours (accumulating fatigue), take a short recovery nap, or sleep until dawn assuming unrepaired equipment stays offline until tomorrow.`;

      const box = $('rest-choices');
      box.innerHTML = '';

      const btnNap = document.createElement('button');
      btnNap.className = 'emo-choice-btn nasa-opt';
      btnNap.innerHTML = `<b>1. RECOVERY BUNK NAP (-16 s from Sol clock)</b><small>Gradually reduces -42% Fatigue and restores +12% Morale, consuming 16 seconds of today's shift.</small>`;
      btnNap.addEventListener('click', () => {
        if (!G.inside) {
          toast('You must be inside the Dome or Armored Shelter to rest.', 'bad');
          closeRestModal();
          return;
        }
        G.fatigue = Math.max(0, G.fatigue - 42);
        G.morale = clamp(G.morale + 12, 0, 100);
        G.solTime = Math.min(G.solLen - 2, G.solTime + 16);
        Sound.calm();
        hideScreens();
        G.phase = 'playing';
        toast(`Rested for 16 s. Fatigue reduced to ${Math.round(G.fatigue)}% · Performance restored.`, 'good');
        syncHud();
      });
      box.appendChild(btnNap);

      if (G.solIdx < SOLS.length - 1) {
        const btnSleepSol = document.createElement('button');
        btnSleepSol.className = 'emo-choice-btn nasa-opt';
        btnSleepSol.innerHTML = `<b>2. SLEEP UNTIL DAWN (Advance to Sol ${pad2(G.sol + 1)} with 0% Fatigue)</b><small>Restores 100% biological performance, but unrepaired systems (${pendingNames}) remain offline overnight.</small>`;
        btnSleepSol.addEventListener('click', () => {
          if (!G.inside) {
            toast('Return inside the Dome (x < 465) to sleep through the night.', 'bad');
            closeRestModal();
            return;
          }
          hideScreens();
          G.fatigue = 0;
          G.offlineSystems = {};
          allPending.forEach(k => {
            G.offlineSystems[k] = true;
            G.systems[k] = Math.max(12, G.systems[k] - 16);
          });
          nextSol(true);
        });
        box.appendChild(btnSleepSol);
      }

      const btnWork = document.createElement('button');
      btnWork.className = 'emo-choice-btn nasa-opt';
      btnWork.innerHTML = `<b>3. KEEP WORKING WITHOUT SLEEP (Finish repairs today)</b><small>Keeps equipment online today, but you will accumulate fatigue and face extra verification checks.</small>`;
      btnWork.addEventListener('click', closeRestModal);
      box.appendChild(btnWork);

      showScreen('screen-rest');
      Sound.blip();
    });
  }

  function closeRestModal() {
    if (G.phase !== 'rest') return;
    hideScreens();
    G.phase = 'playing';
    G.safeGraceT = 3.0;
    syncHud();
  }

  // =========================================================================
  // NASA MECHANIC 2: DUST STORMS & ELECTRICAL POWER BUDGET
  // =========================================================================
  function openPowerModal() {
    if (G.phase !== 'playing' || G.minigame) return;
    openTutorialIfFirst('power', () => {
      G.phase = 'power';
      keys.left = keys.right = keys.up = keys.down = keys.shift = false;
      renderPowerModalContent();
      showScreen('screen-power');
      Sound.blip();
    });
  }

  function renderPowerModalContent() {
    const netKw = computePowerBudget();
    const atmPct = G.storm.active ? Math.round(G.storm.level * 72) : 0;
    const sumEl = $('power-summary');
    sumEl.innerHTML = `
      <div><span>SOLAR GENERATION</span><b style="color:#e599f7">${G.solarGenKw.toFixed(1)} kW</b><span style="margin-top:.2em">Panel dust: ${Math.round(G.panelDust)}% · Atmosphere: -${atmPct}%</span></div>
      <div><span>DOME CONSUMPTION</span><b style="color:#b197fc">${G.powerLoadKw.toFixed(1)} kW</b><span style="margin-top:.2em">Battery reserve: ${Math.round(G.systems.energy)}%</span></div>
      <div><span>NET BALANCE</span><b style="color:${netKw >= 0 ? '#d0bfff' : '#be4bdb'}">${netKw >= 0 ? '+' : ''}${netKw.toFixed(1)} kW</b><span style="margin-top:.2em">${netKw >= 0 ? 'Batteries charging' : 'Draining batteries!'}</span></div>
    `;

    const listEl = $('power-loads-list');
    listEl.innerHTML = '';
    Object.keys(POWER_LOADS).forEach(k => {
      const item = POWER_LOADS[k];
      const on = G.loads[k];
      const row = document.createElement('div');
      row.className = 'load-row' + (on ? '' : ' off');
      row.innerHTML = `
        <div class="load-info">
          <b>[${item.priority}] ${item.name} (${item.kw.toFixed(1)} kW)</b>
          <span>${item.desc}</span>
        </div>
      `;
      const btn = document.createElement('button');
      btn.className = 'load-toggle';
      btn.textContent = on ? 'ONLINE · ON' : 'SHED · OFF';
      btn.addEventListener('click', () => {
        G.loads[k] = !G.loads[k];
        Sound.blip();
        renderPowerModalContent();
        syncHud();
      });
      row.appendChild(btn);
      listEl.appendChild(row);
    });
  }

  function closePowerModal() {
    if (G.phase !== 'power') return;
    hideScreens();
    G.phase = 'playing';
    G.safeGraceT = 3.0;
    syncHud();
  }

  // =========================================================================
  // NASA MECHANIC 3: OXYGEN AVAILABLE, HAZARDOUS AIR (ECLSS)
  // =========================================================================
  function openEclssModal() {
    if (G.phase !== 'playing' || G.minigame) return;
    openTutorialIfFirst('eclss', () => {
      G.phase = 'eclss';
      keys.left = keys.right = keys.up = keys.down = keys.shift = false;
      renderEclssModalContent();
      showScreen('screen-eclss');
      Sound.blip();
    });
  }

  function renderEclssModalContent() {
    const co2PpmPct = (0.04 + (G.co2 / 100) * 4.46).toFixed(2);
    const faultTxt = G.co2Fault === 'greenhouse'
      ? 'ACTIVE FAULT IN GREENHOUSE CO₂ SCRUBBER (x 395)!'
      : (G.co2Fault === 'main' ? 'ACTIVE FAULT IN CENTRAL DOME CO₂ FILTER (x 275)!' : 'CDRA scrubbers operating normally.');

    $('eclss-status-body').textContent =
      `DOME ENVIRONMENTAL TELEMETRY (NASA ECLSS):\n` +
      `• Oxygen Reserve (O₂): ${Math.round(G.o2)}%  |  Atmospheric Pressure: ${G.pressure.toFixed(1)} kPa\n` +
      `• CO₂ Concentration: ${co2PpmPct}% (Toxicity Index: ${Math.round(G.co2)}% — Hazardous > 50%, Lethal 100%)\n` +
      `• Module Status: ${faultTxt}\n` +
      `• Greenhouse Module: ${G.greenhouseIsolated ? 'ISOLATED & EVACUATED (Contains CO₂, halts crop synthesis)' : 'CONNECTED TO DOME AIRFLOW'}\n` +
      `• Available LiOH Filter Spares: ${G.eclssSpares}`;

    const box = $('eclss-choices');
    box.innerHTML = '';

    const btnIso = document.createElement('button');
    btnIso.className = 'emo-choice-btn nasa-opt';
    if (!G.greenhouseIsolated) {
      btnIso.innerHTML = `<b>1. EVACUATE & ISOLATE GREENHOUSE MODULE (Seal bulkhead)</b><small>Contains the greenhouse CO₂ leak without spending spares, but halts food synthesis until repaired.</small>`;
    } else {
      btnIso.innerHTML = `<b>1. REOPEN & VENTILATE GREENHOUSE MODULE</b><small>Restores access to the greenhouse (x 395) so you can operate hydroponic crops.</small>`;
    }
    btnIso.addEventListener('click', () => {
      G.greenhouseIsolated = !G.greenhouseIsolated;
      Sound.pop();
      toast(G.greenhouseIsolated
        ? 'Greenhouse Module evacuated and isolated. Agricultural CO₂ no longer contaminates the dome.'
        : 'Greenhouse bulkhead reopened.', 'good');
      renderEclssModalContent();
      syncHud();
    });
    box.appendChild(btnIso);

    const btnSpareGreen = document.createElement('button');
    btnSpareGreen.className = 'emo-choice-btn nasa-opt';
    btnSpareGreen.innerHTML = `<b>2. USE ECLSS SPARE ON GREENHOUSE (Spares: ${G.eclssSpares})</b><small>Decision: Immediately restores the greenhouse scrubber, reopens the module, and saves the harvest (+24% Crops), leaving no spare for the main habitat.</small>`;
    btnSpareGreen.addEventListener('click', () => {
      if (G.eclssSpares <= 0) {
        toast('No ECLSS spares remaining this Sol.', 'bad');
        return;
      }
      G.eclssSpares--;
      if (G.co2Fault === 'greenhouse') G.co2Fault = null;
      G.greenhouseIsolated = false;
      G.co2 = Math.max(4, G.co2 - 45);
      G.systems.food = Math.min(100, G.systems.food + 24);
      Sound.success();
      toast('Spare installed in Greenhouse: CO₂ scrubbed and harvest saved (+24% Crops).', 'good');
      renderEclssModalContent();
      syncHud();
    });
    box.appendChild(btnSpareGreen);

    const btnSpareMain = document.createElement('button');
    btnSpareMain.className = 'emo-choice-btn nasa-opt';
    btnSpareMain.innerHTML = `<b>3. USE ECLSS SPARE ON MAIN LIFE SUPPORT (Spares: ${G.eclssSpares})</b><small>Decision: Purges central dome CO₂ to minimum, seals pressure leaks (101.3 kPa), and restores +30% Life Support.</small>`;
    btnSpareMain.addEventListener('click', () => {
      if (G.eclssSpares <= 0) {
        toast('No ECLSS spares remaining this Sol.', 'bad');
        return;
      }
      G.eclssSpares--;
      if (G.co2Fault === 'main') G.co2Fault = null;
      G.leak = false;
      G.co2 = 4;
      G.pressure = 101.3;
      G.systems.life = Math.min(100, G.systems.life + 30);
      Sound.success();
      toast('Spare installed in Main Life Support: CO₂ purged, pressure at 101.3 kPa, Life Support +30%.', 'good');
      renderEclssModalContent();
      syncHud();
    });
    box.appendChild(btnSpareMain);

    const btnVent = document.createElement('button');
    btnVent.className = 'emo-choice-btn nasa-opt';
    btnVent.innerHTML = `<b>4. EMERGENCY AIR PURGE USING O₂ RESERVE (-18% O₂ from suit tank)</b><small>Flushes accumulated cabin CO₂ (-35% CO₂) by injecting pure oxygen from your reserves.</small>`;
    btnVent.addEventListener('click', () => {
      if (G.o2 <= 22) {
        toast('O₂ reserve too low to perform a pneumatic purge.', 'bad');
        return;
      }
      G.o2 = Math.max(10, G.o2 - 18);
      G.co2 = Math.max(4, G.co2 - 35);
      Sound.pop();
      toast('Pneumatic purge complete: CO₂ reduced (-35%) in exchange for -18% O₂.', 'good');
      renderEclssModalContent();
      syncHud();
    });
    box.appendChild(btnVent);
  }

  function closeEclssModal() {
    if (G.phase !== 'eclss') return;
    hideScreens();
    G.phase = 'playing';
    G.safeGraceT = 3.0;
    syncHud();
  }

  // =========================================================================
  // CINEMATIC SOL TRANSITION
  // =========================================================================
  function playSolTransition(fromSol, toSolObj, sleptEarly, onComplete) {
    G.phase = 'sol_transition';
    keys.left = keys.right = keys.up = keys.down = keys.shift = false;

    const el = $('sol-transition');
    $('st-kicker').textContent = sleptEarly
      ? 'SLEEP CYCLE COMPLETE · CIRCADIAN RHYTHM RESTORED'
      : 'MARTIAN ROTATION COMPLETE · NEW DAWN';
    $('st-title').textContent = `SOL ${pad2(fromSol)} ➔ SOL ${pad2(toSolObj.n)}`;
    $('st-sub').textContent = `PROTOCOL ${toSolObj.title} · SECTOR ARES-1`;

    const offCount = Object.keys(G.offlineSystems).length;
    $('st-report').innerHTML = `
      <div><span>FATIGUE / PERFORMANCE</span><b style="color:#d0bfff">${Math.round(G.fatigue)}% / ${Math.round(getFatigueSpeedMult() * 100)}%</b></div>
      <div><span>PANEL DUST</span><b style="color:#e599f7">${Math.round(G.panelDust)}%</b></div>
      <div><span>OFFLINE EQUIPMENT</span><b style="color:${offCount ? '#be4bdb' : '#d0bfff'}">${offCount ? offCount + ' SYSTEM(S)' : 'NONE'}</b></div>
    `;

    el.classList.remove('active');
    void el.offsetWidth;
    el.classList.add('active');
    Sound.calm();

    setTimeout(() => {
      el.classList.remove('active');
      G.phase = 'playing';
      if (onComplete) onComplete();
    }, 3300);
  }

  // ---------- Narrative & Sol Flow ----------
  function playIntro() {
    stopIntro();
    const box = $('intro-lines');
    box.innerHTML = '';
    INTRO_LINES.forEach((line, i) => {
      const d = document.createElement('div');
      d.className = 'ln' + (line.hl ? ' hl' : '') + (line.small ? ' small' : '');
      d.textContent = line.text;
      box.appendChild(d);
      introTimers.push(setTimeout(() => d.classList.add('on'), 450 + i * 1350));
    });
    const btn = $('btn-intro-next');
    btn.classList.add('hidden');
    introTimers.push(setTimeout(() => btn.classList.remove('hidden'), 450 + INTRO_LINES.length * 1350));
  }

  function stopIntro() {
    introTimers.forEach(clearTimeout);
    introTimers = [];
  }

  function startSol(idx) {
    const s = SOLS[idx];
    G.solIdx = idx;
    G.sol = s.n;
    G.solTime = 0;
    G.solLen = s.len;
    G.eventsDone = s.events.map(() => false);
    G.repairedThisSol = {};
    G.objectiveDone = !s.objective;
    G.talkedThisSol = false;
    G.roverUsedThisSol = false;
    G.restWindow = false;
    G.storm = { active: false, kind: null, remaining: 0, level: G.storm ? G.storm.level * 0.35 : 0, warning: false };
    G.msgQ = (s.start || []).map((m, i) => ({ t: 2 + i * 6.5, who: m.who, text: m.text }));
    G.leak = false;

    if (s.reqSystems) {
      s.reqSystems.forEach(sys => {
        G.systems[sys] = Math.min(G.systems[sys], 42);
      });
    }

    spawnEnemiesForSol(idx);
    banner('SOL ' + pad2(s.n), s.title, s.objective ? 'MISSION: ' + s.objective.text : 'SURVIVE THE CME IMPACT · KEEP ALL SYSTEMS ONLINE');
    syncHud();
  }

  function nextSol(sleptEarly = false) {
    const cur = SOLS[G.solIdx];
    if (!sleptEarly && cur.objective && !G.objectiveDone) {
      G.systems.life = Math.max(0, G.systems.life - 12);
      G.morale = Math.max(0, G.morale - 15);
    }
    if (G.solIdx >= SOLS.length - 1) {
      if (G.systems.life > 0 && G.morale > 0) endGame(true, 'win');
      else endGame(false, G.morale <= 0 ? 'morale' : 'life');
      return;
    }

    G.minigame = null;
    const prevSolNum = G.sol;
    const nextIdx = G.solIdx + 1;
    const nextSolObj = SOLS[nextIdx];

    if (!sleptEarly) {
      G.fatigue = Math.max(15, G.fatigue - 20);
      G.offlineSystems = {};
    }

    G.player.x = START_X;
    G.player.face = 1;
    G.o2 = Math.min(100, G.o2 + 38);
    G.dose = Math.max(0, G.dose - 10);
    G.morale = Math.min(100, G.morale + 12);
    if (G.eclssSpares < 1) G.eclssSpares = 1;

    playSolTransition(prevSolNum, nextSolObj, sleptEarly, () => {
      startSol(nextIdx);
      toast(sleptEarly
        ? 'Dawn after full sleep: Fatigue 0% · Unrepaired equipment suffered overnight wear.'
        : 'New Sol reached. O₂ +38% · Rad Dose -10% · ECLSS spare available.', 'good');
    });
  }

  function triggerEvent(ev) {
    if (ev.type === 'msg') {
      toast(`${ev.who} — “${ev.text}”`);
    } else if (ev.type === 'warning') {
      G.storm.warning = true;
      toast('WARNING — ' + ev.text, 'bad');
      Sound.alarm();
    } else if (ev.type === 'storm') {
      G.storm.active = true;
      G.storm.warning = false;
      G.storm.kind = ev.kind;
      G.storm.remaining = ev.dur;
      toast(ev.kind === 'rad'
        ? 'SOLAR FLARE — high radiation and reduced solar output. Manage loads with [B].'
        : 'DUST STORM — solar generation drops and dust settles on panels. Press [B] to prioritize power!', 'bad');
      Sound.thunder();
      Sound.alarm();
    } else if (ev.type === 'co2_fault') {
      G.co2Fault = ev.module || 'greenhouse';
      setThought('co2_hazard');
      toast('ECLSS ALERT — ' + ev.text, 'bad');
      Sound.alarm();
    } else if (ev.type === 'rest_window') {
      G.restWindow = true;
      setThought('high_fatigue');
      toast('CIRCADIAN SCHEDULE — ' + ev.text, 'emo');
      Sound.blip();
    } else if (ev.type === 'leak') {
      G.leak = true;
      G.morale = Math.max(0, G.morale - 8);
      toast('DOME PRESSURE LEAK — atmospheric pressure (kPa) dropping. Repair Life Support or open ECLSS [V].', 'bad');
      Sound.alarm();
    } else if (ev.type === 'overload') {
      if (ev.sys && G.systems[ev.sys] !== undefined) {
        G.systems[ev.sys] = Math.max(10, G.systems[ev.sys] - 15 * G.diff.decayMult);
      }
      toast('SYSTEM FAULT — ' + ev.text, 'bad');
      Sound.zap();
    }
  }

  // =========================================================================
  // 8 MINIGAMES WITH ONE-TIME TUTORIALS & NASA FATIGUE VERIFICATION
  // =========================================================================
  function startMinigame(term) {
    if (term.sys === 'food' && G.greenhouseIsolated) {
      toast('The Greenhouse Module is ISOLATED due to CO₂. Reopen it or use a spare in the ECLSS panel [V].', 'bad');
      return;
    }

    const mode = term.gameType || 'pipes';
    openTutorialIfFirst(mode, () => {
      launchMinigameNow(term, mode);
    });
  }

  function launchMinigameNow(term, mode) {
    const emo = getEmotionalState();
    const emoTimeMod = emo.id === 'firme' ? 3 : (emo.id === 'panico' ? -4 : 0);
    const totalTime = clamp(36 + G.diff.miniTimeBonus + emoTimeMod, 22, 54);
    const needsVerify = G.fatigue >= 42;

    const base = {
      term,
      mode,
      time: totalTime,
      total: totalTime,
      solved: false,
      failed: false,
      end: 0,
      needsVerify,
      verifying: false,
      verifyChecks: [false, false]
    };

    if (mode === 'water') {
      base.purity = 25;
      base.contamination = 0;
      base.particles = [];
      base.spawnT = 0;
      base.laser = null;
    } else if (mode === 'food') {
      base.step = 0;
      base.cursor = 0;
      base.dir = 1;
      base.speed = 1.12 * (G.diffKey === 'hard' || G.diffKey === 'extreme' ? 1.18 : 1);
      base.strikes = 0;
      base.stages = [
        { name: 'HYDROPONIC SPIRULINA', min: 0.34, max: 0.56, col: '#d0bfff', done: false },
        { name: 'MYCELIAL PROTEIN',     min: 0.52, max: 0.72, col: '#e599f7', done: false },
        { name: 'BIO SALTS & GLUCOSE',  min: 0.22, max: 0.40, col: '#b197fc', done: false }
      ];
    } else if (mode === 'solar') {
      base.targetAngle = -35 + Math.floor(Math.random() * 15) * 5;
      base.userAngle = 25;
      base.charge = 15;
      base.dustSpots = [];
      for (let i = 0; i < 9; i++) {
        base.dustSpots.push({
          x: 295 + (i % 3) * 145 + (Math.random() - 0.5) * 55,
          y: 205 + Math.floor(i / 3) * 44 + (Math.random() - 0.5) * 18,
          r: 15 + Math.random() * 6,
          cleaned: false
        });
      }
    } else if (mode === 'rover') {
      base.charge = 0;
      base.nodes = [];
      for (let i = 0; i < 6; i++) {
        base.nodes.push({ active: false, t: 0, maxT: 1.8 });
      }
      base.spawnT = 0.2;
    } else if (mode === 'waste') {
      base.sorted = 0;
      base.target = 8;
      base.errors = 0;
      base.itemTimer = 4.2;
      base.itemMax = 4.2;
      base.current = genWasteItem();
      base.flash = null;
    } else if (mode === 'comms') {
      base.targetFreq = 1.8 + Math.floor(Math.random() * 5) * 0.4;
      base.targetPhase = (Math.floor(Math.random() * 6) - 3) * 0.5;
      base.userFreq = 1.0;
      base.userPhase = 0.0;
      base.lock = 0;
    } else if (mode === 'reactor') {
      base.valves = [
        { p: 25 + Math.random() * 60, v: 18, name: 'PRIMARY VALVE A' },
        { p: 20 + Math.random() * 60, v: -22, name: 'SECONDARY VALVE B' },
        { p: 30 + Math.random() * 55, v: 20, name: 'COOLANT LOOP C' }
      ];
      base.hold = 0;
    } else {
      base.tiles = genPuzzle();
    }

    G.minigame = base;
    G.player.moving = false;
    Sound.blip();
  }

  function completePrimaryTask(m) {
    if (m.needsVerify && !m.verifying) {
      m.verifying = true;
      Sound.alarm();
      return;
    }
    m.solved = true;
    m.end = 0.85;
  }

  function genWasteItem() {
    const catalog = [
      { kind: 'bio',   name: 'WILTED BIOMASS',      col: '#d0bfff', bin: 'COMPOST [A]' },
      { kind: 'bio',   name: 'ALGAE RESIDUE',       col: '#d0bfff', bin: 'COMPOST [A]' },
      { kind: 'metal', name: 'TITANIUM SCRAP',      col: '#9775fa', bin: 'RECYCLE [W]' },
      { kind: 'metal', name: 'SILICON CELLS',       col: '#9775fa', bin: 'RECYCLE [W]' },
      { kind: 'toxic', name: 'PERCHLORATE SLUDGE',  col: '#e599f7', bin: 'PLASMA [D]' },
      { kind: 'toxic', name: 'RADIOACTIVE FILTER',  col: '#e599f7', bin: 'PLASMA [D]' }
    ];
    return catalog[Math.floor(Math.random() * catalog.length)];
  }

  function resolveMini(success) {
    const m = G.minigame;
    if (!m) return;
    const t = m.term;
    G.minigame = null;
    G.safeGraceT = 3.5; // Post-minigame protection buffer

    G.fatigue = clamp(G.fatigue + (G.restWindow ? 16 : 9), 0, 100);

    if (m.mode === 'rover') {
      if (success) {
        G.roverUsedThisSol = true;
        G.shield += 1;
        G.empCd = 0;
        G.o2 = Math.min(100, G.o2 + 25);
        G.systems.energy = Math.min(100, G.systems.energy + 18);
        G.morale = clamp(G.morale + 10, 0, 100);
        G.stats.repairs++;
        Sound.success();
        toast(`ROVER-2 SYNCHRONIZED: +1 Suit Shield · +25% O₂ · +18% Energy.`, 'good');
      } else {
        G.morale = Math.max(0, G.morale - 6);
        Sound.fail();
        toast('Discharge failed on the Rover-2 capacitor bank.', 'bad');
      }
      syncHud();
      return;
    }

    if (success) {
      G.systems[t.sys] = Math.min(100, G.systems[t.sys] + 48);
      G.repairedThisSol[t.sys] = true;
      delete G.offlineSystems[t.sys];
      G.stats.repairs++;
      G.morale = clamp(G.morale + 9, 0, 100);

      if (t.sys === 'energy') {
        G.panelDust = 0;
        toast(G.storm.active
          ? 'Panels cleaned (Deposited dust: 0%), but suspended storm dust still reduces sunlight.'
          : 'Solar panels cleaned (Deposited dust: 0%) · Solar generation restored to maximum.', 'good');
      } else if (t.sys === 'water') {
        G.o2 = Math.min(100, G.o2 + 18);
        G.systems.life = Math.min(100, G.systems.life + 10);
        toast('Water purified: +18% O₂ and +10% Life Support.', 'good');
      } else if (t.sys === 'food') {
        if (G.co2Fault === 'greenhouse') G.co2Fault = null;
        G.co2 = Math.max(4, G.co2 - 25);
        G.dose = Math.max(0, G.dose - 10);
        toast('Greenhouse stabilized and agricultural scrubber cleaned (-CO₂).', 'good');
      } else if (t.sys === 'waste') {
        G.systems.energy = Math.min(100, G.systems.energy + 12);
        G.co2 = Math.max(4, G.co2 - 15);
        toast('Waste processed: +12% Energy and lower CO₂ load.', 'good');
      } else if (t.sys === 'life') {
        G.leak = false;
        if (G.co2Fault === 'main') G.co2Fault = null;
        G.pressure = 101.3;
        G.co2 = Math.max(4, G.co2 - 45);
        toast('ECLSS repaired: Pressure at 101.3 kPa and CO₂ scrubbing restored.', 'good');
      } else {
        toast('TASK COMPLETE — ' + SYSTEMS[t.sys].name + ' at ' + Math.round(G.systems[t.sys]) + '%.', 'good');
      }

      Sound.success();

      if (!G.objectiveDone && checkObjectiveStatus()) {
        G.objectiveDone = true;
        G.morale = clamp(G.morale + 12, 0, 100);
        banner('✓ MISSION ACCOMPLISHED', 'SOL OBJECTIVES COMPLETED', 'YOU MAY SLEEP [Z] OR MAINTAIN THE DOME');
      }
    } else {
      G.systems[t.sys] = Math.max(0, G.systems[t.sys] - 14);
      G.dose = Math.min(100, G.dose + 6);
      G.morale = Math.max(0, G.morale - Math.round(12 * G.diff.stressMult));
      G.stats.fails++;
      Sound.fail();
      toast('OPERATION FAILED — ' + SYSTEMS[t.sys].name + ' -14% · Morale shaken.', 'bad');
    }
    syncHud();
  }

  function abortMinigame() {
    if (!G.minigame) return;
    G.minigame = null;
    G.safeGraceT = 3.0;
    toast('Operation cancelled [ESC].', '');
    Sound.blip();
    syncHud();
  }

  function updateMini(dt) {
    const m = G.minigame;
    if (!m) return;
    if (m.solved) { m.end -= dt; if (m.end <= 0) resolveMini(true); return; }
    if (m.failed) { m.end -= dt; if (m.end <= 0) resolveMini(false); return; }

    m.time -= dt;
    if (m.time <= 0) {
      m.time = 0;
      m.failed = true;
      m.end = 0.9;
      Sound.fail();
      return;
    }

    if (m.verifying) return;

    const fMult = getFatigueSpeedMult();

    if (m.mode === 'water') {
      m.spawnT -= dt;
      if (m.spawnT <= 0) {
        m.spawnT = 0.42;
        const isBad = Math.random() < 0.58;
        m.particles.push({
          x: 290 + Math.random() * 380,
          y: 175,
          vy: 48 + Math.random() * 38,
          vx: (Math.random() - 0.5) * 24,
          r: isBad ? 13 : 12,
          bad: isBad
        });
      }
      if (m.laser) {
        m.laser.t -= dt;
        if (m.laser.t <= 0) m.laser = null;
      }
      for (let i = m.particles.length - 1; i >= 0; i--) {
        const p = m.particles[i];
        p.y += p.vy * dt;
        p.x = clamp(p.x + p.vx * dt, 285, 675);
        if (p.y >= 402) {
          if (p.bad) {
            m.contamination += 25;
            m.purity = Math.max(0, m.purity - 8);
            Sound.fail();
          } else {
            m.purity = Math.min(100, m.purity + 14 * fMult);
            Sound.pop();
          }
          m.particles.splice(i, 1);
        }
      }
      if (m.purity >= 100) completePrimaryTask(m);
      if (m.contamination >= 100) { m.failed = true; m.end = 0.9; Sound.fail(); }

    } else if (m.mode === 'food') {
      m.cursor += m.dir * m.speed * dt;
      if (m.cursor >= 1) { m.cursor = 1; m.dir = -1; }
      if (m.cursor <= 0) { m.cursor = 0; m.dir = 1; }

    } else if (m.mode === 'solar') {
      if (keys.left)  m.userAngle = clamp(m.userAngle - 45 * fMult * dt, -50, 50);
      if (keys.right) m.userAngle = clamp(m.userAngle + 45 * fMult * dt, -50, 50);
      const cleanCount = m.dustSpots.filter(d => d.cleaned).length;
      const cleanRatio = cleanCount / m.dustSpots.length;
      const angleDiff = Math.abs(m.userAngle - m.targetAngle);
      const aligned = angleDiff <= 8;
      if (aligned && cleanRatio >= 0.65) {
        m.charge = Math.min(100, m.charge + (28 + cleanRatio * 24) * fMult * dt);
        if (m.charge >= 100) completePrimaryTask(m);
      } else if (aligned) {
        m.charge = Math.min(100, m.charge + 8 * fMult * dt);
      }

    } else if (m.mode === 'rover') {
      m.spawnT -= dt;
      if (m.spawnT <= 0) {
        m.spawnT = 0.55;
        const inactive = m.nodes.filter(n => !n.active);
        if (inactive.length > 0) {
          const pick = inactive[Math.floor(Math.random() * inactive.length)];
          pick.active = true;
          pick.maxT = 1.75;
          pick.t = pick.maxT;
        }
      }
      m.nodes.forEach(n => {
        if (n.active) {
          n.t -= dt;
          if (n.t <= 0) n.active = false;
        }
      });

    } else if (m.mode === 'waste') {
      m.itemTimer -= dt;
      if (m.flash) {
        m.flash.t -= dt;
        if (m.flash.t <= 0) m.flash = null;
      }
      if (m.itemTimer <= 0) {
        m.errors++;
        Sound.fail();
        m.flash = { col: '#be4bdb', text: 'TIME EXPIRED!', t: 0.5 };
        if (m.errors >= 3) { m.failed = true; m.end = 0.9; return; }
        m.current = genWasteItem();
        m.itemTimer = m.itemMax;
      }

    } else if (m.mode === 'comms') {
      if (keys.left)  m.userFreq = clamp(m.userFreq - 0.9 * dt, 0.6, 4.0);
      if (keys.right) m.userFreq = clamp(m.userFreq + 0.9 * dt, 0.6, 4.0);
      if (keys.up)    m.userPhase = clamp(m.userPhase + 1.8 * dt, -3.0, 3.0);
      if (keys.down)  m.userPhase = clamp(m.userPhase - 1.8 * dt, -3.0, 3.0);

      const df = Math.abs(m.userFreq - m.targetFreq);
      const dp = Math.abs(m.userPhase - m.targetPhase);
      if (df < 0.22 && dp < 0.35) {
        m.lock = Math.min(100, m.lock + 42 * fMult * dt);
        if (m.lock >= 100) completePrimaryTask(m);
      } else {
        m.lock = Math.max(0, m.lock - 18 * dt);
      }

    } else if (m.mode === 'reactor') {
      let allOk = true;
      m.valves.forEach(v => {
        v.p += v.v * dt;
        if (v.p >= 95) { v.p = 95; v.v = -Math.abs(v.v); }
        if (v.p <= 5)  { v.p = 5;  v.v = Math.abs(v.v); }
        if (v.p < 38 || v.p > 66) allOk = false;
      });
      if (allOk) {
        m.hold = Math.min(100, m.hold + 38 * fMult * dt);
        if (m.hold >= 100) completePrimaryTask(m);
      } else {
        m.hold = Math.max(0, m.hold - 16 * dt);
      }
    }
  }

  function triggerVerifyCheck(idx) {
    const m = G.minigame;
    if (!m || !m.verifying || m.solved || m.failed) return;
    m.verifyChecks[idx] = true;
    Sound.pop();
    if (m.verifyChecks[0] && m.verifyChecks[1]) {
      m.verifying = false;
      m.solved = true;
      m.end = 0.85;
    }
  }

  function triggerFoodInject() {
    const m = G.minigame;
    if (!m || m.mode !== 'food' || m.verifying || m.solved || m.failed) return;
    const st = m.stages[m.step];
    if (m.cursor >= st.min && m.cursor <= st.max) {
      st.done = true;
      m.step++;
      m.speed += 0.24;
      Sound.pop();
      if (m.step >= m.stages.length) {
        completePrimaryTask(m);
      }
    } else {
      m.strikes++;
      Sound.fail();
      if (m.strikes >= 3) {
        m.failed = true;
        m.end = 0.9;
      }
    }
  }

  function triggerRoverNode(idx) {
    const m = G.minigame;
    if (!m || m.mode !== 'rover' || m.verifying || m.solved || m.failed) return;
    const n = m.nodes[idx];
    if (n && n.active) {
      n.active = false;
      m.charge = Math.min(100, m.charge + 20 * getFatigueSpeedMult());
      Sound.pop();
      if (m.charge >= 100) {
        completePrimaryTask(m);
      }
    } else {
      m.charge = Math.max(0, m.charge - 8);
      Sound.zap();
    }
  }

  function triggerWasteSort(choiceKind) {
    const m = G.minigame;
    if (!m || m.mode !== 'waste' || m.verifying || m.solved || m.failed) return;
    if (choiceKind === m.current.kind) {
      m.sorted++;
      Sound.pop();
      m.flash = { col: '#d0bfff', text: 'SORTED CORRECTLY!', t: 0.45 };
      if (m.sorted >= m.target) {
        completePrimaryTask(m);
        return;
      }
    } else {
      m.errors++;
      Sound.fail();
      m.flash = { col: '#be4bdb', text: 'WRONG CONTAINER!', t: 0.45 };
      if (m.errors >= 3) {
        m.failed = true;
        m.end = 0.9;
        return;
      }
    }
    m.current = genWasteItem();
    m.itemMax = Math.max(2.3, 4.2 - m.sorted * 0.2);
    m.itemTimer = m.itemMax;
  }

  function handleMiniClick(mx, my) {
    const m = G.minigame;
    if (!m || m.solved || m.failed) return;

    if (m.verifying) {
      if (my >= 275 && my <= 345) {
        if (mx >= 300 && mx <= 460) triggerVerifyCheck(0);
        else if (mx >= 500 && mx <= 660) triggerVerifyCheck(1);
      }
      return;
    }

    const fMult = getFatigueSpeedMult();

    if (m.mode === 'pipes') {
      const L = miniLayout();
      if (mx < L.ox || mx > L.ox + L.gw || my < L.oy || my > L.oy + L.gh) return;
      const c = Math.floor((mx - L.ox) / L.pitch);
      const r = Math.floor((my - L.oy) / L.pitch);
      if (c < 0 || c >= MG.cols || r < 0 || r >= MG.rows) return;
      const t = m.tiles[r * MG.cols + c];
      t.rot = (t.rot + 1) % 4;
      Sound.blip();
      if (isSolvedTiles(m.tiles)) completePrimaryTask(m);

    } else if (m.mode === 'water') {
      for (let i = m.particles.length - 1; i >= 0; i--) {
        const p = m.particles[i];
        const dist = Math.hypot(mx - p.x, my - p.y);
        if (dist <= p.r + 12) {
          m.laser = { x: p.x, y: p.y, col: p.bad ? '#be4bdb' : '#d0bfff', t: 0.14 };
          if (p.bad) {
            m.purity = Math.min(100, m.purity + 9 * fMult);
            Sound.zap();
          } else {
            m.purity = Math.min(100, m.purity + 14 * fMult);
            Sound.pop();
          }
          m.particles.splice(i, 1);
          if (m.purity >= 100) completePrimaryTask(m);
          return;
        }
      }

    } else if (m.mode === 'food') {
      triggerFoodInject();

    } else if (m.mode === 'solar') {
      for (let i = 0; i < m.dustSpots.length; i++) {
        const d = m.dustSpots[i];
        if (!d.cleaned && Math.hypot(mx - d.x, my - d.y) <= d.r + 10) {
          d.cleaned = true;
          m.charge = Math.min(100, m.charge + 6 * fMult);
          Sound.pop();
          if (m.charge >= 100) completePrimaryTask(m);
          return;
        }
      }
      if (mx >= 290 && mx <= 670 && my >= 342 && my <= 384) {
        m.userAngle = -50 + ((mx - 290) / 380) * 100;
        Sound.blip();
      }

    } else if (m.mode === 'rover') {
      m.nodes.forEach((n, idx) => {
        const col = idx % 3, row = Math.floor(idx / 3);
        const nx = 340 + col * 140;
        const ny = 215 + row * 105;
        if (Math.hypot(mx - nx, my - ny) <= 38) {
          triggerRoverNode(idx);
        }
      });

    } else if (m.mode === 'waste') {
      if (my >= 350 && my <= 430) {
        if (mx >= 265 && mx <= 395) triggerWasteSort('bio');
        else if (mx >= 415 && mx <= 545) triggerWasteSort('metal');
        else if (mx >= 565 && mx <= 695) triggerWasteSort('toxic');
      }

    } else if (m.mode === 'comms') {
      if (mx >= 290 && mx <= 670) {
        if (my >= 340 && my <= 376) {
          m.userFreq = 0.6 + ((mx - 290) / 380) * 3.4;
          Sound.blip();
        } else if (my >= 390 && my <= 426) {
          m.userPhase = -3.0 + ((mx - 290) / 380) * 6.0;
          Sound.blip();
        }
      }

    } else if (m.mode === 'reactor') {
      m.valves.forEach((v, idx) => {
        const vx = 340 + idx * 140;
        if (mx >= vx - 45 && mx <= vx + 45 && my >= 165 && my <= 415) {
          v.p = 52;
          v.v = -v.v * 0.85;
          Sound.pop();
        }
      });
    }
  }

  // ---------- General Interaction ----------
  function interact() {
    if (G.minigame || G.phase !== 'playing') return;
    const it = G.nearest;
    if (!it) return;
    if (it.type === 'sys') {
      startMinigame(it.term);
    } else if (it.type === 'bunk') {
      openRestModal();
    } else if (it.type === 'crew') {
      openEmotionModal();
    } else if (it.type === 'rover') {
      if (!G.loads.rover) {
        toast('Rover-2 load is disconnected in the Power Budget [B]. Enable it to use the capacitor bank.', 'bad');
        return;
      }
      if (G.roverUsedThisSol) {
        toast('The Rover-2 auxiliary bank was already discharged this Sol.', '');
        return;
      }
      startMinigame({ sys: 'energy', gameType: 'rover', label: 'ROVER-2 · CAPACITORS' });
    } else if (it.type === 'log') {
      openLog(it.idx);
    } else if (it.type === 'med') {
      G.medUsed = true;
      G.dose = Math.max(0, G.dose - 40);
      G.o2 = Math.min(100, G.o2 + 30);
      G.morale = Math.min(100, G.morale + 18);
      Sound.success();
      toast('VELA — “You earned it. Breathe.” Rad Dose -40 · O₂ +30 · Morale +18.', 'good');
      syncHud();
    }
  }

  function openLog(i) {
    G.phase = 'log';
    G.logs[i] = true;
    G.logsCount = G.logs.filter(Boolean).length;
    G.morale = clamp(G.morale + 10, 0, 100);
    $('log-who').textContent = LOGS[i].who;
    $('log-title').textContent = LOGS[i].title;
    $('log-body').textContent = LOGS[i].body;
    showScreen('screen-log');
    Sound.blip();
    syncHud();
  }

  function closeLog() {
    if (G.phase !== 'log') return;
    hideScreens();
    G.phase = 'playing';
    G.safeGraceT = 3.0;
    Sound.blip();
    syncHud();
  }

  function pauseGame() {
    if (G.phase !== 'playing' || G.minigame) return;
    G.phase = 'paused';
    keys.left = keys.right = keys.up = keys.down = keys.shift = false;
    showScreen('screen-pause');
  }

  function resumeGame() {
    if (G.phase !== 'paused') return;
    hideScreens();
    G.phase = 'playing';
  }

  function endGame(win, cause) {
    if (G.phase === 'end') return;
    G.phase = 'end';
    G.minigame = null;
    keys.left = keys.right = keys.shift = false;
    $('hud').classList.add('hidden');
    $('stage').classList.remove('panic', 'co2-warn');
    hideScreens();
    showScreen('screen-end');

    let kicker = '', title = '', body = '';
    const stats = `
      <div>DIFFICULTY<b>${G.diff.name}</b></div>
      <div>SOLS<b>${win ? 4 : G.solIdx + 1}</b></div>
      <div>MORALE<b>${Math.round(G.morale)}%</b></div>
      <div>REPAIRS<b>${G.stats.repairs}</b></div>
      <div>LOGS<b>${G.logsCount}/5</b></div>`;

    if (win) {
      Sound.success();
      kicker = 'PROTOCOL SOL ZERO · COMPLETED';
      if (G.systems.comms >= 50) {
        title = 'COME';
        body = `At 12:40 local time, with the water purified, CO₂ scrubbed, and the X-band dish locked on Earth, Hiraoka presses the transmitter.<br><br>“ARES-1 IS SELF-SUFFICIENT. COME.”<br><br>Twelve minutes later, in a sinking filter-city, your mother hears your name over the loudspeakers. Four hundred million applications just became a future.<br><br>You were never the spare.`;
      } else {
        title = 'THE DOME BREATHES';
        body = `Life support, the electrical budget, and the hydroponic crops stabilize at 04:12. The X-band tower remains silent: the mast did not survive the CME.<br><br>No one on Earth will know today that Ares-1 survived.<br><br>But this morning clean water runs through the pipes, the bio-synthesizer smells of algae bread, and three people have stopped calling you “the kid.”`;
      }
    } else {
      Sound.fail();
      if (cause === 'o2') {
        title = 'ZERO AIR';
        body = `Your regulator hits zero a few meters from the airlock. Vela finds you kneeling in the dust, wrench still gripped in your glove.<br><br>The dome still stands. It only needed your hands.`;
      } else if (cause === 'co2') {
        title = 'OXYGEN AVAILABLE, LETHAL AIR';
        body = `The oxygen tanks showed plenty of reserve, but unscrubbed carbon dioxide (CO₂) buildup in the module caused severe hypercapnia.<br><br>On Mars, having oxygen is not enough: without scrubbing CO₂ or isolating contaminated modules in time, your own breath becomes poison.`;
      } else if (cause === 'rad') {
        title = 'LETHAL DOSE';
        body = `The dosimeter stops clicking. Not because you are safe—because there is nothing left to measure. The last thing you hear is the Commander calling your name over the open channel.`;
      } else if (cause === 'morale') {
        title = 'SHATTERED IN SILENCE';
        body = `Twelve light-minutes from home, isolation, accumulated fatigue, and the weight of four hundred million souls exceeded what a sixteen-year-old heart could carry.<br><br>You sit beside the bulkhead and turn off the radio.`;
      } else {
        title = 'THE DOME STOPS BREATHING';
        body = `Life support hits zero after power and environmental collapse. Without pressure or thermal filtration, the dome's air becomes an invisible countdown.`;
      }
      kicker = 'END OF TRANSMISSION · SOL ' + pad2(G.solIdx + 1);
    }

    $('end-kicker').textContent = kicker;
    $('end-title').textContent = title;
    $('end-body').innerHTML = body;
    $('end-stats').innerHTML = stats;
  }

  // ---------- Main Simulation Update (Pauses World Clock & Enemies During Tutorials & Minigames) ----------
  function update(dt) {
    G.time += dt;
    if (G.phase !== 'playing') return;

    // If a minigame is open, only update the minigame so Stalker robots cannot attack while operating!
    if (G.minigame) {
      updateMini(dt);
      G.hudT -= dt;
      if (G.hudT <= 0) { syncHud(); G.hudT = 0.1; }
      return;
    }

    if (G.safeGraceT > 0) G.safeGraceT = Math.max(0, G.safeGraceT - dt);
    G.solTime += dt;
    if (G.empCd > 0) G.empCd = Math.max(0, G.empCd - dt);
    if (G.empFlash > 0) G.empFlash = Math.max(0, G.empFlash - dt * 2.5);
    if (G.restCd > 0) G.restCd = Math.max(0, G.restCd - dt);
    if (G.decoyCd > 0) G.decoyCd = Math.max(0, G.decoyCd - dt);
    if (G.decoy.active) {
      G.decoy.t -= dt;
      if (G.decoy.t <= 0) {
        G.decoy.active = false;
        G.decoy.t = 0;
      }
    }

    while (G.msgQ.length && G.solTime >= G.msgQ[0].t) {
      const m = G.msgQ.shift();
      toast(`${m.who} — “${m.text}”`);
    }

    const script = SOLS[G.solIdx];
    script.events.forEach((ev, i) => {
      if (!G.eventsDone[i] && G.solTime >= ev.t) {
        G.eventsDone[i] = true;
        triggerEvent(ev);
      }
    });

    const st = G.storm;
    if (st.active) {
      st.remaining -= dt;
      st.level = Math.min(1, st.level + dt * 0.85);
      if (st.kind === 'dust') {
        G.panelDust = clamp(G.panelDust + 1.55 * dt, 0, 95);
      } else {
        G.panelDust = clamp(G.panelDust + 0.45 * dt, 0, 95);
      }
      if (st.remaining <= 0) {
        st.active = false;
        st.warning = false;
        st.remaining = 0;
        toast(st.kind === 'rad'
          ? 'Radiation front has passed. Dosimeter stabilized.'
          : `Storm subsiding, but ${Math.round(G.panelDust)}% dust remains deposited on solar panels (x 800).`, 'good');
      }
    } else {
      st.level = Math.max(0, st.level - dt * 0.55);
      G.panelDust = clamp(G.panelDust + 0.08 * dt, 0, 95);
    }

    const emo = getEmotionalState();
    const p = G.player;
    const wasInside = G.inside;

    let dir = 0;
    if (keys.left) dir -= 1;
    if (keys.right) dir += 1;
    p.sprinting = keys.shift && dir !== 0 && G.o2 > 12;
    if (dir !== 0) {
      const baseSpeed = p.sprinting ? 242 : 165;
      const fatigueMoveMod = G.fatigue > 70 ? 0.86 : 1.0;
      const moveSpeed = baseSpeed * emo.speedMult * fatigueMoveMod;
      p.x = clamp(p.x + dir * moveSpeed * dt, 60, WORLD.width - 60);
      p.face = dir;
      p.moving = true;
      G.stepT -= dt;
      if (G.stepT <= 0) {
        Sound.step();
        G.stepT = p.sprinting ? 0.22 : 0.34;
      }
    } else {
      p.moving = false;
    }

    G.inside = (p.x > 92 && p.x < 466) || Math.abs(p.x - SHELTER.x) < SHELTER.half + 4;
    if (!wasInside && G.inside) setThought('dome_safe');

    if (G.restWindow) {
      G.fatigue = clamp(G.fatigue + (G.inside && !p.moving ? 0.15 : 0.85) * dt, 0, 100);
    } else {
      G.fatigue = clamp(G.fatigue + (p.sprinting ? 0.28 : 0.12) * dt, 0, 100);
    }

    updateEnemies(dt);

    const dMult = G.diff.decayMult;
    const netKw = computePowerBudget();
    if (netKw < 0) {
      G.systems.energy = Math.max(0, G.systems.energy + netKw * 0.24 * dMult * dt);
    } else {
      G.systems.energy = Math.min(100, G.systems.energy + netKw * 0.08 * dt);
    }

    G.systems.water = Math.max(0, G.systems.water - 0.15 * dMult * dt);
    G.systems.waste = Math.max(0, G.systems.waste - 0.14 * dMult * dt);

    const foodDecay = (!G.loads.greenhouse ? 0.52 : (G.greenhouseIsolated ? 0.35 : 0.13)) * dMult;
    G.systems.food = Math.max(0, G.systems.food - foodDecay * dt);

    if (!G.loads.lab) {
      G.systems.comms = Math.max(0, G.systems.comms - 0.38 * dMult * dt);
    }

    if (G.systems.energy <= 2) {
      G.systems.life = Math.max(0, G.systems.life - 0.65 * dMult * dt);
    }

    if (G.leak || G.systems.life < 25) {
      G.pressure = Math.max(45, G.pressure - 0.75 * dMult * dt);
    } else {
      G.pressure = Math.min(101.3, G.pressure + 0.6 * dt);
    }

    let co2Rate = -0.35;
    if (!G.loads.eclss || G.systems.energy <= 2) {
      co2Rate = 1.65 * dMult;
    } else if (G.co2Fault === 'main') {
      co2Rate = 1.55 * dMult;
    } else if (G.co2Fault === 'greenhouse') {
      co2Rate = G.greenhouseIsolated ? -0.25 : 1.45 * dMult;
    }
    G.co2 = clamp(G.co2 + co2Rate * dt, 4, 100);

    if (G.systems.water < 20) G.systems.life = Math.max(0, G.systems.life - 0.22 * dMult * dt);
    if (G.systems.waste < 20) G.systems.life = Math.max(0, G.systems.life - 0.22 * dMult * dt);

    let moraleRate = 0;
    if (G.inside) {
      moraleRate = G.co2 > 55 ? -0.65 : 0.65;
    } else {
      moraleRate = -0.32 * G.diff.stressMult;
      if (st.active) moraleRate -= 0.75 * G.diff.stressMult;
    }
    if (G.systems.life < 30 || G.systems.food < 25 || G.fatigue > 78) {
      moraleRate -= 0.32 * G.diff.stressMult;
    }
    G.morale = clamp(G.morale + moraleRate * dt, 0, 100);

    if (G.morale < 28 || (G.inside && G.co2 > 65)) {
      G.heartbeatT -= dt;
      if (G.heartbeatT <= 0) {
        Sound.heartbeat();
        G.heartbeatT = 1.15;
      }
    }

    G.thoughtT -= dt;
    if (G.thoughtT <= 0) {
      if (G.co2 > 45 && G.inside) setThought('co2_hazard');
      else if (G.fatigue > 62) setThought('high_fatigue');
      else if (G.morale < 35) setThought('low_morale');
      else if (!G.inside) setThought('outside_calm');
      else G.thoughtT = 8;
    }

    const lvl = st.level;
    let o2Rate = -0.86 * G.diff.o2DrainMult * emo.o2Mult;
    let radRate = 0.30 * G.diff.radMult;
    if (p.sprinting && !G.inside) o2Rate -= 0.55;
    if (st.kind === 'dust') {
      radRate += 1.45 * lvl * G.diff.radMult;
      o2Rate -= 0.45 * lvl;
    } else if (st.kind === 'rad') {
      radRate += 5.8 * lvl * G.diff.radMult;
      o2Rate -= 0.5 * lvl;
    }

    if (G.inside) {
      if (G.systems.life > 0 && G.loads.eclss && G.pressure > 60) {
        o2Rate = 3.6 + G.systems.life * 0.05;
        radRate = -2.2;
      } else {
        o2Rate = -1.2;
        radRate = 0;
      }
    } else if (G.systems.life <= 0) {
      o2Rate -= 0.8;
    }

    G.o2 = clamp(G.o2 + o2Rate * dt, 0, 100);
    G.dose = clamp(G.dose + radRate * dt, 0, 100);

    if (G.leak) G.systems.life = Math.max(0, G.systems.life - 0.65 * dMult * dt);
    if (G.solIdx === 3 && st.active) {
      Object.keys(G.systems).forEach(k => { G.systems[k] = Math.max(0, G.systems[k] - 0.55 * dMult * dt); });
    }

    let best = null, bd = 48;
    for (const it of INTERACTABLES) {
      if (it.type === 'log' && G.logs[it.idx]) continue;
      if (it.type === 'med' && G.medUsed) continue;
      if (it.type === 'rover' && G.roverUsedThisSol) continue;
      const d = Math.abs(p.x - it.x);
      if (d < bd) { bd = d; best = it; }
    }
    G.nearest = best;

    const camTarget = clamp(p.x - 480, 0, WORLD.width - 960);
    G.cam += (camTarget - G.cam) * Math.min(1, dt * 6);

    G.ambT -= dt;
    if (G.ambT <= 0) { Sound.setStorm(lvl * 0.9, st.kind === 'rad'); G.ambT = 0.35; }

    G.hudT -= dt;
    if (G.hudT <= 0) { syncHud(); G.hudT = 0.1; }

    if (G.solTime >= G.solLen) {
      nextSol(false);
      if (G.phase !== 'playing') return;
    }

    if (G.o2 <= 0) { endGame(false, 'o2'); return; }
    if (G.co2 >= 100 && G.inside) { endGame(false, 'co2'); return; }
    if (G.dose >= 100) { endGame(false, 'rad'); return; }
    if (G.morale <= 0) { endGame(false, 'morale'); return; }
  }

  // =========================================================================
  // MINIGAME RENDERING IN PURPLE / NEON PURPLE / GRAY PALETTE
  // =========================================================================
  function rotMask(base, rot) {
    let m = base & 15;
    const r = ((rot % 4) + 4) % 4;
    for (let i = 0; i < r; i++) m = ((m << 1) | (m >> 3)) & 15;
    return m;
  }

  function genPuzzle() {
    const cols = MG.cols, rows = MG.rows;
    const key = (c, r) => c + ',' + r;
    const used = new Set();
    const path = [];
    let c = 0, r = 2;
    const add = (cc, rr) => {
      const k = key(cc, rr);
      if (used.has(k)) return false;
      used.add(k); path.push([cc, rr]);
      return true;
    };
    add(0, 2);
    while (c < cols - 1) {
      if (c === cols - 2) {
        while (r !== 2) { const nr = r + Math.sign(2 - r); add(c, nr); r = nr; }
      } else if (Math.random() < 0.38) {
        const nr = r + (Math.random() < 0.5 ? -1 : 1);
        if (nr >= 0 && nr < rows && !used.has(key(c, nr))) { add(c, nr); r = nr; }
      }
      c++;
      add(c, r);
    }

    const conn = new Map();
    path.forEach(([cc, rr]) => conn.set(key(cc, rr), 0));
    for (let i = 0; i < path.length - 1; i++) {
      const [c1, r1] = path[i], [c2, r2] = path[i + 1];
      let b1 = 0, b2 = 0;
      if (c2 > c1) { b1 = 2; b2 = 8; }
      else if (c2 < c1) { b1 = 8; b2 = 2; }
      else if (r2 < r1) { b1 = 1; b2 = 4; }
      else if (r2 > r1) { b1 = 4; b2 = 1; }
      const k1 = key(c1, r1), k2 = key(c2, r2);
      conn.set(k1, conn.get(k1) | b1);
      conn.set(k2, conn.get(k2) | b2);
    }
    conn.set(key(0, 2), conn.get(key(0, 2)) | 8);
    conn.set(key(cols - 1, 2), conn.get(key(cols - 1, 2)) | 2);

    const fillers = [3, 6, 12, 9, 5, 10, 15];
    const tiles = [];
    for (let i = 0; i < cols * rows; i++) {
      const cc = i % cols, rr0 = (i / cols) | 0;
      const mask = conn.get(key(cc, rr0));
      if (mask !== undefined) {
        tiles.push({ base: mask, rot: Math.floor(Math.random() * 4) });
      } else {
        const has = Math.random() < 0.68;
        tiles.push({ base: has ? fillers[Math.floor(Math.random() * fillers.length)] : 0, rot: Math.floor(Math.random() * 4) });
      }
    }
    let guard = 0;
    while (isSolvedTiles(tiles) && guard++ < 24) {
      const p = path[Math.floor(Math.random() * path.length)];
      const t = tiles[p[1] * cols + p[0]];
      t.rot = (t.rot + 1) % 4;
    }
    return tiles;
  }

  function poweredSet(tiles) {
    const { cols, rows } = MG;
    const seen = new Set();
    const si = 2 * cols;
    if (!(rotMask(tiles[si].base, tiles[si].rot) & 8)) return seen;
    seen.add(si);
    const q = [si];
    while (q.length) {
      const i = q.pop();
      const c = i % cols, r = (i / cols) | 0;
      const m = rotMask(tiles[i].base, tiles[i].rot);
      const visit = (cc, rr, bit, opp) => {
        if (cc < 0 || cc >= cols || rr < 0 || rr >= rows || !(m & bit)) return;
        const ni = rr * cols + cc;
        const nm = rotMask(tiles[ni].base, tiles[ni].rot);
        if ((nm & opp) && !seen.has(ni)) { seen.add(ni); q.push(ni); }
      };
      visit(c + 1, r, 2, 8);
      visit(c - 1, r, 8, 2);
      visit(c, r + 1, 4, 1);
      visit(c, r - 1, 1, 4);
    }
    return seen;
  }

  function isSolvedTiles(tiles) {
    const seen = poweredSet(tiles);
    const idx = 2 * MG.cols + (MG.cols - 1);
    return seen.has(idx) && !!(rotMask(tiles[idx].base, tiles[idx].rot) & 2);
  }

  function miniLayout() {
    const pitch = 60;
    const gw = MG.cols * pitch, gh = MG.rows * pitch;
    return { pitch, gw, gh, ox: (960 - gw) / 2, oy: 140 };
  }

  function rrGame(c, x, y, w, h, r = 4) {
    const rad = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rad, y);
    c.arcTo(x + w, y, x + w, y + h, rad);
    c.arcTo(x + w, y + h, x, y + h, rad);
    c.arcTo(x, y + h, x, y, rad);
    c.arcTo(x, y, x + w, y, rad);
    c.closePath();
  }

  function drawMiniShell(c, m, title, subtitle) {
    const F = '"Cascadia Mono","Consolas",monospace';
    const sysColor = SYSTEMS[m.term.sys] ? SYSTEMS[m.term.sys].color : '#e599f7';

    c.fillStyle = 'rgba(9, 5, 18, 0.88)';
    c.fillRect(0, 0, 960, 540);

    c.fillStyle = 'rgba(18, 11, 32, 0.98)';
    c.strokeStyle = sysColor;
    c.lineWidth = 2;
    rrGame(c, 224, 68, 512, 442, 6);
    c.fill();
    c.stroke();

    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = sysColor;
    c.font = '800 16px ' + F;
    c.fillText(title, 480, 98);
    c.fillStyle = '#ced4da';
    c.font = '11px ' + F;
    c.fillText(subtitle, 480, 120);

    const pct = Math.max(0, m.time / m.total);
    c.fillStyle = 'rgba(255,255,255,.10)';
    c.fillRect(272, 462, 416, 7);
    c.fillStyle = m.time < 10 ? '#be4bdb' : sysColor;
    c.fillRect(272, 462, 416 * pct, 7);
    const perfPct = Math.round(getFatigueSpeedMult() * 100);
    c.fillStyle = m.time < 10 ? '#e599f7' : '#dee2e6';
    c.font = '700 11px ' + F;
    c.fillText(`T-${Math.ceil(m.time)}s · FATIGUE PERFORMANCE: ${perfPct}% · [ESC] EXIT MECHANIC`, 480, 486);
  }

  function drawMini(c) {
    const m = G.minigame;
    if (!m) return;
    const F = '"Cascadia Mono","Consolas",monospace';

    c.save();

    if (m.mode === 'water') {
      drawMiniShell(c, m, 'H₂O WATER PURIFICATION', 'CLICK NEON-MAGENTA PERCHLORATES (ClO₄) BEFORE THEY HIT THE MEMBRANE');

      c.fillStyle = '#120a21';
      c.strokeStyle = '#9775fa';
      c.lineWidth = 1.5;
      c.fillRect(272, 152, 416, 260);
      c.strokeRect(272, 152, 416, 260);

      c.fillStyle = 'rgba(151, 117, 250, 0.25)';
      c.fillRect(272, 396, 416, 16);
      c.fillStyle = '#d0bfff';
      c.font = '700 9.5px ' + F;
      c.fillText('REVERSE OSMOSIS MEMBRANE (BLOCK ClO₄ TOXINS)', 480, 404);

      m.particles.forEach(p => {
        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c.fillStyle = p.bad ? '#be4bdb' : '#7950f2';
        c.fill();
        c.lineWidth = 2;
        c.strokeStyle = p.bad ? '#f3d9fa' : '#d0bfff';
        c.stroke();
        c.fillStyle = '#ffffff';
        c.font = '700 8.5px ' + F;
        c.fillText(p.bad ? 'ClO₄' : 'H₂O', p.x, p.y);
      });

      if (m.laser) {
        c.strokeStyle = m.laser.col;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(480, 152);
        c.lineTo(m.laser.x, m.laser.y);
        c.stroke();
      }

      c.textAlign = 'left';
      c.fillStyle = '#d0bfff';
      c.font = '700 11px ' + F;
      c.fillText(`H₂O PURITY: ${Math.round(m.purity)}%`, 276, 434);
      c.fillStyle = 'rgba(255,255,255,0.1)';
      c.fillRect(395, 428, 105, 10);
      c.fillStyle = '#9775fa';
      c.fillRect(395, 428, 1.05 * m.purity, 10);

      c.fillStyle = '#e599f7';
      c.fillText(`TOXICITY: ${Math.round(m.contamination)}%`, 518, 434);
      c.fillStyle = 'rgba(255,255,255,0.1)';
      c.fillRect(615, 428, 70, 10);
      c.fillStyle = '#be4bdb';
      c.fillRect(615, 428, 0.7 * m.contamination, 10);
      c.textAlign = 'center';

    } else if (m.mode === 'food') {
      drawMiniShell(c, m, 'HYDROPONIC NUTRIENT SYNTHESIS', 'PRESS [SPACE] OR [CLICK] WHEN THE INJECTOR IS INSIDE THE NEON PURPLE ZONE');

      m.stages.forEach((st, idx) => {
        const y = 175 + idx * 72;
        const active = idx === m.step;
        c.textAlign = 'left';
        c.fillStyle = st.done ? '#d0bfff' : (active ? '#ffffff' : '#868e96');
        c.font = '700 11.5px ' + F;
        c.fillText(`${idx + 1}. ${st.name} ${st.done ? '[OK]' : ''}`, 280, y - 14);

        c.fillStyle = '#140c24';
        c.strokeStyle = active ? '#e599f7' : '#3b2063';
        c.lineWidth = 1.5;
        c.fillRect(280, y, 400, 28);
        c.strokeRect(280, y, 400, 28);

        const zx = 280 + st.min * 400;
        const zw = (st.max - st.min) * 400;
        c.fillStyle = st.done ? 'rgba(208, 191, 255, 0.45)' : 'rgba(190, 75, 219, 0.35)';
        c.fillRect(zx, y + 2, zw, 24);
        c.strokeStyle = '#e599f7';
        c.strokeRect(zx, y + 2, zw, 24);

        if (active && !m.solved) {
          const cx = 280 + m.cursor * 400;
          c.fillStyle = '#ffffff';
          c.fillRect(cx - 4, y - 5, 8, 38);
        }
      });

      c.textAlign = 'center';
      c.fillStyle = m.strikes > 0 ? '#e599f7' : '#d0bfff';
      c.font = '700 11px ' + F;
      c.fillText(`FAILED BATCHES: ${m.strikes} / 3   ·   CLICK OR PRESS SPACE TO INJECT`, 480, 418);

    } else if (m.mode === 'solar') {
      drawMiniShell(c, m, 'SOLAR ARRAY COLLECTORS', 'CLICK DEPOSITED DUST SPOTS TO CLEAN & ALIGN ANGLE WITH [A / D]');

      for (let p = 0; p < 3; p++) {
        const px = 285 + p * 140;
        c.fillStyle = '#1d1136';
        c.strokeStyle = '#9775fa';
        c.lineWidth = 1.5;
        c.fillRect(px, 162, 110, 145);
        c.strokeRect(px, 162, 110, 145);
        c.strokeStyle = 'rgba(208, 191, 255, 0.25)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(px + 55, 162); c.lineTo(px + 55, 307);
        c.moveTo(px, 210); c.lineTo(px + 110, 210);
        c.moveTo(px, 258); c.lineTo(px + 110, 258);
        c.stroke();
      }

      m.dustSpots.forEach(d => {
        if (d.cleaned) return;
        c.beginPath();
        c.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        c.fillStyle = '#495057';
        c.fill();
        c.strokeStyle = '#e599f7';
        c.lineWidth = 1.5;
        c.stroke();
        c.fillStyle = '#f8f9fa';
        c.font = '700 8.5px ' + F;
        c.fillText('DUST', d.x, d.y);
      });

      c.textAlign = 'left';
      c.fillStyle = '#dee2e6';
      c.font = '700 10.5px ' + F;
      c.fillText('SOLAR INCIDENCE ANGLE [A / D or CLICK]:', 290, 338);
      c.fillStyle = '#140c24';
      c.fillRect(290, 350, 380, 22);
      const tPos = ((m.targetAngle + 50) / 100) * 380;
      c.fillStyle = 'rgba(190, 75, 219, 0.38)';
      c.fillRect(290 + tPos - 18, 350, 36, 22);
      c.strokeStyle = '#e599f7';
      c.strokeRect(290 + tPos - 18, 350, 36, 22);

      const uPos = ((m.userAngle + 50) / 100) * 380;
      c.fillStyle = '#ffffff';
      c.fillRect(290 + uPos - 5, 346, 10, 30);

      const cleanCount = m.dustSpots.filter(d => d.cleaned).length;
      c.textAlign = 'center';
      c.fillStyle = '#e599f7';
      c.font = '700 11.5px ' + F;
      c.fillText(`CLEAN CELLS: ${cleanCount}/9   ·   SOLAR CHARGE: ${Math.round(m.charge)}%`, 480, 418);

    } else if (m.mode === 'rover') {
      drawMiniShell(c, m, 'ROVER-2 · CAPACITOR BANK', 'CLICK OR PRESS [1..6] ON ENERGIZED NODES TO CHARGE YOUR SUIT SHIELD');

      m.nodes.forEach((n, idx) => {
        const col = idx % 3, row = Math.floor(idx / 3);
        const nx = 340 + col * 140;
        const ny = 215 + row * 105;

        c.beginPath();
        c.arc(nx, ny, 34, 0, Math.PI * 2);
        c.fillStyle = n.active ? 'rgba(190, 75, 219, 0.32)' : 'rgba(255,255,255,0.04)';
        c.fill();
        c.lineWidth = n.active ? 3 : 1.5;
        c.strokeStyle = n.active ? '#e599f7' : '#495057';
        c.stroke();

        c.fillStyle = n.active ? '#ffffff' : '#868e96';
        c.font = '700 13px ' + F;
        c.fillText(`[${idx + 1}]`, nx, ny - 5);
        c.font = '700 9.5px ' + F;
        c.fillStyle = n.active ? '#f3d9fa' : '#6c757d';
        c.fillText(n.active ? 'DISCHARGE!' : 'STANDBY', nx, ny + 12);
      });

      c.fillStyle = '#d0bfff';
      c.font = '700 11.5px ' + F;
      c.fillText(`EVA SUIT TRANSFER: ${Math.round(m.charge)}% (GRANTS SHIELD + O₂)`, 480, 422);

    } else if (m.mode === 'waste') {
      drawMiniShell(c, m, 'WASTE RECYCLING & PLASMA INCINERATOR', 'SORT WITH [A / W / D] OR CLICK THE MATCHING CONTAINER');

      c.fillStyle = '#161126';
      c.strokeStyle = m.current.col;
      c.lineWidth = 2;
      rrGame(c, 330, 165, 300, 120, 4);
      c.fill();
      c.stroke();

      c.fillStyle = m.current.col;
      c.font = '700 16px ' + F;
      c.fillText(m.current.name, 480, 210);
      c.fillStyle = '#dee2e6';
      c.font = '11px ' + F;
      c.fillText('REQUIRED BIN: ' + m.current.bin, 480, 242);

      const ipct = Math.max(0, m.itemTimer / m.itemMax);
      c.fillStyle = 'rgba(255,255,255,0.1)';
      c.fillRect(360, 264, 240, 6);
      c.fillStyle = m.current.col;
      c.fillRect(360, 264, 240 * ipct, 6);

      if (m.flash) {
        c.fillStyle = m.flash.col;
        c.font = '700 12px ' + F;
        c.fillText(m.flash.text, 480, 318);
      } else {
        c.fillStyle = '#adb5bd';
        c.font = '700 11px ' + F;
        c.fillText(`ITEMS PROCESSED: ${m.sorted} / ${m.target}   ·   ERRORS: ${m.errors} / 3`, 480, 318);
      }

      const bins = [
        { x: 265, w: 130, col: '#d0bfff', title: '[A / ◄] COMPOST', sub: 'ORGANIC BIO' },
        { x: 415, w: 130, col: '#9775fa', title: '[W / ▲] RECYCLE', sub: 'METAL / SILICON' },
        { x: 565, w: 130, col: '#e599f7', title: '[D / ►] PLASMA',  sub: 'TOXIC / RAD' }
      ];
      bins.forEach(b => {
        c.fillStyle = 'rgba(255,255,255,0.04)';
        c.strokeStyle = b.col;
        c.lineWidth = 1.6;
        rrGame(c, b.x, 350, b.w, 72, 4);
        c.fill();
        c.stroke();
        c.fillStyle = b.col;
        c.font = '700 11px ' + F;
        c.fillText(b.title, b.x + b.w / 2, 376);
        c.fillStyle = '#adb5bd';
        c.font = '9.5px ' + F;
        c.fillText(b.sub, b.x + b.w / 2, 398);
      });

    } else if (m.mode === 'comms') {
      drawMiniShell(c, m, 'X-BAND ANTENNA ALIGNMENT', 'USE [A/D] FREQUENCY & [W/S] PHASE (OR CLICK SLIDERS) TO MATCH THE WAVE');

      c.fillStyle = '#120a21';
      c.strokeStyle = '#9775fa';
      c.lineWidth = 1.5;
      c.fillRect(280, 152, 400, 165);
      c.strokeRect(280, 152, 400, 165);

      c.strokeStyle = 'rgba(229, 153, 247, 0.65)';
      c.lineWidth = 2;
      c.beginPath();
      for (let x = 0; x <= 400; x += 4) {
        const y = 234 + Math.sin((x / 40) * m.targetFreq + m.targetPhase + G.time * 3) * 48;
        if (x === 0) c.moveTo(280 + x, y); else c.lineTo(280 + x, y);
      }
      c.stroke();

      c.strokeStyle = '#d0bfff';
      c.lineWidth = 2.5;
      c.beginPath();
      for (let x = 0; x <= 400; x += 4) {
        const y = 234 + Math.sin((x / 40) * m.userFreq + m.userPhase + G.time * 3) * 48;
        if (x === 0) c.moveTo(280 + x, y); else c.lineTo(280 + x, y);
      }
      c.stroke();

      const drawSlider = (y, lbl, val, min, max) => {
        c.textAlign = 'left';
        c.fillStyle = '#dee2e6';
        c.font = '700 10px ' + F;
        c.fillText(lbl, 290, y - 8);
        c.fillStyle = '#1c1230';
        c.fillRect(290, y, 380, 18);
        const pos = ((val - min) / (max - min)) * 380;
        c.fillStyle = '#e599f7';
        c.fillRect(290 + pos - 6, y - 3, 12, 24);
      };
      drawSlider(350, 'CARRIER FREQUENCY [A / D or CLICK]', m.userFreq, 0.6, 4.0);
      drawSlider(400, 'MODULATION PHASE [W / S or CLICK]', m.userPhase, -3.0, 3.0);

      c.textAlign = 'center';
      c.fillStyle = '#d0bfff';
      c.font = '700 11.5px ' + F;
      c.fillText(`SIGNAL LOCK: ${Math.round(m.lock)}%`, 480, 440);

    } else if (m.mode === 'reactor') {
      drawMiniShell(c, m, 'THERMAL REACTOR STABILIZATION', 'CLICK COLUMNS OR PRESS [1, 2, 3] TO KEEP ALL 3 VALVES IN THE PURPLE SAFE ZONE');

      m.valves.forEach((v, idx) => {
        const vx = 340 + idx * 140;
        c.fillStyle = '#140c24';
        c.strokeStyle = '#495057';
        c.lineWidth = 1.5;
        c.fillRect(vx - 28, 170, 56, 210);
        c.strokeRect(vx - 28, 170, 56, 210);

        const safeTop = 170 + (1 - 0.66) * 210;
        const safeH = (0.66 - 0.38) * 210;
        c.fillStyle = 'rgba(190, 75, 219, 0.28)';
        c.fillRect(vx - 26, safeTop, 52, safeH);
        c.strokeStyle = '#e599f7';
        c.strokeRect(vx - 26, safeTop, 52, safeH);

        const py = 170 + (1 - v.p / 100) * 210;
        const ok = v.p >= 38 && v.p <= 66;
        c.fillStyle = ok ? '#d0bfff' : '#7950f2';
        c.fillRect(vx - 22, py, 44, 380 - py);

        c.fillStyle = '#dee2e6';
        c.font = '700 10.5px ' + F;
        c.fillText(`[${idx + 1}] VALVE ${idx + 1}`, vx, 398);
      });

      c.fillStyle = '#e599f7';
      c.font = '700 11.5px ' + F;
      c.fillText(`CORE STABILITY: ${Math.round(m.hold)}%`, 480, 434);

    } else {
      const L = miniLayout();
      const sysColor = SYSTEMS[m.term.sys].color;
      drawMiniShell(c, m, 'ECLSS CONDUIT BYPASS', 'CLICK CONDUIT TILES TO ROTATE THEM AND CONNECT BATTERY TO ECLSS');

      const seen = poweredSet(m.tiles);
      const startIdx = 2 * MG.cols;
      const targetIdx = 2 * MG.cols + (MG.cols - 1);
      const startMask = rotMask(m.tiles[startIdx].base, m.tiles[startIdx].rot);
      const endMask = rotMask(m.tiles[targetIdx].base, m.tiles[targetIdx].rot);

      let hover = -1;
      if (G.mouse.x >= L.ox && G.mouse.x <= L.ox + L.gw && G.mouse.y >= L.oy && G.mouse.y <= L.oy + L.gh) {
        hover = Math.floor((G.mouse.y - L.oy) / L.pitch) * MG.cols + Math.floor((G.mouse.x - L.ox) / L.pitch);
      }

      for (let r = 0; r < MG.rows; r++) {
        for (let cc = 0; cc < MG.cols; cc++) {
          const i = r * MG.cols + cc;
          const t = m.tiles[i];
          const cx = L.ox + cc * L.pitch + L.pitch / 2;
          const cy = L.oy + r * L.pitch + L.pitch / 2;
          c.fillStyle = seen.has(i) ? 'rgba(190, 75, 219, .18)' : 'rgba(255,255,255,.04)';
          rrGame(c, cx - 26, cy - 26, 52, 52, 3);
          c.fill();
          c.strokeStyle = i === hover ? '#e599f7' : 'rgba(208, 191, 255, .15)';
          c.lineWidth = i === hover ? 1.8 : 1;
          c.stroke();

          const mask = rotMask(t.base, t.rot);
          if (!mask) continue;
          const on = seen.has(i);
          c.strokeStyle = on ? '#e599f7' : '#6c757d';
          c.lineWidth = 5;
          c.lineCap = 'square';
          c.beginPath();
          if (mask & 1) { c.moveTo(cx, cy); c.lineTo(cx, cy - 26); }
          if (mask & 2) { c.moveTo(cx, cy); c.lineTo(cx + 26, cy); }
          if (mask & 4) { c.moveTo(cx, cy); c.lineTo(cx, cy + 26); }
          if (mask & 8) { c.moveTo(cx, cy); c.lineTo(cx - 26, cy); }
          c.stroke();
          c.fillStyle = on ? '#ffffff' : '#adb5bd';
          c.fillRect(cx - 3, cy - 3, 6, 6);
        }
      }

      const rowY = L.oy + 2 * L.pitch + L.pitch / 2;
      const bx = L.ox - 52;
      c.fillStyle = startMask & 8 ? sysColor : '#495057';
      c.fillRect(bx - 12, rowY - 12, 24, 24);
      c.font = '700 9px ' + F;
      c.fillStyle = '#dee2e6';
      c.fillText('BAT', bx, rowY + 24);

      const tx = L.ox + L.gw + 52;
      const done = seen.has(targetIdx) && !!(endMask & 2);
      c.fillStyle = done ? sysColor : '#495057';
      c.fillRect(tx - 12, rowY - 12, 24, 24);
      c.fillStyle = '#120a21';
      c.font = '700 9px ' + F;
      c.fillText(SYSTEMS[m.term.sys].short, tx, rowY);
    }

    // Extra Fatigue Verification Overlay (NASA HRP)
    if (m.verifying && !m.solved && !m.failed) {
      c.fillStyle = 'rgba(14, 8, 26, 0.96)';
      c.strokeStyle = '#e599f7';
      c.lineWidth = 2;
      rrGame(c, 250, 165, 460, 235, 6);
      c.fill();
      c.stroke();

      c.fillStyle = '#e599f7';
      c.font = '800 14.5px ' + F;
      c.fillText('EXTRA FATIGUE SAFETY CHECK (NASA HRP)!', 480, 198);
      c.fillStyle = '#dee2e6';
      c.font = '10.5px ' + F;
      c.fillText(`Your accumulated fatigue (${Math.round(G.fatigue)}%) requires dual safety verification:`, 480, 224);

      [0, 1].forEach(idx => {
        const bx = idx === 0 ? 300 : 500;
        const ok = m.verifyChecks[idx];
        c.fillStyle = ok ? 'rgba(151, 117, 250, 0.30)' : 'rgba(190, 75, 219, 0.18)';
        c.strokeStyle = ok ? '#d0bfff' : '#e599f7';
        c.lineWidth = 2;
        rrGame(c, bx, 275, 160, 70, 4);
        c.fill();
        c.stroke();
        c.fillStyle = ok ? '#d0bfff' : '#ffffff';
        c.font = '800 12px ' + F;
        c.fillText(ok ? `✓ CHECK ${idx + 1} OK` : `[${idx + 1}] VERIFY #${idx + 1}`, bx + 80, 305);
        c.fillStyle = '#adb5bd';
        c.font = '9.5px ' + F;
        c.fillText(ok ? 'CONFIRMED' : 'CLICK OR PRESS ' + (idx + 1), bx + 80, 326);
      });
    }

    if (m.solved || m.failed) {
      c.fillStyle = 'rgba(10, 6, 20, .92)';
      c.fillRect(244, 196, 472, 116);
      c.fillStyle = m.solved ? '#d0bfff' : '#be4bdb';
      c.font = '800 19px ' + F;
      c.fillText(m.solved ? 'OPERATION SUCCESSFUL' : 'SYSTEM FAILURE', 480, 240);
      c.fillStyle = '#dee2e6';
      c.font = '11px ' + F;
      c.fillText(m.solved ? 'PARAMETERS STABILIZED (+MORALE)' : 'OVERLOAD RECORDED (-MORALE)', 480, 268);
    }
    c.restore();
  }

  // ---------- Main Render ----------
  function render() {
    const cam = G.phase === 'title' ? 250 + Math.sin(G.time * 0.06) * 240 : G.cam;
    const S = {
      player: G.player,
      enemies: G.enemies,
      empFlash: G.empFlash,
      shield: G.shield,
      decoy: G.decoy,
      inside: G.inside,
      morale: G.morale,
      fatigue: G.fatigue,
      restWindow: G.restWindow,
      panelDust: G.panelDust,
      co2Fault: G.co2Fault,
      greenhouseIsolated: G.greenhouseIsolated,
      loads: G.loads,
      talkedThisSol: G.talkedThisSol,
      systems: G.systems,
      storm: G.storm,
      o2: G.o2,
      dose: G.dose,
      logs: G.logs,
      medUsed: G.medUsed,
      reqSystems: (G.phase === 'playing' && !G.objectiveDone && SOLS[G.solIdx].reqSystems)
        ? SOLS[G.solIdx].reqSystems : [],
      minigame: !!G.minigame,
      sol: G.sol
    };
    ctx.clearRect(0, 0, 960, 540);
    World.draw(ctx, S, cam, G.time);
    if (G.minigame) drawMini(ctx);
  }

  function frame(ts) {
    if (!lastFrame) lastFrame = ts;
    let dt = (ts - lastFrame) / 1000;
    lastFrame = ts;
    dt = Math.min(dt, 0.05);
    update(dt);
    render();
    rafId = requestAnimationFrame(frame);
  }

  // ---------- Input & Startup ----------
  function beginIntro() {
    Sound.init();
    playIntro();
    showScreen('screen-intro');
  }

  function toggleAudio() {
    Sound.init();
    const muted = Sound.toggleMute();
    const b1 = $('btn-audio');
    if (b1) b1.textContent = 'Audio: ' + (muted ? 'OFF' : 'ON');
    const b2 = $('lbl-hud-music');
    if (b2) b2.textContent = muted ? '♫ OFF' : '♫ ON';
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
    if (k === 'm') { toggleAudio(); return; }
    if (e.key === 'Shift') keys.shift = true;

    // One-time Tutorial Modal Handling
    if (G.phase === 'tutorial') {
      if (k === 'escape') { closeTutorialModal(false); return; }
      if (k === 'enter' || k === 'e' || k === ' ') { closeTutorialModal(true); return; }
      return;
    }

    if (G.phase === 'playing') {
      if (G.minigame) {
        if (k === 'escape') { abortMinigame(); return; }
        const m = G.minigame;
        if (m.verifying) {
          if (k === '1') triggerVerifyCheck(0);
          if (k === '2') triggerVerifyCheck(1);
          return;
        }
        if (m.mode === 'food' && (k === ' ' || k === 'enter' || k === 'e')) {
          triggerFoodInject();
        } else if (m.mode === 'solar') {
          if (k === 'a' || k === 'arrowleft')  keys.left = true;
          if (k === 'd' || k === 'arrowright') keys.right = true;
        } else if (m.mode === 'rover') {
          if (['1', '2', '3', '4', '5', '6'].includes(k)) {
            triggerRoverNode(parseInt(k, 10) - 1);
          }
        } else if (m.mode === 'waste') {
          if (k === 'a' || k === 'arrowleft')  triggerWasteSort('bio');
          if (k === 'w' || k === 'arrowup')    triggerWasteSort('metal');
          if (k === 'd' || k === 'arrowright') triggerWasteSort('toxic');
        } else if (m.mode === 'reactor') {
          if (k === '1') { m.valves[0].p = 52; Sound.pop(); }
          if (k === '2') { m.valves[1].p = 52; Sound.pop(); }
          if (k === '3') { m.valves[2].p = 52; Sound.pop(); }
        } else if (m.mode === 'comms') {
          if (k === 'a' || k === 'arrowleft')  keys.left = true;
          if (k === 'd' || k === 'arrowright') keys.right = true;
          if (k === 'w' || k === 'arrowup')    keys.up = true;
          if (k === 's' || k === 'arrowdown')  keys.down = true;
        }
        return;
      }
      if (k === 'a' || k === 'arrowleft') keys.left = true;
      if (k === 'd' || k === 'arrowright') keys.right = true;
      if (k === ' ' || k === 'f') triggerEmpPulse();
      if (k === 'q' || k === 'c') deployDecoy();
      if (k === 'z') openRestModal();
      if (k === 'b') openPowerModal();
      if (k === 'v') openEclssModal();
      if (k === 'e') interact();
      if (k === 'p' || k === 'escape') pauseGame();
    } else if (G.phase === 'log') {
      if (k === 'e' || k === 'escape') closeLog();
    } else if (G.phase === 'emotion') {
      if (k === 'escape' || (k === 'e' && !$('btn-emo-close').classList.contains('hidden'))) {
        closeEmotionModal();
      }
    } else if (G.phase === 'rest') {
      if (k === 'z' || k === 'escape') closeRestModal();
    } else if (G.phase === 'power') {
      if (k === 'b' || k === 'escape') closePowerModal();
    } else if (G.phase === 'eclss') {
      if (k === 'v' || k === 'escape') closeEclssModal();
    } else if (G.phase === 'paused') {
      if (k === 'p' || k === 'escape') resumeGame();
    } else if (G.phase === 'title' && k === 'enter') {
      beginIntro();
    }
  }

  function init() {
    buildSystems();

    const diffBtns = document.querySelectorAll('.diff-btn');
    diffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        Sound.init();
        Sound.blip();
        const key = btn.getAttribute('data-diff');
        if (!DIFFICULTIES[key]) return;
        G.diffKey = key;
        G.diff = DIFFICULTIES[key];
        diffBtns.forEach(b => b.classList.toggle('active', b === btn));
        const desc = $('diff-desc');
        if (desc) desc.textContent = G.diff.sub;
      });
    });

    $('btn-start').addEventListener('click', beginIntro);
    $('btn-skip-intro').addEventListener('click', () => { stopIntro(); showScreen('screen-brief'); });
    $('btn-intro-next').addEventListener('click', () => { stopIntro(); showScreen('screen-brief'); });
    $('btn-brief-start').addEventListener('click', () => {
      Sound.init();
      hideScreens();
      $('hud').classList.remove('hidden');
      G.phase = 'playing';
      G.player.x = START_X;
      G.morale = 92;
      G.fatigue = 8;
      G.panelDust = 10;
      G.co2 = 4;
      G.pressure = 101.3;
      G.co2Fault = null;
      G.greenhouseIsolated = false;
      G.eclssSpares = 1;
      G.loads = { eclss: true, greenhouse: true, lab: true, rover: true };
      G.offlineSystems = {};
      G.shield = 0;
      startSol(0);
    });
    $('btn-dossier').addEventListener('click', () => { Sound.init(); showScreen('screen-dossier'); });
    $('btn-dossier-back').addEventListener('click', () => showScreen('screen-title'));
    $('btn-audio').addEventListener('click', toggleAudio);
    const btnHudMusic = $('btn-hud-music');
    if (btnHudMusic) btnHudMusic.addEventListener('click', toggleAudio);
    $('btn-resume').addEventListener('click', resumeGame);
    $('btn-log-close').addEventListener('click', closeLog);
    $('btn-emo-close').addEventListener('click', closeEmotionModal);
    $('btn-rest-close').addEventListener('click', closeRestModal);
    $('btn-power-close').addEventListener('click', closePowerModal);
    $('btn-eclss-close').addEventListener('click', closeEclssModal);
    $('btn-tut-start').addEventListener('click', () => closeTutorialModal(true));
    $('btn-tut-exit').addEventListener('click', () => closeTutorialModal(false));
    $('btn-hud-rest').addEventListener('click', openRestModal);
    $('btn-hud-power').addEventListener('click', openPowerModal);
    $('btn-hud-eclss').addEventListener('click', openEclssModal);
    $('btn-restart').addEventListener('click', () => location.reload());

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (e.key === 'Shift') keys.shift = false;
      if (k === 'a' || k === 'arrowleft') keys.left = false;
      if (k === 'd' || k === 'arrowright') keys.right = false;
      if (k === 'w' || k === 'arrowup') keys.up = false;
      if (k === 's' || k === 'arrowdown') keys.down = false;
    });

    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      G.mouse.x = (e.clientX - r.left) * 960 / r.width;
      G.mouse.y = (e.clientY - r.top) * 540 / r.height;
    });
    canvas.addEventListener('click', e => {
      if (!G.minigame) return;
      const r = canvas.getBoundingClientRect();
      handleMiniClick(
        (e.clientX - r.left) * 960 / r.width,
        (e.clientY - r.top) * 540 / r.height
      );
    });

    document.addEventListener('pointerdown', () => Sound.init(), { once: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && G.phase === 'playing' && !G.minigame) pauseGame();
    });

    rafId = requestAnimationFrame(frame);
  }

  init();
})();
