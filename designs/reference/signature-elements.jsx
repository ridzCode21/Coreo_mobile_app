class Component extends DCLogic {
  componentWillUnmount() {
    Object.values(this._w3 || {}).forEach((s) => { if (s.raf) cancelAnimationFrame(s.raf); });
  }
  _w3 = {}; // per-variant { cv, raf }
  _makeWave3d = (key, opts) => {
    if (!this._w3refs) this._w3refs = {};
    if (this._w3refs[key]) return this._w3refs[key];
    const ref = (cv) => {
      const slot = this._w3[key] || (this._w3[key] = {});
      if (!cv) { if (slot.raf) cancelAnimationFrame(slot.raf); slot.cv = null; return; }
      if (cv === slot.cv) return;
      slot.cv = cv;
      const W = 390, H = 844;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = W * dpr; cv.height = H * dpr;
      const ctx = cv.getContext('2d');
      ctx.scale(dpr, dpr);
      const CX = W / 2;
      const horizon = 168, bottom = 704;
      const rows = 52, cols = 68;
      const lerp = (a, b, u) => a + (b - a) * u;
      const clamp01 = (v) => Math.min(1, Math.max(0, v));
      const zc = Math.pow((318 - horizon) / (bottom - horizon), 1 / 1.55);
      const growSpeed = 340;
      const ampBase = 26 * (opts.amp || 1);
      const speed = opts.speed || 1;
      const shade = opts.shade || 0;      // fill lightness swing from wave height
      const lineA = opts.lines || 0;      // stroke opacity factor (0 = no lines)
      const ink = opts.ink || false;      // dark ink lines instead of white
      const colFar = opts.colFar || [206, 227, 246];
      const colNear = opts.colNear || [116, 158, 204];
      if (slot.raf) cancelAnimationFrame(slot.raf);
      const t0 = performance.now();
      const draw = (tms) => {
        const t = (tms / 1000) * speed;
        const front = ((tms - t0) / 1000) * growSpeed;
        ctx.clearRect(0, 0, W, H);
        for (let i = 0; i < rows; i++) {
          const z = i / (rows - 1);
          const yBase = horizon + Math.pow(z, 1.55) * (bottom - horizon);
          const zw = (z - zc) * 760;
          const sx = lerp(0.42, 1.25, z);
          const amp = ampBase * (0.32 + z * 0.85);
          const fade = clamp01((yBase - horizon) / 55) * clamp01((bottom - yBase) / 110);
          ctx.beginPath();
          let hSum = 0;
          for (let j = 0; j <= cols; j++) {
            const wx = (j / cols - 0.5) * 640;
            const d = Math.sqrt(wx * wx + zw * zw);
            const reach = clamp01((front - d) / 90);
            const hgt = (Math.sin(d * 0.045 - t * 1.1) * Math.exp(-d / 300)
              + 0.5 * Math.sin(d * 0.09 - t * 1.7 + 1.3) * Math.exp(-d / 220)
              + 0.22 * Math.sin(wx * 0.01 + t * 0.4) * Math.sin(zw * 0.012 - t * 0.28)) * reach;
            hSum += hgt;
            const x = CX + wx * sx;
            const y = yBase - hgt * amp;
            if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          const hAvg = hSum / (cols + 1);
          if (lineA > 0) {
            ctx.strokeStyle = ink
              ? 'rgba(23,25,29,' + ((0.05 + z * 0.22) * lineA * fade).toFixed(3) + ')'
              : 'rgba(255,255,255,' + ((0.12 + z * 0.4) * lineA * fade).toFixed(3) + ')';
            ctx.lineWidth = lerp(0.7, 1.5, z);
            ctx.stroke();
          }
          const xR = CX + 320 * sx, xL = CX - 320 * sx;
          ctx.lineTo(xR, H); ctx.lineTo(xL, H); ctx.closePath();
          const u = clamp01((yBase - horizon) / (bottom - horizon));
          // crests catch light, troughs sit in shadow — makes the surface readable without strokes
          const lift = hAvg * shade;
          const r = Math.round(lerp(colFar[0], colNear[0], u) + lift), g = Math.round(lerp(colFar[1], colNear[1], u) + lift), b = Math.round(lerp(colFar[2], colNear[2], u) + lift);
          ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (0.9 * fade).toFixed(3) + ')';
          ctx.fill();
        }
        slot.raf = requestAnimationFrame(draw);
      };
      slot.raf = requestAnimationFrame(draw);
    };
    this._w3refs[key] = ref;
    return ref;
  };
  renderVals() {
    const h = React.createElement;
    const userName = this.props.userName ?? 'Shubham';
    const dayScore = Math.min(100, Math.max(0, Math.round(this.props.dayScore ?? 78)));
    const drift = this.props.ambientDrift ?? true;

    const FONT = {
      '0': ['01110','10001','10011','10101','11001','10001','01110'],
      '1': ['00100','01100','00100','00100','00100','00100','01110'],
      '2': ['01110','10001','00001','00010','00100','01000','11111'],
      '3': ['11110','00001','00001','01110','00001','00001','11110'],
      '4': ['00010','00110','01010','10010','11111','00010','00010'],
      '5': ['11111','10000','11110','00001','00001','10001','01110'],
      '6': ['00110','01000','10000','11110','10001','10001','01110'],
      '7': ['11111','00001','00010','00100','01000','01000','01000'],
      '8': ['01110','10001','10001','01110','10001','10001','01110'],
      '9': ['01110','10001','10001','01111','00001','00010','01100'],
    };

    // dot-matrix numeral: lit dots full, unlit grid at 10%
    const dots = (str, cell, color) => {
      const chars = String(str).split('');
      const gap = Math.round(cell * 1.3);
      const w = chars.length * 5 * cell + (chars.length - 1) * gap;
      const hgt = 7 * cell;
      const els = [];
      chars.forEach((ch, ci) => {
        const g = FONT[ch];
        if (!g) return;
        const ox = ci * (5 * cell + gap);
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 5; c++) {
            els.push(h('circle', {
              key: ci + '-' + r + '-' + c,
              cx: ox + c * cell + cell / 2,
              cy: r * cell + cell / 2,
              r: cell * 0.33,
              fill: color,
              opacity: g[r][c] === '1' ? 1 : 0.10,
            }));
          }
        }
      });
      return h('svg', { width: w, height: hgt, viewBox: '0 0 ' + w + ' ' + hgt, style: { display: 'block', position: 'relative' } }, els);
    };

    // hero score = ambient status tint (data only) behind dot-matrix digits
    const heroScore = (value, cell, color) => {
      const onTrack = value >= 60;
      const tint = onTrack ? 'rgba(122,192,146,.30)' : 'rgba(230,170,90,.32)';
      return h('div', { style: { position: 'relative', display: 'inline-block' } },
        h('div', { style: { position: 'absolute', inset: '-18px -26px', borderRadius: '50%', background: 'radial-gradient(closest-side,' + tint + ', transparent)' } }),
        dots(value, cell, color)
      );
    };

    // signature wave: solid past, dashed faint future, glowing white dot at now,
    // soft white gradient fill under the past
    const wave = (uid, pts, opts = {}) => {
      const W = opts.w ?? 322, H = opts.h ?? 92, now = opts.now ?? 0.62;
      const mode = opts.mode ?? 'normal'; // normal | dashedOnly | pastOnly
      const onLight = opts.onLight ?? false;
      const top = 12, bot = 14;
      const xy = pts.map((v, i) => [i / (pts.length - 1) * W, top + v * (H - top - bot)]);
      let d = 'M ' + xy[0][0] + ' ' + xy[0][1];
      for (let i = 1; i < xy.length; i++) {
        const x0 = xy[i - 1][0], y0 = xy[i - 1][1], x1 = xy[i][0], y1 = xy[i][1];
        d += ' Q ' + x0 + ' ' + y0 + ' ' + (x0 + x1) / 2 + ' ' + (y0 + y1) / 2;
      }
      d += ' L ' + xy[xy.length - 1][0] + ' ' + xy[xy.length - 1][1];
      const nowX = now * W;
      const idx = now * (pts.length - 1);
      const i0 = Math.floor(idx), fr = idx - i0;
      const yA = xy[i0][1], yB = xy[Math.min(i0 + 1, xy.length - 1)][1];
      const yNow = yA + (yB - yA) * fr;
      const kids = [];
      kids.push(h('defs', { key: 'defs' },
        h('linearGradient', { id: 'g' + uid, x1: 0, y1: 0, x2: 0, y2: 1 },
          h('stop', { offset: 0, stopColor: '#FFFFFF', stopOpacity: onLight ? 0.5 : 0.2 }),
          h('stop', { offset: 1, stopColor: '#FFFFFF', stopOpacity: 0 })
        ),
        h('clipPath', { id: 'p' + uid }, h('rect', { x: 0, y: 0, width: nowX, height: H })),
        h('clipPath', { id: 'f' + uid }, h('rect', { x: nowX, y: 0, width: W - nowX, height: H }))
      ));
      if (mode !== 'dashedOnly') {
        kids.push(h('path', { key: 'area', d: d + ' L ' + W + ' ' + H + ' L 0 ' + H + ' Z', fill: 'url(#g' + uid + ')', clipPath: 'url(#p' + uid + ')' }));
      }
      if (onLight && mode !== 'dashedOnly') {
        kids.push(h('path', { key: 'under', d: d, stroke: 'rgba(95,107,118,.4)', strokeWidth: 3.5, fill: 'none', strokeLinecap: 'round', clipPath: 'url(#p' + uid + ')' }));
      }
      if (mode === 'dashedOnly') {
        kids.push(h('path', { key: 'dash', d: d, stroke: onLight ? 'rgba(95,107,118,.45)' : 'rgba(255,255,255,.35)', strokeWidth: 2, strokeDasharray: '3 7', fill: 'none', strokeLinecap: 'round' }));
      } else {
        kids.push(h('path', { key: 'solid', d: d, stroke: '#FFFFFF', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', clipPath: 'url(#p' + uid + ')' }));
        if (mode !== 'pastOnly') {
          kids.push(h('path', { key: 'future', d: d, stroke: onLight ? 'rgba(95,107,118,.4)' : 'rgba(255,255,255,.3)', strokeWidth: 2, strokeDasharray: '3 7', fill: 'none', strokeLinecap: 'round', clipPath: 'url(#f' + uid + ')' }));
        } else {
          kids.push(h('path', { key: 'flat', d: 'M ' + nowX + ' ' + yNow + ' L ' + W + ' ' + yNow, stroke: 'rgba(255,255,255,.16)', strokeWidth: 2, strokeDasharray: '2 8', fill: 'none', strokeLinecap: 'round' }));
        }
        kids.push(h('circle', { key: 'glow', cx: nowX, cy: yNow, r: 10, fill: 'rgba(255,255,255,.2)' }));
        kids.push(h('circle', { key: 'dot', cx: nowX, cy: yNow, r: 4.5, fill: '#FFFFFF', stroke: onLight ? 'rgba(95,107,118,.5)' : 'none', strokeWidth: onLight ? 1 : 0 }));
      }
      return h('svg', { width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', style: { display: 'block' } }, kids);
    };

    // slow drifting blurred forms behind the glass
    const blob = (key, style, anim) => h('div', {
      key: key,
      style: Object.assign({
        position: 'absolute', borderRadius: '50%', filter: 'blur(34px)', pointerEvents: 'none',
        animation: drift ? anim : 'none',
      }, style),
    });
    const wRing = (key, dur, delay, anim, extra) => h('div', { key, style: Object.assign({ position: 'absolute', left: '50%', top: '39%', width: 150, height: 150, marginLeft: -75, marginTop: -75, borderRadius: '50%', border: '1px solid rgba(255,255,255,.6)', animation: anim + ' ' + dur + 's cubic-bezier(.25,.55,.45,1) ' + delay + 's infinite', pointerEvents: 'none' }, extra || {}) });
    const wWrap = (kids) => h('div', { style: { position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' } }, kids);
    const w3canvas = (key, opts) => wWrap([h('canvas', { key: 'w3d-' + key, ref: this._makeWave3d(key, opts), style: { position: 'absolute', inset: 0, width: '100%', height: '100%' } })]);
    const waves22a = w3canvas('a', { shade: 16 });                        // soft fill, gentle shading
    const waves22b = w3canvas('b', { shade: 10, lines: 1 });              // fill + white contour lines
    const waves22c = w3canvas('c', { shade: 34, amp: 1.3 });              // no lines, bold light/shadow
    const waves22d = w3canvas('d', { shade: 6, lines: 1.6, ink: true });  // ink wireframe mesh
    const waves24 = w3canvas('sky', { shade: 26, amp: 1.15, colFar: [214, 234, 250], colNear: [124, 163, 204] }); // sky-blue water
    const ambient = h('div', { style: { position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' } },
      blob('b1', { width: 280, height: 280, top: -60, left: -70, background: 'radial-gradient(circle, rgba(255,255,255,.55), rgba(255,255,255,0) 70%)' }, 'coreoDrift1 16s ease-in-out infinite alternate'),
      blob('b2', { width: 320, height: 320, bottom: -90, right: -100, background: 'radial-gradient(circle, rgba(143,161,179,.6), rgba(143,161,179,0) 70%)' }, 'coreoDrift2 20s ease-in-out infinite alternate'),
      blob('b3', { width: 220, height: 220, top: '38%', left: '46%', background: 'radial-gradient(circle, rgba(255,255,255,.32), rgba(255,255,255,0) 70%)' }, 'coreoDrift3 24s ease-in-out infinite alternate')
    );

    const dayPts = [0.75, 0.68, 0.55, 0.45, 0.35, 0.28, 0.24, 0.28, 0.4, 0.5, 0.58, 0.62];
    const stressPts = [0.55, 0.62, 0.74, 0.68, 0.78, 0.66, 0.52, 0.44, 0.38, 0.3, 0.26, 0.24];
    const stalePts = [0.5, 0.55, 0.62, 0.58, 0.66, 0.72, 0.64, 0.55, 0.58, 0.6, 0.62, 0.64];
    const calibPts = [0.5, 0.56, 0.48, 0.55, 0.5, 0.56, 0.49, 0.55, 0.5, 0.56, 0.5, 0.53];
    const readPts = [0.6, 0.48, 0.62, 0.44, 0.58, 0.42, 0.56, 0.4, 0.52, 0.44, 0.5, 0.46];
    const saveWavePts = [0.3, 0.28, 0.24, 0.26, 0.22, 0.2, 0.18, 0.16, 0.14, 0.12, 0.1, 0.09];
    const offlinePts = [0.72, 0.64, 0.56, 0.48, 0.42, 0.5, 0.58, 0.5, 0.44, 0.5, 0.44, 0.5];

    const waveSave = wave('sv1', saveWavePts, { mode: 'pastOnly', now: 0.92, h: 46, onLight: true });
    const waveCalibHome = wave('cb1', calibPts, { mode: 'dashedOnly', h: 66 });
    const waveOffline = wave('of1', offlinePts, { mode: 'pastOnly', now: 0.7, h: 84 });
    const waveLockExpanded = wave('lk1', dayPts, { mode: 'normal', now: 0.62, onLight: true, h: 54, w: 278 });

    return {
      waveSave: waveSave,
      waveCalibHome: waveCalibHome,
      waveOffline: waveOffline,
      waveLockExpanded: waveLockExpanded,
      userName: userName,
      dayScore: dayScore,
      phoneW: 390,
      phoneH: 844,
      ambient: ambient,
      waves22a: waves22a,
      waves22b: waves22b,
      waves22c: waves22c,
      waves22d: waves22d,
      waves24: waves24,
      score1a: heroScore(dayScore, 8.5, '#FFFFFF'),
      score1c: heroScore(dayScore, 13, '#17191D'),
      wave1a: wave('a1', dayPts, { now: 0.62 }),
      wave2a: wave('a3', dayPts, { now: 0.62, h: 84 }),
      wave1aCal: wave('a2', calibPts, { mode: 'dashedOnly', h: 78 }),
      wave1b: wave('b1', stressPts, { now: 0.62 }),
      wave1bStale: wave('b2', stalePts, { mode: 'pastOnly', now: 0.45 }),
      wave1c: wave('c1', dayPts, { now: 0.62, h: 64, w: 290 }),
      waveWelcome: wave('w1', dayPts, { now: 0.62, w: 390, h: 200 }),
      waveOnbRead: wave('o1', readPts, { now: 0.58, onLight: true, h: 80 }),
      waveOnbRead2: wave('o2', readPts, { now: 0.58, onLight: true, h: 80 }),
      waveOnbCal: wave('o3', calibPts, { mode: 'dashedOnly', h: 82 }),
      waveOnbCal2: wave('o4', calibPts, { mode: 'dashedOnly', h: 82 }),
      progress1c: wave('c2', readPts, { now: 0.58, onLight: true, h: 70 }),
    };
  }
}
