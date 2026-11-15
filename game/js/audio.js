// SOL ZERO — Background Music (attached track + WebAudio fallback) & Procedural SFX
const Sound = (() => {
  let ctx = null, master = null, musicGain = null, windGain = null, windFilter = null, fmGain = null;
  let muted = false, ready = false, stormLevel = 0;
  let bgmEl = null, bgmPlaying = false, synthLoopId = null, synthStep = 0;

  // Melancholic post-rock progression matching the attached track (Am -> F -> C -> Am)
  const CHORDS = [
    [220.00, 261.63, 329.63, 440.00, 523.25, 659.25, 523.25, 329.63], // Am
    [174.61, 220.00, 261.63, 349.23, 440.00, 523.25, 440.00, 261.63], // Fmaj7
    [130.81, 196.00, 261.63, 329.63, 392.00, 523.25, 392.00, 261.63], // C
    [220.00, 246.94, 329.63, 392.00, 493.88, 659.25, 493.88, 329.63]  // Am9 / Em
  ];

  function startBgmElement() {
    bgmEl = document.getElementById('bgm');
    if (!bgmEl) return;
    bgmEl.volume = muted ? 0 : 0.48;
    bgmEl.loop = true;
    const p = bgmEl.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        bgmPlaying = true;
        if (synthLoopId) { clearInterval(synthLoopId); synthLoopId = null; }
      }).catch(() => {
        startSynthBgmFallback();
      });
    }
    bgmEl.addEventListener('error', () => {
      if (!bgmPlaying) startSynthBgmFallback();
    }, { once: true });
  }

  function startSynthBgmFallback() {
    if (synthLoopId || bgmPlaying || !ctx || !musicGain) return;
    synthLoopId = setInterval(() => {
      if (muted || !ctx || ctx.state !== 'running' || bgmPlaying) return;
      const chordIdx = Math.floor(synthStep / 8) % CHORDS.length;
      const noteIdx = synthStep % 8;
      const freq = CHORDS[chordIdx][noteIdx];
      const t = ctx.currentTime;

      // Felt piano / ambient clean guitar arpeggio note
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const flt = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'triangle';
      sub.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      sub.frequency.setValueAtTime(noteIdx === 0 ? freq * 0.5 : freq * 2, t);

      flt.type = 'lowpass';
      flt.frequency.setValueAtTime(1350, t);
      flt.frequency.exponentialRampToValueAtTime(380, t + 1.4);

      const vel = noteIdx === 0 ? 0.065 : (noteIdx === 4 || noteIdx === 5 ? 0.048 : 0.034);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vel, t + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.65);

      osc.connect(flt);
      sub.connect(flt);
      flt.connect(g);
      g.connect(musicGain);
      osc.start(t);
      sub.start(t);
      osc.stop(t + 1.7);
      sub.stop(t + 1.7);

      synthStep++;
    }, 360);
  }

  function init() {
    if (ready) {
      if (ctx && ctx.state === 'suspended') ctx.resume();
      if (!bgmPlaying) startBgmElement();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { startBgmElement(); return; }
    ready = true;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.52;
    master.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.85;
    musicGain.connect(master);

    const len = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const wind = ctx.createBufferSource();
    wind.buffer = buf; wind.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass'; windFilter.frequency.value = 380; windFilter.Q.value = 0.5;
    windGain = ctx.createGain(); windGain.gain.value = 0.022;
    wind.connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
    wind.start();

    const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 55;
    const humGain = ctx.createGain(); humGain.gain.value = 0.012;
    hum.connect(humGain); humGain.connect(master); hum.start();

    const fm = ctx.createOscillator(); fm.type = 'sine'; fm.frequency.value = 1740;
    fmGain = ctx.createGain(); fmGain.gain.value = 0.0;
    fm.connect(fmGain); fmGain.connect(master); fm.start();

    startBgmElement();
    // If HTML5 audio hasn't started after 700ms (e.g. file:// restriction), run the synth fallback
    setTimeout(() => {
      if (!bgmPlaying && (!bgmEl || bgmEl.paused || bgmEl.readyState < 2)) {
        startSynthBgmFallback();
      }
    }, 700);
  }

  function tone(freq, dur, type = 'sine', vol = 0.08, slideTo = null) {
    if (!ready || !ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  function blip() { tone(880, 0.06, 'square', 0.032); }
  function pop() { tone(520, 0.08, 'triangle', 0.048, 980); }
  function zap() { tone(1200, 0.11, 'sawtooth', 0.045, 220); }
  function step() { tone(72, 0.07, 'sine', 0.036, 42); }
  function emp() {
    tone(1480, 0.28, 'sawtooth', 0.075, 110);
    setTimeout(() => tone(640, 0.22, 'triangle', 0.055, 1800), 40);
  }
  function enemyAlert() {
    tone(260, 0.11, 'sawtooth', 0.055, 620);
    setTimeout(() => tone(620, 0.14, 'square', 0.045, 310), 115);
  }
  function heartbeat() {
    tone(54, 0.11, 'sine', 0.065, 36);
    setTimeout(() => tone(46, 0.14, 'sine', 0.048, 30), 160);
  }
  function calm() {
    [392, 493.88, 587.33, 783.99].forEach((f, i) => setTimeout(() => tone(f, 0.36, 'sine', 0.042), i * 110));
  }
  function success() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.05), i * 85));
  }
  function fail() {
    tone(180, 0.5, 'sawtooth', 0.07, 70);
    setTimeout(() => tone(120, 0.6, 'sawtooth', 0.05, 55), 120);
  }
  function alarm() {
    tone(620, 0.16, 'square', 0.05);
    setTimeout(() => tone(430, 0.2, 'square', 0.045), 190);
  }
  function thunder() {
    tone(60, 1.4, 'sine', 0.12, 28);
    setTimeout(() => tone(95, 0.9, 'sine', 0.05, 40), 60);
  }

  function setStorm(level, radiation) {
    stormLevel = Math.max(0, Math.min(1, level));
    if (!ready || !ctx) return;
    const t = ctx.currentTime;
    windGain.gain.linearRampToValueAtTime(0.022 + stormLevel * 0.18, t + 0.8);
    windFilter.frequency.linearRampToValueAtTime(360 + stormLevel * 900, t + 0.8);
    fmGain.gain.linearRampToValueAtTime(radiation ? 0.004 + stormLevel * 0.012 : stormLevel * 0.002, t + 0.8);
  }

  function toggleMute() {
    muted = !muted;
    if (master && ctx) master.gain.linearRampToValueAtTime(muted ? 0 : 0.52, ctx.currentTime + 0.15);
    if (bgmEl) bgmEl.volume = muted ? 0 : 0.48;
    return muted;
  }

  return {
    init, blip, pop, zap, step, emp, enemyAlert, heartbeat, calm,
    success, fail, alarm, thunder, setStorm, toggleMute, isMuted: () => muted
  };
})();
