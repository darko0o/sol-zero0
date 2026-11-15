// SOL ZERO — Mars pixel-art renderer (Martian red / terracotta / sand / space black)
const World = (() => {
  const W = WORLD.width;
  const PW = 480, PH = 270, SCALE = 2;
  const D = WORLD.dome;

  const pCanvas = document.createElement('canvas');
  pCanvas.width = PW;
  pCanvas.height = PH;
  const pCtx = pCanvas.getContext('2d');
  pCtx.imageSmoothingEnabled = false;

  let seed = 20261115;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

  const FONT = '"Cascadia Mono","Consolas",monospace';

  // Warm-white stars over a rust sky
  const stars = [];
  for (let i = 0; i < 58; i++) {
    const r = rnd();
    stars.push({
      x: Math.floor(rnd() * PW),
      y: 5 + Math.floor(rnd() * 96),
      c: r > 0.82 ? '#fff3e2' : (r > 0.45 ? '#f2d6b3' : '#b07a58'),
      size: r > 0.9 ? 2 : 1,
      blink: rnd() * 6.28
    });
  }

  // Layered Martian ridges
  const ranges = [
    { par: 0.04, base: 172, amp: 46, color: '#160a07', hi: '#3a190e', shadow: '#0b0504', pts: [] },
    { par: 0.10, base: 186, amp: 34, color: '#24100a', hi: '#5e2a12', shadow: '#150906', pts: [] },
    { par: 0.18, base: 198, amp: 22, color: '#381709', hi: '#7c3517', shadow: '#200c06', pts: [] },
    { par: 0.28, base: 208, amp: 12, color: '#4c1f0d', hi: '#a24a21', shadow: '#2c1107', pts: [] }
  ];
  ranges.forEach(r => {
    for (let x = -180; x < 1500; x += 22) {
      r.pts.push({ x, y: Math.floor(r.base - rnd() * r.amp) });
    }
  });

  const rocks = [];
  for (let i = 0; i < 110; i++) {
    const x = Math.floor(rnd() * W);
    rocks.push({
      x,
      w: 3 + Math.floor(rnd() * 7),
      h: 2 + Math.floor(rnd() * 5),
      t: rnd()
    });
  }

  const dust = [];
  for (let i = 0; i < 130; i++) {
    dust.push({ x: rnd() * PW, y: rnd() * PH, z: rnd(), p: rnd() * 6.28 });
  }

  const motes = [];
  for (let i = 0; i < 26; i++) {
    motes.push({ x: rnd(), y: rnd(), s: 1 + rnd() * 2, p: rnd() * 6.28 });
  }

  function groundY(x) {
    return 426 + Math.sin(x * 0.003) * 5 + Math.sin(x * 0.012 + 1.7) * 2;
  }
  function pGroundY(x) {
    return Math.floor(groundY(x) / SCALE);
  }
  function pxRect(c, x, y, w, h, col) {
    c.fillStyle = col;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function pxBevelBox(c, x, y, w, h, bg, border, hi, shadow) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    c.fillStyle = bg;
    c.fillRect(x, y, w, h);
    if (border) {
      c.fillStyle = border;
      c.fillRect(x, y, w, 1);
      c.fillRect(x, y + h - 1, w, 1);
      c.fillRect(x, y, 1, h);
      c.fillRect(x + w - 1, y, 1, h);
    }
    if (hi) {
      c.fillStyle = hi;
      c.fillRect(x + 1, y + 1, w - 2, 1);
      c.fillRect(x + 1, y + 1, 1, h - 2);
    }
    if (shadow) {
      c.fillStyle = shadow;
      c.fillRect(x + 1, y + h - 2, w - 2, 1);
      c.fillRect(x + w - 2, y + 1, 1, h - 2);
    }
  }
  function pxCircle(c, cx, cy, r, col) {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    c.fillStyle = col;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r + r * 0.35) c.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }
  function drawSpriteMap(c, ox, oy, rows, palette, flipX = false) {
    ox = Math.round(ox); oy = Math.round(oy);
    for (let r = 0; r < rows.length; r++) {
      const line = rows[r];
      for (let col = 0; col < line.length; col++) {
        const ch = line[col];
        if (ch === '.' || ch === ' ') continue;
        const color = palette[ch];
        if (!color) continue;
        const x = flipX ? (line.length - 1 - col) : col;
        c.fillStyle = color;
        c.fillRect(ox + x, oy + r, 1, 1);
      }
    }
  }

  function domeHeight(wx) {
    const t = (wx - D.x) / D.rx;
    return D.ry * Math.sqrt(Math.max(0, 1 - t * t));
  }

  // =========================================================================
  // SKY
  // =========================================================================
  function drawSky(c, S, cam, time) {
    const grad = c.createLinearGradient(0, 0, 0, 216);
    grad.addColorStop(0.00, '#060302');
    grad.addColorStop(0.28, '#140805');
    grad.addColorStop(0.52, '#2c110a');
    grad.addColorStop(0.72, '#54220f');
    grad.addColorStop(0.88, '#8a3a18');
    grad.addColorStop(1.00, '#c46a35');
    c.fillStyle = grad;
    c.fillRect(0, 0, PW, 216);

    stars.forEach(st => {
      if (Math.sin(time * 0.8 + st.blink) > -0.55) {
        c.fillStyle = st.c;
        c.fillRect(st.x, st.y, st.size, st.size);
      }
    });

    // Phobos — irregular warm rock
    const phX = Math.floor(118 - cam * 0.012);
    const phY = 34;
    pxCircle(c, phX, phY, 7, '#6a4a34');
    pxCircle(c, phX - 1, phY - 1, 5, '#96704f');
    pxCircle(c, phX - 2, phY - 2, 3, '#c9a07a');
    pxCircle(c, phX + 2, phY + 1, 2, '#3a271a');

    const deX = Math.floor(322 - cam * 0.007);
    pxCircle(c, deX, 22, 3, '#8a6a4f');
    pxCircle(c, deX - 1, 21, 2, '#d9b58e');

    // Sun behind dust
    const sx = Math.floor(372 - cam * 0.02);
    const sy = 76;
    pxCircle(c, sx, sy, 28, 'rgba(255, 150, 80, 0.10)');
    pxCircle(c, sx, sy, 19, 'rgba(255, 180, 110, 0.16)');
    pxCircle(c, sx, sy, 13, 'rgba(255, 220, 175, 0.30)');
    pxCircle(c, sx, sy, 8, '#ffe9c9');
    pxCircle(c, sx, sy, 5, '#fff8ec');

    ranges.forEach(r => {
      const off = Math.floor(-cam / SCALE * r.par);
      for (let i = 0; i < r.pts.length - 1; i++) {
        const p1 = r.pts[i], p2 = r.pts[i + 1];
        const x1 = off + p1.x, x2 = off + p2.x;
        if (x2 < -10 || x1 > PW + 10) continue;
        const rising = p2.y < p1.y;
        for (let px = x1; px < x2; px++) {
          if (px < 0 || px >= PW) continue;
          const t = (px - x1) / (x2 - x1);
          const py = Math.floor(p1.y + (p2.y - p1.y) * t);
          c.fillStyle = rising ? r.color : r.shadow;
          c.fillRect(px, py, 1, PH - py);
          c.fillStyle = rising ? r.hi : r.color;
          c.fillRect(px, py, 1, 2);
        }
      }
    });
  }

  // =========================================================================
  // TERRAIN
  // =========================================================================
  function drawTerrain(c, S, cam) {
    for (let px = 0; px < PW; px++) {
      const wx = cam + px * SCALE;
      const gy = pGroundY(wx);
      c.fillStyle = '#f3cf9f';
      c.fillRect(px, gy, 1, 1);
      c.fillStyle = '#dfa06a';
      c.fillRect(px, gy + 1, 1, 3);
      c.fillStyle = '#b96b38';
      c.fillRect(px, gy + 4, 1, 7);
      c.fillStyle = '#8c4522';
      c.fillRect(px, gy + 11, 1, 10);
      c.fillStyle = '#5c2a13';
      c.fillRect(px, gy + 21, 1, 14);
      c.fillStyle = '#2c130a';
      c.fillRect(px, gy + 35, 1, PH - (gy + 35));
    }

    // wind-scoured strata breaks
    for (let i = 0; i < 26; i++) {
      const wx = i * 137 + 40;
      const px = Math.floor((wx - cam) / SCALE);
      if (px < -10 || px > PW + 10) continue;
      const gy = pGroundY(wx);
      pxRect(c, px, gy + 13, 6 + (i % 5) * 3, 1, 'rgba(240, 180, 130, 0.28)');
      pxRect(c, px + 3, gy + 24, 4 + (i % 3) * 4, 1, 'rgba(20, 8, 4, 0.35)');
    }

    rocks.forEach(rk => {
      if (rk.x < cam - 30 || rk.x > cam + 990) return;
      if (rk.x > D.left - 30 && rk.x < D.right + 40) return;
      const px = Math.floor((rk.x - cam) / SCALE);
      const py = pGroundY(rk.x) + 1;
      const w = rk.w, h = rk.h;
      pxRect(c, px - w, py, w * 2 + 2, 2, 'rgba(12, 6, 3, 0.6)');
      pxRect(c, px - w, py - h, w * 2, h, '#4a2a1a');
      pxRect(c, px - w, py - h, w, h, rk.t > 0.5 ? '#6b3d24' : '#3a1e12');
      pxRect(c, px - w, py - h, w, 1, '#c98a5c');
    });
  }

  // =========================================================================
  // DOME INTERIOR — wide base spanning x 150..1360
  // =========================================================================
  function drawDomeInterior(c, cam, time, S) {
    const x0 = Math.max(D.left, cam - 30);
    const x1 = Math.min(D.right, cam + PW * SCALE + 30);
    if (x1 <= x0) return;

    // dark pressurized interior
    for (let wx = x0; wx <= x1; wx += 2) {
      const px = Math.floor((wx - cam) / SCALE);
      const gy = pGroundY(wx);
      const h = Math.floor(domeHeight(wx) / SCALE);
      if (h <= 0) continue;
      const top = gy - h;
      c.fillStyle = '#190d08';
      c.fillRect(px, top, 1, h + 2);
      c.fillStyle = 'rgba(230, 96, 42, 0.06)';
      c.fillRect(px, Math.max(top, gy - 40), 1, Math.min(40, gy - top));
    }

    // deck
    const lx = Math.max(0, Math.floor((D.left - cam) / SCALE));
    const rx = Math.min(PW - 1, Math.ceil((D.right - cam) / SCALE));
    for (let px = lx; px <= rx; px++) {
      const wx = cam + px * SCALE;
      if (wx < D.left + 2 || wx > D.right - 1) continue;
      const gy = pGroundY(wx);
      c.fillStyle = '#2b1710';
      c.fillRect(px, gy - 1, 1, 6);
      c.fillStyle = '#4a2a1a';
      c.fillRect(px, gy - 1, 1, 1);
      c.fillStyle = '#150a06';
      c.fillRect(px, gy + 5, 1, 2);
    }
    for (let wx = Math.ceil((D.left + 16) / 26) * 26; wx < D.right - 16; wx += 26) {
      const px = Math.floor((wx - cam) / SCALE);
      if (px < -2 || px > PW + 2) continue;
      const gy = pGroundY(wx);
      pxRect(c, px, gy, 1, 5, 'rgba(12, 6, 3, 0.55)');
      pxRect(c, px, gy - 1, 1, 1, 'rgba(240, 180, 130, 0.20)');
    }

    // cable tray
    for (let px = lx; px <= rx; px += 4) {
      const wx = cam + px * SCALE;
      if (wx < D.left + 12 || wx > D.right - 12) continue;
      const gy = pGroundY(wx);
      pxRect(c, px, gy - 3, 3, 1, '#59301b');
    }

    // ceiling ribs and hanging lamps
    for (let wx = D.left + 30; wx < D.right - 20; wx += 116) {
      const px = Math.floor((wx - cam) / SCALE);
      if (px < -6 || px > PW + 6) continue;
      const gy = pGroundY(wx);
      const top = gy - Math.floor(domeHeight(wx) / SCALE);
      pxRect(c, px, top, 1, 7, '#3a2114');
      pxRect(c, px + 1, top, 1, 7, '#1a0c06');
    }
    [300, 690, 1090].forEach(wx => {
      const px = Math.floor((wx - cam) / SCALE);
      if (px < -8 || px > PW + 8) return;
      const gy = pGroundY(wx);
      const top = gy - Math.floor(domeHeight(wx) / SCALE) + 9;
      pxRect(c, px, top, 1, 5, '#4a2a1a');
      pxRect(c, px - 2, top + 5, 5, 2, '#2a160d');
      pxRect(c, px - 1, top + 7, 3, 1, '#ffd08a');
      c.fillStyle = 'rgba(255, 176, 100, 0.07)';
      c.beginPath();
      c.moveTo(px - 1, top + 7);
      c.lineTo(px - 12, gy);
      c.lineTo(px + 12, gy);
      c.closePath();
      c.fill();
    });

    // stencilled base marking
    const signPx = Math.floor((845 - cam) / SCALE);
    if (signPx > -90 && signPx < PW + 20) {
      const gy = pGroundY(845);
      const top = gy - Math.floor(domeHeight(845) / SCALE);
      c.save();
      c.globalAlpha = 0.20;
      c.fillStyle = '#f2d6b3';
      c.font = '700 15px ' + FONT;
      c.textAlign = 'center';
      c.fillText('ARES-1', signPx, top + 30);
      c.globalAlpha = 0.12;
      c.font = '700 7px ' + FONT;
      c.fillText('ACIDALIA PLANITIA', signPx, top + 38);
      c.restore();
    }

    drawCrates(c, cam, 390, 5);
    drawCrates(c, cam, 545, 3);
    drawCrates(c, cam, 1135, 4);
    drawCrates(c, cam, 1305, 2);

    drawGalley(c, cam, time, S);
    drawWaterStation(c, cam, time, S);
    drawEclssStation(c, cam, time, S);
    drawBunks(c, cam, time, S);
    drawCrew(c, cam, time, S);
    drawGreenhouse(c, cam, time, S);
    drawLab(c, cam, time, S);
    drawAirlock(c, cam, time, S);

    // interior dust motes
    const domeL = Math.floor((D.left - cam) / SCALE);
    const domeR = Math.floor((D.right - cam) / SCALE);
    motes.forEach(m => {
      const px = Math.floor(((m.x * (domeR - domeL) + domeL + time * 3 * m.s) % (domeR - domeL + 1)) + domeL);
      const gy = pGroundY(cam + px * SCALE);
      const top = gy - Math.floor(domeHeight(cam + px * SCALE) / SCALE);
      const py = Math.floor(top + (gy - top) * ((m.y + time * 0.02 * m.s) % 1));
      if (px < 0 || px >= PW) return;
      c.fillStyle = 'rgba(255, 196, 140, 0.18)';
      c.fillRect(px, py, 1, 1);
    });
  }

  function drawCrates(c, cam, x, count) {
    const px = Math.floor((x - cam) / SCALE);
    const gy = pGroundY(x);
    if (px < -30 || px > PW + 30) return;
    for (let i = 0; i < count; i++) {
      const bx = px + (i % 2) * 7 - 3;
      const by = gy - 6 - Math.floor(i / 2) * 5;
      pxBevelBox(c, bx, by, 6, 5, '#4a2a19', '#1d0f08', '#7a4626', '#2a150c');
      pxRect(c, bx + 1, by + 2, 4, 1, '#9c5c34');
    }
  }

  // ---- Stations -----------------------------------------------------------
  function stationFoot(c, px, gy, w) {
    pxRect(c, px - w / 2 - 2, gy - 1, w + 4, 2, 'rgba(10, 5, 2, 0.45)');
    pxBevelBox(c, px - w / 2, gy - 3, w, 4, '#3f2315', '#1a0d07', '#6d3d21', '#20100a');
  }

  function drawGalley(c, cam, time, S) {
    const x = GALLEY_SPOT, px = Math.floor((x - cam) / SCALE), gy = pGroundY(x);
    if (px < -40 || px > PW + 40) return;
    stationFoot(c, px, gy, 50);

    pxBevelBox(c, px - 23, gy - 21, 46, 18, '#472717', '#1c0e07', '#7a4526', '#2a150c');
    pxRect(c, px - 20, gy - 18, 18, 8, '#2c170d');
    pxRect(c, px - 20, gy - 18, 18, 1, '#8a5230');
    pxRect(c, px + 2, gy - 18, 18, 8, '#2c170d');
    pxRect(c, px + 2, gy - 18, 18, 1, '#8a5230');

    // overhead lockers
    pxBevelBox(c, px - 22, gy - 40, 20, 15, '#3a2012', '#180b06', '#6a3a20', '#22110a');
    pxBevelBox(c, px + 2, gy - 40, 20, 15, '#3a2012', '#180b06', '#6a3a20', '#22110a');
    pxRect(c, px - 21, gy - 33, 18, 1, '#190c07');
    pxRect(c, px + 3, gy - 33, 18, 1, '#190c07');
    pxRect(c, px - 13, gy - 36, 2, 1, '#ff9f45');
    pxRect(c, px + 11, gy - 36, 2, 1, '#ff9f45');

    // ration boxes
    RATIONS.forEach((r, i) => {
      pxBevelBox(c, px - 19 + i * 10, gy - 26, 8, 5, r.col, '#1d0e07', null, null);
      pxRect(c, px - 18 + i * 10, gy - 25, 6, 1, 'rgba(255, 245, 230, 0.35)');
    });

    // pot with steam
    pxBevelBox(c, px - 2, gy - 28, 14, 7, '#6b3a20', '#2a130a', '#9c5c34');
    pxRect(c, px, gy - 29, 10, 1, '#3a1d10');
    pxRect(c, px + 3, gy - 30, 4, 1, '#2a130a');
    for (let i = 0; i < 3; i++) {
      const age = (time * 0.6 + i * 0.33) % 1;
      const sx = px + 5 + Math.round(Math.sin(time + i * 2) * 2);
      const sy = gy - 31 - Math.floor(age * 12);
      c.fillStyle = `rgba(242, 214, 179, ${0.26 * (1 - age)})`;
      c.fillRect(sx, sy, 1, 1);
    }

    c.fillStyle = 'rgba(255, 170, 100, 0.06)';
    c.beginPath();
    c.moveTo(px - 16, gy - 40);
    c.lineTo(px - 30, gy);
    c.lineTo(px + 30, gy);
    c.lineTo(px + 16, gy - 40);
    c.closePath();
    c.fill();

    // menu fatigue indicator
    const meals = (S.mealsToday || 0);
    if (S.ateToday) {
      pxRect(c, px + 18, gy - 26, 3, 3, '#9fbf7a');
    } else if (Math.sin(time * 4) > 0) {
      pxRect(c, px + 18, gy - 27, 3, 3, '#ff9f45');
    }
    if (meals >= 2) pxRect(c, px - 23, gy - 43, 2, 2, '#e8622a');
  }

  function drawWaterStation(c, cam, time, S) {
    const x = TERMINALS[0].x, px = Math.floor((x - cam) / SCALE), gy = pGroundY(x);
    if (px < -30 || px > PW + 30) return;
    stationFoot(c, px, gy, 32);

    pxBevelBox(c, px - 15, gy - 33, 30, 31, '#33251c', '#170e08', '#6d4a33', '#1d110a');
    pxBevelBox(c, px - 10, gy - 29, 20, 24, '#17110d', '#7a5a42');
    const lvl = Math.max(0.06, Math.min(1, (S.systems.water / 100)));
    const h = Math.floor(21 * lvl);
    pxRect(c, px - 8, gy - 6 - h, 16, h, '#6f8f8c');
    pxRect(c, px - 8, gy - 6 - h, 16, 1, '#b6d2cc');
    pxRect(c, px - 6, gy - 5 - Math.floor(h * 0.6), 2, 2, 'rgba(255,255,255,0.35)');

    pxRect(c, px - 6, gy - 35, 12, 3, '#4a2a19');
    pxRect(c, px - 2, gy - 37, 4, 2, '#ff9f45');
    if (Math.sin(time * 2.5) > 0) pxRect(c, px - 10, gy - 24, 1, 2, '#d9c4ad');
    // hoses
    pxRect(c, px + 14, gy - 14, 6, 2, '#5c3a26');
    pxRect(c, px + 18, gy - 12, 2, 6, '#5c3a26');
  }

  function drawEclssStation(c, cam, time, S) {
    const x = TERMINALS[1].x, px = Math.floor((x - cam) / SCALE), gy = pGroundY(x);
    if (px < -34 || px > PW + 34) return;
    stationFoot(c, px, gy, 40);

    pxBevelBox(c, px - 19, gy - 36, 38, 34, '#3a2a1f', '#180e08', '#77543a', '#201209');
    pxBevelBox(c, px - 15, gy - 31, 16, 12, '#0d0a08', '#5c4632');
    const fault = S.co2Fault === 'main';
    const fl = fault && Math.sin(time * 9) > 0;
    pxRect(c, px - 14, gy - 30, 14, 10, fl ? '#e8622a' : '#33190d');
    // waveform
    for (let i = 0; i < 13; i++) {
      const yy = gy - 26 + Math.round(Math.sin(time * 4 + i * 0.7) * 2);
      pxRect(c, px - 14 + i, yy, 1, 1, fault ? '#ffd08a' : '#ff9f45');
    }

    const bars = [
      { v: (S.o2 == null ? 100 : S.o2) / 100, col: '#ff9f45' },
      { v: Math.min(1, (S.co2 == null ? 4 : S.co2) / 10), col: '#e8622a' },
      { v: Math.max(0, Math.min(1, ((S.pressure == null ? 101.3 : S.pressure) - 85) / 25)), col: '#f2d6b3' }
    ];
    bars.forEach((b, i) => {
      const bx = px + 4 + i * 4;
      pxRect(c, bx, gy - 29, 3, 20, '#160c07');
      const bh = Math.max(1, Math.round(19 * b.v));
      pxRect(c, bx, gy - 10 - bh, 3, bh, b.col);
    });

    pxRect(c, px - 12, gy - 39, 24, 2, '#4a2a19');
    if (fault || S.systems.life < 40) {
      pxRect(c, px + 14, gy - 40, 3, 3, fl ? '#ffd08a' : '#e8622a');
    }
  }

  function drawBunks(c, cam, time, S) {
    const x = BUNK_SPOT, px = Math.floor((x - cam) / SCALE), gy = pGroundY(x);
    if (px < -42 || px > PW + 42) return;
    stationFoot(c, px, gy, 54);

    // posts
    [-25, 25].forEach(dx => {
      pxRect(c, px + dx, gy - 38, 2, 38, '#3a2114');
      pxRect(c, px + dx, gy - 38, 1, 38, '#5c3320');
    });
    // two tiers
    [0, 1].forEach(i => {
      const by = gy - 34 + i * 16;
      pxBevelBox(c, px - 23, by, 46, 5, '#4a2a1a', '#1a0d07', '#6d3d21');
      pxRect(c, px - 21, by - 4, 42, 4, i === 0 ? '#8a6a52' : '#7a5a46');
      pxRect(c, px + 13, by - 6, 8, 4, '#d9c4ad');
      pxRect(c, px - 20, by - 5, 26, 3, '#a4552a');
    });
    // ladder
    for (let i = 0; i < 6; i++) pxRect(c, px - 27, gy - 30 + i * 5, 4, 1, '#6d4a33');
    // sleeping light
    const resting = S.restWindow || S.fatigue > 65;
    pxRect(c, px, gy - 42, 2, 2, resting && Math.sin(time * 3) > 0 ? '#ffd08a' : '#7a4526');
  }

  function drawCrew(c, cam, time, S) {
    const x = CREW_SPOT, px = Math.floor((x - cam) / SCALE), gy = pGroundY(x);
    if (px < -42 || px > PW + 42) return;
    stationFoot(c, px, gy, 46);

    pxBevelBox(c, px - 18, gy - 13, 36, 4, '#5c3320', '#22110a', '#8a5230');
    pxRect(c, px - 2, gy - 9, 4, 8, '#3a2114');

    const people = [-11, 0, 11];
    people.forEach((dx, i) => {
      const bob = Math.round(Math.sin(time * 1.6 + i * 1.4) * 1);
      pxCircle(c, px + dx, gy - 24 + bob, 3, '#d9b58e');
      pxRect(c, px + dx - 3, gy - 23 + bob, 6, 2, '#8a5a34');
      pxBevelBox(c, px + dx - 4, gy - 21 + bob, 8, 8, i === 0 ? '#b0612f' : (i === 1 ? '#8a7455' : '#7a4a2a'), '#2a150c');
      pxRect(c, px + dx - 1, gy - 19 + bob, 2, 3, '#f2d6b3');
    });

    if (!S.talkedThisSol) {
      const bx = px + Math.round(Math.sin(time * 2) * 2);
      pxBevelBox(c, bx - 15, gy - 47, 13, 11, '#f2d6b3', '#8a6a52');
      pxRect(c, bx - 11, gy - 43, 2, 2, '#4a2a1a');
      pxRect(c, bx - 8, gy - 43, 2, 2, '#4a2a1a');
      pxRect(c, bx - 6, gy - 43, 2, 2, '#4a2a1a');
      pxRect(c, bx - 11, gy - 37, 3, 1, '#f2d6b3');
    }
    // coffee pot
    pxBevelBox(c, px + 17, gy - 17, 5, 5, '#c9a07a', '#4a2a1a');
  }

  function drawGreenhouse(c, cam, time, S) {
    const x = TERMINALS[2].x, px = Math.floor((x - cam) / SCALE), gy = pGroundY(x);
    if (px < -46 || px > PW + 46) return;
    stationFoot(c, px, gy, 62);

    pxBevelBox(c, px - 31, gy - 42, 62, 40, '#261b12', '#0f0805', '#5f4028', '#160d07');
    pxRect(c, px - 28, gy - 39, 56, 35, 'rgba(190, 130, 78, 0.10)');

    const g = S.garden;
    const plots = (g && g.plots) ? g.plots : [];
    const lit = S.loads && S.loads.greenhouse && !S.greenhouseIsolated;
    pxRect(c, px - 28, gy - 41, 56, 2, lit ? '#ffd08a' : '#4a2a1a');
    if (lit) {
      for (let i = -24; i <= 24; i += 8) pxRect(c, px + i, gy - 40, 2, 1, '#fff3e2');
    }

    const slots = 8;
    for (let i = 0; i < slots; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const tx = px - 25 + col * 13;
      const ty = gy - 37 + row * 17;
      pxRect(c, tx, ty + 12, 11, 3, '#3c2214');
      pxRect(c, tx, ty + 12, 11, 1, '#5c3320');
      const p = plots[i];
      if (!p) {
        pxRect(c, tx + 2, ty + 11, 7, 1, '#2a160d');
        continue;
      }
      const crop = CROPS.find(cr => cr.id === p.crop) || CROPS[0];
      const ratio = Math.max(0.06, Math.min(1, p.progress == null ? (p.growth || 0) : p.progress));
      const stem = Math.max(1, Math.round(ratio * 9));
      pxRect(c, tx + 5, ty + 12 - stem, 1, stem, '#7a8a4a');
      const leaves = 1 + Math.round(ratio * 2);
      for (let l = 0; l < leaves; l++) {
        const ly = ty + 12 - Math.floor(stem * (l + 1) / (leaves + 1));
        pxRect(c, tx + 3, ly, 3, 1, crop.col);
        pxRect(c, tx + 6, ly - 1, 3, 1, crop.col);
      }
      if (p.ready) {
        pxCircle(c, tx + 5, ty + 10 - Math.floor(stem * 0.4), 2, crop.col);
        pxRect(c, tx + 5, ty + 10 - Math.floor(stem * 0.4), 1, 1, '#fff3e2');
      }
      if (p.fault) {
        const bl = Math.sin(time * 8) > 0;
        pxRect(c, tx + 8, ty + 2, 2, 3, bl ? '#ffd08a' : '#e8622a');
        pxRect(c, tx + 8, ty + 6, 2, 1, bl ? '#ffd08a' : '#e8622a');
      }
    }

    // console + humidity pipes
    pxBevelBox(c, px + 24, gy - 20, 10, 18, '#33251c', '#170e08', '#6d4a33');
    pxRect(c, px + 26, gy - 17, 6, 4, lit ? '#9fbf7a' : '#33190d');
    pxRect(c, px - 34, gy - 28, 3, 26, '#3a2114');
    pxRect(c, px - 34, gy - 28, 1, 26, '#6d4a33');
  }

  function drawLab(c, cam, time, S) {
    const x = LAB_SPOT, px = Math.floor((x - cam) / SCALE), gy = pGroundY(x);
    if (px < -40 || px > PW + 40) return;
    stationFoot(c, px, gy, 44);

    pxBevelBox(c, px - 20, gy - 16, 40, 14, '#3f2c20', '#180e08', '#77543a', '#201209');
    pxRect(c, px - 17, gy - 13, 34, 8, '#2a1a10');
    // sample rack
    const sampleCols = ['#9fbf7a', '#e8622a', '#ff9f45', '#f2d6b3'];
    sampleCols.forEach((col, i) => {
      pxRect(c, px - 14 + i * 6, gy - 20, 2, 5, '#c9a07a');
      pxRect(c, px - 14 + i * 6, gy - 18, 2, 3, col);
    });

    // spectrometer tower + scanning beam
    pxBevelBox(c, px + 1, gy - 37, 11, 22, '#2c2a30', '#121016', '#6d6a76');
    pxRect(c, px + 3, gy - 34, 7, 5, '#101820');
    pxRect(c, px + 4, gy - 33, 5, 3, Math.sin(time * 3) > 0 ? '#8fd0d6' : '#5f9fa6');
    pxCircle(c, px + 6, gy - 40, 3, '#8f7a66');
    pxRect(c, px + 5, gy - 41, 3, 1, '#d9c4ad');

    const sweep = Math.sin(time * 1.6);
    c.strokeStyle = 'rgba(143, 208, 214, 0.30)';
    c.beginPath();
    c.moveTo(px + 6, gy - 40);
    c.lineTo(px - 16 + sweep * 14, gy - 24);
    c.stroke();

    const eff = S.labEff == null ? 0.5 : S.labEff;
    pxRect(c, px - 20, gy - 18, 40, 1, '#1a0d07');
    pxRect(c, px - 20, gy - 18, Math.round(40 * eff), 1, '#8fd0d6');
  }

  function drawAirlock(c, cam, time, S) {
    const px = Math.floor((AIRLOCK_X - cam) / SCALE), gy = pGroundY(AIRLOCK_X);
    if (px < -50 || px > PW + 50) return;

    pxBevelBox(c, px - 22, gy - 26, 44, 26, '#33251c', '#170e08', '#6d4a33', '#1d110a');
    pxBevelBox(c, px - 12, gy - 21, 24, 21, '#2a1c14', '#0f0805', '#4f3524');
    // hazard stripes
    for (let i = 0; i < 5; i++) pxRect(c, px - 12 + i * 5, gy - 21, 2, 2, i % 2 ? '#e8622a' : '#f2d6b3');
    pxRect(c, px - 5, gy - 12, 10, 2, '#1a0d07');
    pxRect(c, px - 4, gy - 11, 8, 1, '#ff9f45');
    pxRect(c, px - 1, gy - 25, 2, 3, S.storm.active ? '#e8622a' : '#9fbf7a');
    // tunnel elbow to the outside
    pxBevelBox(c, px + 14, gy - 22, 14, 22, '#2e2118', '#140c07', '#5f4028');
    pxRect(c, px + 27, gy - 17, 6, 17, '#1c130d');
  }

  // =========================================================================
  // DOME GLASS SHELL
  // =========================================================================
  function drawDomeShell(c, cam, S, time) {
    const left = Math.max(D.left, cam - 10);
    const right = Math.min(D.right, cam + PW * SCALE + 10);
    for (let wx = left; wx <= right; wx += 2) {
      const px = Math.floor((wx - cam) / SCALE);
      const gy = pGroundY(wx);
      const h = Math.floor(domeHeight(wx) / SCALE);
      if (h <= 0) continue;
      const top = gy - h;
      c.fillStyle = 'rgba(255, 176, 120, 0.10)';
      c.fillRect(px, top, 1, 2);
      c.fillStyle = 'rgba(255, 220, 180, 0.10)';
      c.fillRect(px, top - 1, 1, 1);
      c.fillStyle = 'rgba(240, 150, 90, 0.045)';
      c.fillRect(px, top + 2, 1, Math.min(24, h));
    }

    // structural ribs
    for (let wx = D.left + 58; wx < D.right - 20; wx += 116) {
      const px = Math.floor((wx - cam) / SCALE);
      if (px < -3 || px > PW + 3) continue;
      const gy = pGroundY(wx);
      const h = Math.floor(domeHeight(wx) / SCALE);
      c.fillStyle = 'rgba(255, 200, 150, 0.22)';
      for (let i = 0; i < 9; i++) {
        const yy = gy - h + i;
        c.fillRect(px - Math.floor(i / 4), yy, 1, 1);
      }
      c.fillStyle = 'rgba(200, 110, 60, 0.18)';
      c.fillRect(px, gy - h + 9, 1, Math.max(0, h - 12));
    }

    // base pillars at both ends
    [[D.left + 8, 1], [D.right - 8, -1]].forEach(([wx, s]) => {
      const px = Math.floor((wx - cam) / SCALE);
      if (px < -12 || px > PW + 12) return;
      const gy = pGroundY(wx);
      pxBevelBox(c, px - 4, gy - 24, 9, 24, '#33251c', '#160c07', '#6d4a33', '#1c110a');
      pxRect(c, px - 2, gy - 21, 4, 2, '#ff9f45');
    });

    // solar glare streaks
    [[D.x - 250, 6], [D.x + 180, 4]].forEach(([wx, len]) => {
      const px = Math.floor((wx - cam) / SCALE);
      if (px < -20 || px > PW + 20) return;
      const gy = pGroundY(wx);
      const h = Math.floor(domeHeight(wx) / SCALE);
      c.strokeStyle = 'rgba(255, 240, 220, 0.13)';
      c.lineWidth = 1;
      for (let i = 0; i < len; i++) {
        c.beginPath();
        c.moveTo(px + i * 8, gy - h + 6 + i * 2);
        c.lineTo(px + i * 8 + 4, gy - h + 6 + i * 2 + 10);
        c.stroke();
      }
    });
  }

  // =========================================================================
  // EXTERIOR STRUCTURES
  // =========================================================================
  function drawRover(c, cam, time) {
    const x = ROVER_SPOT, px = Math.floor((x - cam) / SCALE), gy = pGroundY(x);
    if (px < -45 || px > PW + 45) return;

    pxBevelBox(c, px - 19, gy - 21, 38, 12, '#4a3a2c', '#1c130d', '#8a7458', '#2a1d12');
    pxRect(c, px - 15, gy - 17, 17, 5, '#8a4522');
    pxRect(c, px - 15, gy - 18, 17, 1, '#c97a42');
    pxBevelBox(c, px + 5, gy - 20, 11, 8, '#5c3a26', '#8a5a34', '#a4754a');
    pxRect(c, px + 10, gy - 33, 2, 13, '#c9a07a');
    pxBevelBox(c, px + 7, gy - 37, 8, 4, '#3a2a1f', '#140c07', '#c9a07a');
    pxRect(c, px + 12, gy - 36, 2, 2, Math.sin(time * 3) > 0 ? '#ffd08a' : '#8a5a34');
    [-14, 0, 14].forEach(dx => {
      pxCircle(c, px + dx, gy - 5, 5, '#1a120c');
      pxCircle(c, px + dx, gy - 5, 2, '#8a7458');
      pxRect(c, px + dx - 2, gy - 7, 1, 1, '#c9a07a');
    });
    // solar blanket
    pxRect(c, px - 24, gy - 26, 9, 7, '#2a2118');
    for (let i = 0; i < 3; i++) pxRect(c, px - 23, gy - 25 + i * 2, 7, 1, '#a4754a');
  }

  function drawSolar(c, cam, time, S) {
    const base = TERMINALS[3].x, gy = pGroundY(base);
    const dustRatio = Math.min(1, (S.panelDust || 0) / 100);
    for (let i = 0; i < 3; i++) {
      const px = Math.floor((base - 74 + i * 64 - cam) / SCALE);
      if (px < -40 || px > PW + 40) continue;
      pxBevelBox(c, px - 2, gy - 23, 5, 23, '#3a2a1f', '#150d08', '#7a5a42');
      for (let step = -16; step <= 16; step++) {
        const sx = px + step;
        const sy = gy - 31 + Math.floor(step * 0.35);
        pxRect(c, sx, sy - 6, 1, 12, '#4a2a19');
        pxRect(c, sx, sy - 6, 1, 2, '#ffb882');
        pxRect(c, sx, sy + 5, 1, 1, '#1c0f08');
        if (step % 5 === 0) pxRect(c, sx, sy - 4, 1, 9, '#b06a44');
        if (dustRatio > 0.12 && ((Math.abs(step * 7 + i * 3) % 10) / 10 < dustRatio)) {
          pxRect(c, sx, sy - 5, 1, Math.ceil(dustRatio * 8), '#a98b6c');
        }
      }
      if (S.systems.energy < 35 && Math.sin(time * 12 + i) > 0.4) {
        pxRect(c, px + 2, gy - 33, 3, 3, '#ffd08a');
      }
    }
    // tracking motor
    const px = Math.floor((base - cam) / SCALE);
    if (px > -20 && px < PW + 20) {
      pxBevelBox(c, px - 6, gy - 10, 12, 10, '#3f2c20', '#180e08', '#7a5a42');
      pxRect(c, px - 3, gy - 8, 6, 2, '#ff9f45');
    }
  }

  function drawWastePlant(c, cam, time, S) {
    const x = TERMINALS[4].x, gy = pGroundY(x);
    const px = Math.floor((x - cam) / SCALE);
    if (px < -50 || px > PW + 50) return;

    pxBevelBox(c, px - 27, gy - 37, 54, 37, '#33261d', '#150d08', '#7a5a42', '#1c110a');
    for (let i = -23; i < 23; i += 6) {
      pxRect(c, px + i, gy - 5, 3, 3, '#e8622a');
      pxRect(c, px + i + 3, gy - 5, 3, 3, '#1c110a');
    }
    pxBevelBox(c, px - 20, gy - 28, 23, 17, '#120c08', '#5c4632');
    const fireH = S.systems.waste > 30 ? 10 : 4;
    pxRect(c, px - 17, gy - 14 - fireH, 17, fireH, '#a8401a');
    pxRect(c, px - 14, gy - 13 - Math.max(2, fireH - 3), 11, Math.max(2, fireH - 3), '#e8622a');
    pxRect(c, px - 11, gy - 13 - Math.max(1, fireH - 5), 5, Math.max(1, fireH - 5), '#ffd08a');

    pxBevelBox(c, px + 8, gy - 56, 10, 19, '#3a2a1f', '#150d08', '#7a5a42');
    pxBevelBox(c, px + 19, gy - 50, 8, 13, '#3a2a1f', '#150d08', '#7a5a42');
    pxRect(c, px + 8, gy - 53, 10, 3, '#e8622a');

    for (let p = 0; p < 3; p++) {
      const age = (time * 1.1 + p * 0.33) % 1;
      const sx = px + 12 + Math.floor(Math.sin(time * 2 + p) * 3 + age * 7);
      const sy = gy - 59 - Math.floor(age * 20);
      const col = S.systems.waste < 35 ? '#ff9f45' : '#a98b6c';
      pxCircle(c, sx, sy, 2 + Math.floor(age * 2), col);
    }
  }

  function drawComms(c, cam, time, S) {
    const x = TERMINALS[5].x, gy = pGroundY(x);
    const px = Math.floor((x - cam) / SCALE);
    if (px < -60 || px > PW + 60) return;

    for (let h = 0; h < 84; h += 3) {
      const spread = Math.max(3, Math.floor((84 - h) * 0.17));
      c.fillStyle = '#7a6652';
      c.fillRect(px - spread, gy - h, 2, 3);
      c.fillRect(px + spread, gy - h, 2, 3);
      if (h % 9 === 0) {
        c.fillStyle = '#33251c';
        c.fillRect(px - spread, gy - h, spread * 2 + 2, 2);
      }
    }
    const topY = gy - 86;
    for (let dy = -10; dy <= 10; dy++) {
      const w = Math.max(2, 15 - Math.abs(dy));
      pxRect(c, px - w, topY + dy, w * 2, 1, dy < 0 ? '#e6d2ba' : '#5c4632');
    }
    pxRect(c, px - 9, topY - 10, 9, 2, '#f2d6b3');
    const blink = Math.sin(time * (S.systems.comms < 35 ? 10 : 3)) > 0;
    pxCircle(c, px - 10, topY - 10, 2, blink ? '#ffd08a' : '#4a2a19');
    pxBevelBox(c, px - 8, gy - 12, 16, 12, '#3a2a1f', '#150d08', '#7a5a42');
    pxRect(c, px - 5, gy - 10, 10, 4, blink ? '#ffb882' : '#2a1a10');
  }

  function drawReactor(c, cam, time, S) {
    const x = TERMINALS[6].x, gy = pGroundY(x);
    const px = Math.floor((x - cam) / SCALE);
    if (px < -58 || px > PW + 58) return;

    [-15, 15].forEach(dx => {
      const cx = px + dx;
      pxBevelBox(c, cx - 12, gy - 42, 24, 42, '#33291f', '#140d08', '#7a6652', '#1c130d');
      const glow = S.systems.life > 35 ? '#ff9f45' : (Math.sin(time * 10) > 0 ? '#ffd08a' : '#4a2a19');
      const glowHi = S.systems.life > 35 ? '#ffe3b8' : '#ffd08a';
      for (let s = 0; s < 3; s++) {
        pxRect(c, cx - 9, gy - 33 + s * 10, 18, 4, glow);
        pxRect(c, cx - 7, gy - 32 + s * 10, 14, 2, glowHi);
      }
      pxBevelBox(c, cx - 9, gy - 47, 18, 5, '#221a13', '#0d0805', '#5c4632');
    });
    // heat shimmer
    for (let i = 0; i < 3; i++) {
      const age = (time * 0.8 + i * 0.33) % 1;
      c.fillStyle = `rgba(255, 170, 110, ${0.14 * (1 - age)})`;
      c.fillRect(px - 18 + i * 16 + Math.round(Math.sin(time * 2 + i) * 2), gy - 50 - Math.floor(age * 14), 2, 2);
    }
  }

  function drawShelter(c, cam, time, S) {
    const x = SHELTER.x, gy = pGroundY(x);
    const px = Math.floor((x - cam) / SCALE);
    if (px < -58 || px > PW + 58) return;

    pxBevelBox(c, px - 29, gy - 28, 58, 28, '#3a2c22', '#150e09', '#8a7458', '#1d150e');
    pxBevelBox(c, px - 23, gy - 34, 46, 7, '#4a382a', '#150e09', '#b09a80');
    pxBevelBox(c, px - 10, gy - 23, 20, 23, '#1c140e', '#4a382a', '#6d4a33');
    pxRect(c, px - 3, gy - 17, 6, 3, '#ffd08a');
    const safe = Math.abs(S.player.x - x) < SHELTER.half + 6;
    pxRect(c, px - 4, gy - 37, 8, 3, safe ? '#9fbf7a' : '#e8622a');
    if (S.storm.active) {
      const a = 0.05 + Math.sin(time * 4) * 0.03;
      pxCircle(c, px, gy - 20, 40, `rgba(255, 170, 100, ${a})`);
    }
  }

  function drawSupply(c, cam, time, S) {
    const x = MED_SPOT, gy = pGroundY(x);
    const px = Math.floor((x - cam) / SCALE);
    if (px < -30 || px > PW + 30) return;

    pxBevelBox(c, px - 10, gy - 13, 20, 13, '#e6d2ba', '#4a382a', '#fff3e2', '#b09a80');
    if (!S.medUsed) {
      pxRect(c, px - 1, gy - 10, 3, 7, '#e8622a');
      pxRect(c, px - 4, gy - 8, 9, 3, '#e8622a');
    }
    pxRect(c, px - 7, gy - 11, 5, 1, '#4a382a');
  }

  function drawTerminalSprite(c, cam, t, S, time) {
    const px = Math.floor((t.x - cam) / SCALE);
    const gy = pGroundY(t.x);
    if (px < -25 || px > PW + 25) return;

    const col = SYSTEMS[t.sys].color;
    const crit = S.systems[t.sys] < 35;
    const screenCol = crit ? (Math.sin(time * 8) > 0 ? '#ffd08a' : '#4a1a0a') : col;

    pxBevelBox(c, px - 7, gy - 17, 14, 17, '#2e2118', '#120c07', '#7a5a42', '#1a110a');
    pxBevelBox(c, px - 5, gy - 14, 10, 6, '#0d0907', '#5c4632');
    pxRect(c, px - 4, gy - 13, 8, 4, screenCol);
    pxRect(c, px - 3, gy - 12, 4, 1, 'rgba(255, 245, 230, 0.6)');

    if ((S.reqSystems && S.reqSystems.includes(t.sys) && S.systems[t.sys] < 80) || crit) {
      const bob = Math.round(Math.sin(time * 4) * 2);
      const my = gy - 45 + bob;
      const markCol = crit ? '#e8622a' : '#ffd08a';
      pxBevelBox(c, px - 4, my - 7, 8, 8, markCol, '#1a0d07', '#fff3e2');
      pxRect(c, px - 1, my - 5, 2, 4, '#1a0d07');
    }
  }

  function drawLogs(c, cam, time, S) {
    LOG_SPOTS.forEach((x, i) => {
      if (S.logs && S.logs[i]) return;
      const px = Math.floor((x - cam) / SCALE);
      if (px < -25 || px > PW + 25) return;
      const gy = pGroundY(x);
      const bob = Math.round(Math.sin(time * 3 + i) * 2);
      const py = gy - 19 + bob;
      pxBevelBox(c, px - 5, py - 6, 10, 11, '#f2d6b3', '#4a2a1a', '#fff3e2', '#b09a80');
      pxRect(c, px - 3, py - 3, 6, 1, '#8a5a34');
      pxRect(c, px - 3, py - 1, 5, 1, '#8a5a34');
    });
  }

  function drawDecoy(c, S, cam, time) {
    if (!S.decoy || !S.decoy.active) return;
    const px = Math.floor((S.decoy.x - cam) / SCALE);
    const gy = pGroundY(S.decoy.x);
    if (px < -30 || px > PW + 30) return;

    const pulse = (time * 3.5) % 1;
    const r = 6 + Math.round(pulse * 22);
    pxCircle(c, px, gy - 8, r, 'rgba(255, 159, 69, 0.20)');
    pxBevelBox(c, px - 4, gy - 10, 8, 10, '#7a4526', '#2a150c', '#ffd08a');
    pxRect(c, px - 2, gy - 13, 4, 3, Math.sin(time * 16) > 0 ? '#ffd08a' : '#e8622a');
  }

  // =========================================================================
  // STALKER DRONES
  // =========================================================================
  const ENEMY_SPRITE_32 = [
    "..............AAAA..............",
    ".............AEEEEA.............",
    "..............ACCA..............",
    "...............BB...............",
    "..........BBBBBBBBBBBB..........",
    "........BBDDDDDDDDDDDDBB........",
    ".......BDDHHHHHHHHHHHHDDB.......",
    "......BDDHHOOOOOOOOOOHHDDB......",
    ".....BDDHHOOOOOOOOOOOOHHDDB.....",
    "....BDDHHDDDDDDDDDDDDPPEEDDB....",
    "....BDDHDDDDDDDDDDDDDPPEWDDB....",
    "....BDDDDDDDDDDDDDDDDPPEEDDB....",
    ".....BBDDDDDDDDDDDDDDDDDDBB.....",
    "......BBBBBBBBBBBBBBBBBBBB......",
    "....LL..BB..BBBBBBBB..BB..LL....",
    "...LLM..LL...BBBBBB...LL..MLL...",
    "..LLMM.LLM............MLL.MMLL..",
    ".LLM..LLMM............MMLL..MLL.",
    ".LL...LLM..............MLL...LL.",
    "LL...LL..................LL...LL",
    "GG...GG..................GG...GG",
    "GG...GG..................GG...GG"
  ];

  function drawEnemies(c, S, cam, time) {
    if (!S.enemies || !S.enemies.length) return;
    S.enemies.forEach(en => {
      const px = Math.floor((en.x - cam) / SCALE);
      const gy = pGroundY(en.x);
      if (px < -45 || px > PW + 45) return;

      const stunned = en.stun > 0;
      const chasing = en.state === 'chase' && !stunned;
      const dir = en.dir >= 0 ? 1 : -1;
      const legWave = stunned ? 0 : Math.sin(time * (chasing ? 18 : 10) + en.x * 0.08);
      const bob = stunned ? 2 : (Math.abs(legWave) > 0.55 ? 1 : 0);
      const y0 = gy - 22 - bob;

      pxRect(c, px - 13, gy - 1, 26, 3, 'rgba(10, 5, 2, 0.6)');

      if (!stunned) {
        c.fillStyle = chasing ? 'rgba(255, 159, 69, 0.22)' : 'rgba(176, 89, 47, 0.14)';
        for (let step = 2; step <= 38; step++) {
          const lx = px + dir * (8 + step);
          const sp = Math.floor(step * 0.24);
          c.fillRect(lx, gy - 14 - bob - Math.floor(sp * 0.5), 1, 3 + sp);
        }
      }

      const pal = {
        A: '#6d5a48',
        B: '#1a120c',
        C: '#a98b6c',
        D: '#33291f',
        H: '#7a6652',
        O: chasing ? '#ff9f45' : '#b0592f',
        P: '#120c08',
        E: stunned ? '#f2d6b3' : (chasing ? '#ffd08a' : '#e8622a'),
        W: '#fff3e2',
        L: '#3a2a1f',
        M: '#c9a07a',
        G: chasing ? '#ff9f45' : '#e8622a'
      };

      drawSpriteMap(c, px - 16, y0, ENEMY_SPRITE_32, pal, dir < 0);

      const legShift = Math.round(legWave * 2);
      pxRect(c, px - 14 + legShift, gy - 3, 3, 3, pal.G);
      pxRect(c, px + 12 - legShift, gy - 3, 3, 3, pal.G);

      if (stunned && Math.sin(time * 25) > 0) {
        pxRect(c, px - 12, y0 + 4, 4, 2, '#ffd08a');
        pxRect(c, px + 9, y0 + 10, 4, 2, '#f2d6b3');
        pxRect(c, px - 3, y0 - 2, 6, 2, '#fff3e2');
      }
    });
  }

  // =========================================================================
  // ASTRONAUT — procedural pixel suit with walk / work animation
  // =========================================================================
  function drawPlayer(c, S, cam, time) {
    const p = S.player;
    const px = Math.round((p.x - cam) / SCALE);
    const gy = pGroundY(p.x);
    if (px < -30 || px > PW + 30) return;

    const dir = p.face >= 0 ? 1 : -1;
    const moving = p.moving && !S.minigame;
    const frame = moving ? (Math.floor(time * 8) % 4) : 0;
    const working = (S.workT || 0) > 0 && !moving;
    const bob = moving && (frame === 1 || frame === 3) ? 1 : 0;

    const suit = '#f2e7d8', suitHi = '#fffaf2', suitShade = '#c9ad92', suitDark = '#8a705c';
    const pack = '#5c3622', packHi = '#8a5a34', packDark = '#2c180e';
    const visor = '#1a1412', visorHi = '#ffb37a', boot = '#3a2417';

    // EMP wave + shield read on the pixel layer
    if (S.empFlash > 0) {
      const r = (1 - S.empFlash) * 64;
      c.strokeStyle = 'rgba(255, 159, 69, 0.75)';
      c.fillStyle = 'rgba(255, 159, 69, 0.16)';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(px, gy - 14, r, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    if (S.shield > 0) {
      c.strokeStyle = 'rgba(255, 214, 170, 0.55)';
      c.fillStyle = 'rgba(255, 196, 140, 0.10)';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(px, gy - 16, 18, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    // ground shadow
    pxRect(c, px - 9, gy - 1, 18, 2, 'rgba(10, 5, 2, 0.55)');

    // headlamp cone when outside or in a storm
    const outside = p.x < D.left + 10 || p.x > D.right - 10;
    if (outside || S.storm.level > 0.05) {
      c.fillStyle = 'rgba(255, 205, 150, 0.10)';
      c.beginPath();
      c.moveTo(px + dir * 5, gy - 30);
      c.lineTo(px + dir * 58, gy - 40);
      c.lineTo(px + dir * 58, gy - 14);
      c.closePath();
      c.fill();
    }

    const stride = moving ? [0, 2, 0, -2][frame] : 0;
    const swing = moving ? [2, 0, -2, 0][frame] * dir : 0;

    // back arm
    pxRect(c, px - dir * 8, gy - 22 + bob - swing, 3, 8, suitShade);

    // backpack
    pxBevelBox(c, px - dir * 9 - 3, gy - 25 + bob, 6, 13, pack, packDark, packHi, packDark);
    pxRect(c, px - dir * 9 - 1, gy - 23 + bob, 2, 2, outside ? '#ffd08a' : '#8a5a34');
    pxRect(c, px - dir * 9 - 2, gy - 15 + bob, 4, 1, packDark);

    // legs
    const legBack = px - dir * 3 - stride * dir;
    const legFront = px + dir * 2 + stride * dir;
    pxRect(c, legBack - 2, gy - 10 + bob, 4, 9, suitShade);
    pxRect(c, legBack - 2, gy - 3, 4, 3, boot);
    pxRect(c, legFront - 2, gy - 10, 4, 10, suit);
    pxRect(c, legFront - 2, gy - 3, 4, 3, boot);
    pxRect(c, legFront - 2, gy - 10, 4, 1, suitHi);

    // torso
    pxBevelBox(c, px - 7, gy - 25 + bob, 14, 16, suit, suitDark, suitHi, suitShade);
    pxRect(c, px - 4, gy - 21 + bob, 8, 1, suitShade);
    // chest patch + status light
    pxRect(c, px - 3, gy - 19 + bob, 4, 3, '#b0612f');
    pxRect(c, px - 2, gy - 18 + bob, 2, 1, '#ffd08a');
    // hoses on the pack side
    pxRect(c, px - dir * 4, gy - 17 + bob, 1, 5, suitDark);
    pxRect(c, px - dir * 3, gy - 12 + bob, 2, 1, suitDark);

    // front arm (working pose bends toward the station)
    if (working) {
      const w = Math.sin(time * 12);
      pxRect(c, px + dir * 6, gy - 23 + bob, 4, 3, suit);
      pxRect(c, px + dir * 9, gy - 22 + bob + Math.round(w * 2), 4, 3, suit);
      pxRect(c, px + dir * 12, gy - 21 + bob + Math.round(w * 2), 2, 2, '#c9a07a');
      // wrench
      pxRect(c, px + dir * 14, gy - 23 + bob + Math.round(w * 2), 4, 1, '#b09a80');
      pxRect(c, px + dir * 17, gy - 24 + bob + Math.round(w * 2), 2, 3, '#e6d2ba');
      if (w > 0.35) {
        pxRect(c, px + dir * 18, gy - 25 + bob, 1, 1, '#fff3e2');
        pxRect(c, px + dir * 19, gy - 23 + bob, 1, 1, '#ffd08a');
      }
    } else {
      pxRect(c, px + dir * 6, gy - 23 + bob + swing, 3, 9, suit);
      pxRect(c, px + dir * 6, gy - 15 + bob + swing, 3, 2, '#c9a07a');
    }

    // helmet
    pxRect(c, px - 4, gy - 26 + bob, 8, 2, '#d9c4ad');
    pxCircle(c, px, gy - 30 + bob, 6, suit);
    pxRect(c, px - 5, gy - 34 + bob, 10, 2, suitHi);
    // visor
    pxRect(c, px - 4 + (dir > 0 ? 1 : 0), gy - 31 + bob, 7, 4, visor);
    pxRect(c, px - 3 + (dir > 0 ? 1 : 0), gy - 30 + bob, 2, 1, visorHi);
    pxRect(c, px + (dir > 0 ? 2 : -3), gy - 29 + bob, 1, 1, '#fff3e2');
    // antenna
    pxRect(c, px + dir * 4, gy - 36 + bob, 1, 3, '#8a705c');
    pxRect(c, px + dir * 4, gy - 37 + bob, 1, 1, '#ff9f45');
    // chest lamp
    pxRect(c, px + 2, gy - 23 + bob, 1, 1, '#fff3e2');
  }

  // =========================================================================
  // WEATHER
  // =========================================================================
  function drawWeather(c, S, cam, time) {
    const st = S.storm;
    const I = st.level;

    if (I > 0.02) {
      c.fillStyle = st.kind === 'rad'
        ? `rgba(232, 98, 42, ${0.16 * I})`
        : `rgba(90, 44, 24, ${0.32 * I})`;
      c.fillRect(0, 0, PW, PH);

      if (st.kind === 'rad') {
        const grad = c.createLinearGradient(0, 0, 0, 70);
        grad.addColorStop(0, `rgba(255, 159, 69, ${0.26 * I})`);
        grad.addColorStop(1, 'rgba(255, 159, 69, 0)');
        c.fillStyle = grad;
        c.fillRect(0, 0, PW, 70);
      }

      const active = Math.floor(I * dust.length);
      const speed = 35 + I * 115;

      for (let i = 0; i < active; i++) {
        const d = dust[i];
        let x = Math.floor((d.x - time * speed * (0.4 + d.z)) % (PW + 20));
        if (x < 0) x += PW + 20;
        x -= 10;
        const y = Math.floor((d.y + Math.sin(time + d.p) * 3 + time * 2 * I) % PH);
        if (x > domeLeftPx(cam) && x < domeRightPx(cam) && y > domeTopPx(cam)) continue;
        const len = Math.max(2, Math.floor(2 + d.z * 3 + I * 6));
        c.fillStyle = st.kind === 'rad' ? '#ff9f45' : '#d9a97e';
        c.fillRect(x, y, len, 1);
      }
    }
  }

  function domeLeftPx(cam) { return Math.floor((D.left - cam) / SCALE); }
  function domeRightPx(cam) { return Math.floor((D.right - cam) / SCALE); }
  function domeTopPx(cam) { return pGroundY(D.x) - Math.floor(domeHeight(D.x) / SCALE); }

  // =========================================================================
  // LABELS
  // =========================================================================
  function drawLabelsOverlay(ctx, S, cam) {
    ctx.save();
    ctx.textAlign = 'center';

    const playerX = S.player.x;
    const obj = S.obj || null;

    const tag = (wx, wyOff, text, col = '#f2d6b3', force = false, isMission = false) => {
      const x = wx - cam;
      if (x < -100 || x > 1060) return;
      const dist = Math.abs(playerX - wx);
      if (!force && !isMission && dist > 175) return;
      const alpha = (force || isMission) ? 0.97 : Math.max(0.3, Math.min(0.95, 1 - (dist - 65) / 110));
      const y = groundY(wx) - wyOff + (isMission ? Math.sin(performance.now() * 0.006) * 3 : 0);
      const labelText = isMission ? `◆ ${text} ◆` : text;
      ctx.globalAlpha = alpha;
      ctx.font = (isMission ? '700 12px ' : '700 10px ') + FONT;
      const w = ctx.measureText(labelText).width + (isMission ? 22 : 14);
      const h = isMission ? 22 : 17;
      ctx.fillStyle = isMission ? 'rgba(46, 20, 9, 0.96)' : 'rgba(14, 8, 5, 0.86)';
      ctx.fillRect(x - w / 2, y - h / 2 - 2, w, h);
      ctx.strokeStyle = isMission ? '#ff9f45' : col;
      ctx.lineWidth = isMission ? 1.8 : 1;
      ctx.strokeRect(x - w / 2 + 0.5, y - h / 2 - 1.5, w - 1, h - 1);
      if (isMission) {
        ctx.fillStyle = 'rgba(255, 159, 69, 0.16)';
        ctx.fillRect(x - w / 2 + 1, y - h / 2 - 1, w - 2, h - 1);
      }
      ctx.fillStyle = isMission ? '#ffe3b8' : col;
      ctx.fillText(labelText, x, y + 3);
    };

    const crit = sys => S.systems[sys] < 32;
    const missionSys = sys => !!(obj && obj.sys === sys);
    const missionFlag = f => !!(obj && obj.flag === f);

    const meals = S.mealsToday || 0;
    tag(GALLEY_SPOT, 72,
      S.ateToday ? 'MESS DECK · EATEN TODAY' : (meals > 0 ? 'MESS DECK · ANOTHER RATION [E]' : 'MESS DECK · EAT [E]'),
      S.ateToday ? '#9fbf7a' : '#ffd08a', !S.ateToday, missionFlag('ate'));

    tag(TERMINALS[0].x, 74, crit('water') ? 'WATER CRITICAL · PURIFY [V]' : 'H₂O · WATER PURIFIER', SYSTEMS.water.color, crit('water'), missionSys('water'));
    tag(TERMINALS[1].x, 72, S.co2Fault === 'main' ? 'CO₂ FAULT! · ECLSS [V]' : 'ECLSS · LIFE SUPPORT', S.co2Fault === 'main' ? '#e8622a' : SYSTEMS.life.color, crit('life') || S.co2Fault === 'main', missionSys('life'));
    tag(BUNK_SPOT, 66, S.restWindow ? 'BUNKS · REST NOW [Z]' : 'BUNKS · SLEEP [Z]', '#f2d6b3', !!(S.restWindow || S.fatigue > 65), missionFlag('slept'));
    tag(CREW_SPOT, 68, S.talkedThisSol ? 'CREW QUARTERS' : 'CREW · TALK [E]', '#d9c4ad', !S.talkedThisSol, false);

    let gLabel = 'GREENHOUSE · CROPS [V]';
    let gCol = SYSTEMS.food.color;
    if (S.greenhouseIsolated) { gLabel = 'GREENHOUSE ISOLATED [V]'; gCol = '#f2d6b3'; }
    else if (S.co2Fault === 'greenhouse') { gLabel = 'TOXIC CO₂! · GREENHOUSE [V]'; gCol = '#e8622a'; }
    tag(TERMINALS[2].x, 86, gLabel, gCol, crit('food') || S.co2Fault === 'greenhouse', missionFlag('harvest'));
    tag(LAB_SPOT, 74, 'SCIENCE LAB · SCAN [V]', '#8fd0d6', false, false);

    tag(ROVER_SPOT, 56, 'ROVER-2 · DOCK', '#c9a07a', false, false);
    const solarLbl = (S.panelDust > 35) ? `SOLAR ARRAY · DUST ${Math.round(S.panelDust)}%` : 'SOLAR ARRAY · CLEAN [V]';
    tag(TERMINALS[3].x, 72, solarLbl, SYSTEMS.energy.color, crit('energy') || S.panelDust > 45, missionSys('energy'));
    tag(TERMINALS[4].x, 80, 'WASTE INCINERATOR [V]', SYSTEMS.waste.color, crit('waste'), missionSys('waste'));
    tag(TERMINALS[5].x, 180, 'X-BAND ANTENNA [V]', SYSTEMS.comms.color, crit('comms'), missionSys('comms'));
    tag(TERMINALS[6].x, 80, 'THERMAL REACTOR [V]', SYSTEMS.life.color, crit('life'), false);

    tag(AIRLOCK_X, 46, S.player.x > D.right ? 'AIRLOCK · ENTER DOME' : 'AIRLOCK · EVA', '#ffd08a', Math.abs(playerX - AIRLOCK_X) < 220, false);
    tag(SHELTER.x, 66, 'ARMORED SHELTER', '#f2d6b3', !!(S.storm.active && !S.inside), false);
    if (!S.medUsed) tag(MED_SPOT, 40, 'MEDKIT', '#e8622a', false, false);

    // region signposts
    REGIONS.slice(1).forEach(r => {
      tag(r.min + 16, 44, r.name, '#b07050', false, false);
    });

    if (S.decoy && S.decoy.active) {
      tag(S.decoy.x, 42, `DECOY · ${Math.ceil(S.decoy.t)}s`, '#ffd08a', true, false);
    }

    if (S.enemies) {
      S.enemies.forEach(en => {
        if (en.stun > 0) return;
        const dist = Math.abs(playerX - en.x);
        if (dist < 330) {
          const chasing = en.state === 'chase';
          tag(en.x, 64, chasing ? 'STALKER ALERT!' : 'ARES-6 STALKER', chasing ? '#ff9f45' : '#c98a5c', chasing, false);
        }
      });
    }

    ctx.restore();
  }

  // =========================================================================
  // DRAW
  // =========================================================================
  function draw(ctx, S, cam, time) {
    pCtx.clearRect(0, 0, PW, PH);
    drawSky(pCtx, S, cam, time);
    drawTerrain(pCtx, S, cam);
    drawDomeInterior(pCtx, cam, time, S);
    drawRover(pCtx, cam, time);
    drawSolar(pCtx, cam, time, S);
    drawWastePlant(pCtx, cam, time, S);
    drawComms(pCtx, cam, time, S);
    drawReactor(pCtx, cam, time, S);
    drawShelter(pCtx, cam, time, S);
    drawSupply(pCtx, cam, time, S);
    TERMINALS.forEach(t => drawTerminalSprite(pCtx, cam, t, S, time));
    drawLogs(pCtx, cam, time, S);
    drawDecoy(pCtx, S, cam, time);
    drawEnemies(pCtx, S, cam, time);

    if (!S.minigame) drawPlayer(pCtx, S, cam, time);

    drawDomeShell(pCtx, cam, S, time);
    drawWeather(pCtx, S, cam, time);

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 960, 540);
    ctx.drawImage(pCanvas, 0, 0, PW, PH, 0, 0, 960, 540);

    drawLabelsOverlay(ctx, S, cam);
  }

  return { draw, groundY, WIDTH: W };
})();
