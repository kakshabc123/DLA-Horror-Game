"use client";
import { useEffect, useRef, useState } from "react";

const R = (a: number, b: number) => a + Math.random() * (b - a);
const fmt = (t: number) => { const m = Math.floor(t / 60), s = t % 60; return `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`; };
const now = () => performance.now() / 1000;

function engine(cv: HTMLCanvasElement, A: any, tm: HTMLElement, done: (t: number) => void) {
  const g = cv.getContext("2d")!;
  let W = 0, H = 0;
  const rs = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
  rs(); addEventListener("resize", rs);
  const { ac, master } = A;
  const bus = ac.createGain(), hit = ac.createGain(), amb = ac.createGain();
  bus.connect(master); hit.connect(master); amb.connect(master); amb.gain.value = 0.02;
  const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const burst = (dst: any, f: number, q: number, type: string, dur: number, v: number, atk = 0.01, pan = 0, f2 = f) => {
    const s = ac.createBufferSource(); s.buffer = nb; s.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q; const n = ac.currentTime;
    fl.frequency.setValueAtTime(f, n); fl.frequency.exponentialRampToValueAtTime(f2, n + dur);
    const gn = ac.createGain(); gn.gain.setValueAtTime(0.0001, n);
    gn.gain.exponentialRampToValueAtTime(v, n + atk); gn.gain.exponentialRampToValueAtTime(0.0001, n + dur);
    const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    s.connect(fl); fl.connect(gn); gn.connect(p); p.connect(dst); s.start(n, Math.random()); s.stop(n + dur + 0.05);
  };
  const tone = (dst: any, type: string, f: number, f2: number, dur: number, v: number, atk = 0.01, lp = 20000, delay = 0) => {
    const o = ac.createOscillator(); o.type = type; const n = ac.currentTime + delay;
    o.frequency.setValueAtTime(f, n); o.frequency.exponentialRampToValueAtTime(f2, n + dur);
    const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp;
    const gn = ac.createGain(); gn.gain.setValueAtTime(0.0001, n);
    gn.gain.exponentialRampToValueAtTime(v, n + atk); gn.gain.exponentialRampToValueAtTime(0.0001, n + dur);
    o.connect(fl); fl.connect(gn); gn.connect(dst); o.start(n); o.stop(n + dur + 0.05);
  };
  const dist = ac.createWaveShaper(); const cu = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cu[i] = Math.tanh(x * 6); }
  dist.curve = cu; dist.connect(hit);
  // ambient
  const ns = ac.createBufferSource(); ns.buffer = nb; ns.loop = true;
  const nl = ac.createBiquadFilter(); nl.type = "lowpass"; nl.frequency.value = 170;
  ns.connect(nl); nl.connect(amb); ns.start();
  const o1 = ac.createOscillator(), o2 = ac.createOscillator(); o1.frequency.value = 47; o2.frequency.value = 49.4;
  o1.connect(amb); o2.connect(amb); o1.start(); o2.start();

  const S: any = { mode: "play", start: now(), flick: 0, strobeU: 0, chair: 0, chairJ: 0, tilt: 0, door: 0, doorT: 0, cam: 0, camT: 0,
    fig: null, farL: 0, per: null, hid: null, cracks: [], face: null, black: 0, white: 0, glitch: 0, shakeU: 0, shk: 1, alt: 0,
    lastFake: -99, first: true, next: now() + R(6, 9), cx: 0, cy: 0 };
  const live = () => S.mode === "play";
  const snd = {
    step: (p: number, v: number) => burst(bus, 150, 0.7, "lowpass", 0.22, v, 0.005, p, 60),
    breath: (p: number, v: number) => { burst(bus, 700, 1.5, "bandpass", 1.1, v, 0.45, p, 1100); setTimeout(() => live() && burst(bus, 1000, 1.5, "bandpass", 1.2, v * 0.8, 0.2, p, 500), 1150); },
    whisper: (p: number) => { let t = 0; for (let i = 0; i < R(4, 8); i++) { t += R(110, 220); setTimeout(() => live() && burst(bus, R(1500, 3500), 6, "bandpass", R(0.08, 0.2), 0.14, 0.02, p), t); } },
    creak: (v: number) => tone(bus, "sawtooth", R(55, 90), R(90, 150), R(1, 2), v, 0.3, 450),
    bang: (v: number) => { burst(bus, 3000, 0.3, "lowpass", 0.6, v, 0.003, 0, 60); tone(bus, "sine", 170, 30, 0.7, v, 0.003); },
  };
  const steps = (p: number, n: number) => { for (let i = 0; i < n; i++) setTimeout(() => live() && snd.step(p * (1 - i / (n * 1.3)), 0.2 + i * 0.05), i * 560); };
  const scream = () => {
    hit.gain.value = 1;
    burst(hit, 2500, 0.2, "highpass", 1.4, 1, 0.003);
    tone(dist, "sawtooth", 600, 1600, 1.1, 0.9, 0.003);
    tone(dist, "square", 420, 1150, 1.0, 0.5, 0.003);
    tone(hit, "sine", 100, 22, 1.4, 1, 0.003);
    tone(dist, "sawtooth", 95, 40, 1.2, 0.6, 0.02, 20000, 0.3);
    burst(hit, 4500, 0.2, "highpass", 0.9, 0.5, 0.3);
  };

  // visuals
  const nc = document.createElement("canvas"); nc.width = nc.height = 128;
  { const c = nc.getContext("2d")!, im = c.createImageData(128, 128); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } c.putImageData(im, 0, 0); }
  const pat = g.createPattern(nc, "repeat")!;
  const grain = (a: number) => { g.save(); g.translate(R(0, 128), R(0, 128)); g.globalAlpha = a; g.fillStyle = pat; g.fillRect(-128, -128, W + 128, H + 128); g.restore(); };
  const snap = document.createElement("canvas");
  const U = () => H, P = (x: number, y: number, d: number) => [W / 2 + x * U() / d + S.cx, H * 0.52 + y * U() / d + S.cy];
  const poly = (a: number[][], f: any) => { g.fillStyle = f; g.beginPath(); a.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
  const line = (a: number[], b: number[]) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
  const face = (x: number, y: number, r: number, open: number, col: string, ghost: boolean) => {
    g.save(); g.translate(x, y); g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, r * 0.62, r, 0, 0, 7); g.fill();
    g.fillStyle = "#000";
    for (const s of [-1, 1]) {
      g.beginPath(); g.ellipse(s * r * 0.26, -r * 0.28, r * 0.15, r * 0.16, s * 0.4, 0, 7); g.fill();
      if (!ghost) { g.fillStyle = "#fff"; g.beginPath(); g.arc(s * r * 0.26, -r * 0.27, r * 0.02, 0, 7); g.fill(); g.fillStyle = "#000"; }
    }
    g.fillRect(-r * 0.07, -r * 0.02, r * 0.03, r * 0.09); g.fillRect(r * 0.04, -r * 0.02, r * 0.03, r * 0.09);
    const mh = r * (0.05 + 0.28 * open), my = r * 0.42;
    g.beginPath(); g.ellipse(0, my, r * 0.4, mh, 0, 0, 7); g.fill();
    if (!ghost) {
      g.fillStyle = "#e8e2d6";
      for (let i = -7; i <= 7; i++) { const x0 = i * r * 0.052, ty = my - mh * Math.sqrt(Math.max(0, 1 - (x0 / (r * 0.4)) ** 2));
        g.beginPath(); g.moveTo(x0 - r * 0.028, ty); g.lineTo(x0 + r * 0.028, ty); g.lineTo(x0, ty + r * 0.1); g.fill(); }
      g.strokeStyle = "#000"; g.lineWidth = r * 0.012;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(R(-.3, .3) * r, -r); g.lineTo(R(-.4, .4) * r, -r * 0.5); g.stroke(); }
    }
    g.restore();
  };
  const chroma = (x: number, y: number, r: number, open: number, off: number) => {
    g.globalCompositeOperation = "lighter"; face(x - off, y, r, open, "#a00", true); face(x + off, y, r, open, "#0aa", true);
    g.globalCompositeOperation = "source-over"; face(x, y, r, open, "#cfc9bd", false);
  };
  const slices = (src: any, n: number, mx: number) => { for (let i = 0; i < n; i++) { const y = R(0, H), h = R(8, 60); g.drawImage(src, 0, y, W, h, R(-mx, mx), y, W, h); } };

  const scene = (tp: number) => {
    const n = now();
    const sh = n < S.shakeU ? 10 * S.shk : 0;
    S.cx = Math.sin(n * 0.4) * 4 + S.cam + R(-sh, sh); S.cy = Math.cos(n * 0.31) * 3 + R(-sh, sh) + (tp > 40 ? Math.sin(n * 9) * 1.5 : 0);
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    poly([P(-1, -1.1, .3), P(1, -1.1, .3), P(1, -1.1, 9), P(-1, -1.1, 9)], "#1d1c1a");
    poly([P(-1, .9, .3), P(1, .9, .3), P(1, .9, 9), P(-1, .9, 9)], "#181716");
    poly([P(-1, -1.1, .3), P(-1, .9, .3), P(-1, .9, 9), P(-1, -1.1, 9)], "#2a2824");
    poly([P(1, -1.1, .3), P(1, .9, .3), P(1, .9, 9), P(1, -1.1, 9)], "#25231f");
    poly([P(-1, -1.1, 9), P(1, -1.1, 9), P(1, .9, 9), P(-1, .9, 9)], "#1f1d1a");
    g.strokeStyle = "rgba(255,255,255,.05)"; g.lineWidth = 1;
    for (let d = 1; d <= 9; d++) { line(P(-1, -1.1, d), P(-1, .9, d)); line(P(1, -1.1, d), P(1, .9, d)); line(P(-1, .9, d), P(1, .9, d)); }
    g.strokeStyle = "rgba(0,0,0,.7)"; g.lineWidth = 2;
    S.cracks.forEach((c: number[]) => line(P(c[0], c[1], c[2]), P(c[0], c[1] + c[3], c[2])));
    const alt = n < S.alt;
    const [dx0, dy0] = P(-.35, -.6, 9), [dx1, dy1] = P(.35, .9, 9);
    g.fillStyle = "#0b0a09"; g.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
    const o = alt ? 1 : S.door;
    if (o > 0) { g.fillStyle = "#000"; g.fillRect(dx0, dy0, (dx1 - dx0) * o, dy1 - dy0); if (o > .5) { g.fillStyle = "rgba(80,8,8,.4)"; g.fillRect(dx0, dy0, (dx1 - dx0) * o * .5, dy1 - dy0); } }
    g.fillStyle = "#3a352d"; g.fillRect(dx1 - 6, (dy0 + dy1) / 2, 3, 3);
    // picture frame
    poly([P(1, -.6, 4.6), P(1, -.6 + S.tilt, 5.6), P(1, -.15 + S.tilt, 5.6), P(1, -.15, 4.6)], "#0d0c0b");
    { const [fx, fy] = P(1, -.38 + S.tilt / 2, 5.1); g.fillStyle = "#1d1b19"; g.beginPath(); g.ellipse(fx, fy, H * .02, H * .03, 0, 0, 7); g.fill(); }
    // chair
    { const d = 3.2, s = U() / d, [cx0, cy0] = P(alt ? .5 : -.62, .9, d), x = cx0 + S.chairJ; g.fillStyle = "#3a342b";
      if (S.chair) { g.fillRect(x - .22 * s, cy0 - .5 * s, .44 * s, .06 * s); g.fillRect(x - .22 * s, cy0 - 1.05 * s, .44 * s, .5 * s); g.fillStyle = "#26221c"; for (let i = 0; i < 3; i++) g.fillRect(x - .16 * s + i * .14 * s, cy0 - 1 * s, .05 * s, .4 * s); g.fillStyle = "#3a342b"; g.fillRect(x - .21 * s, cy0 - .44 * s, .04 * s, .44 * s); g.fillRect(x + .17 * s, cy0 - .44 * s, .04 * s, .44 * s); }
      else { g.fillRect(x - .2 * s, cy0 - .5 * s, .4 * s, .06 * s); g.fillRect(x + .16 * s, cy0 - 1.05 * s, .05 * s, .6 * s); g.fillRect(x - .19 * s, cy0 - .44 * s, .04 * s, .44 * s); g.fillRect(x + .15 * s, cy0 - .44 * s, .04 * s, .44 * s); } }
    // figure
    if (S.fig && n < S.fig.t1) { const f = S.fig, k = (n - f.t0) / (f.t1 - f.t0), x = f.x0 + (f.x1 - f.x0) * k, [fx, fy] = P(x, .9, f.d), s = U() / f.d;
      g.fillStyle = "#020202"; g.fillRect(fx - .1 * s, fy - .8 * s, .2 * s, .8 * s); g.fillRect(fx - .17 * s, fy - 1.55 * s, .34 * s, .8 * s);
      g.fillRect(fx - .25 * s, fy - 1.5 * s, .07 * s, .95 * s); g.fillRect(fx + .18 * s, fy - 1.5 * s, .07 * s, .95 * s);
      g.beginPath(); g.ellipse(fx, fy - 1.72 * s, .1 * s, .14 * s, 0, 0, 7); g.fill();
      if (f.eyes) { g.fillStyle = "rgba(255,255,255,.7)"; g.fillRect(fx - .05 * s, fy - 1.74 * s, .03 * s, .015 * s); g.fillRect(fx + .02 * s, fy - 1.74 * s, .03 * s, .015 * s); } }
    // lighting
    let L = .62;
    if (tp > 40 && Math.random() < .008) S.flick = n + .12;
    if (n < S.flick) L *= n < S.strobeU ? (Math.floor(n * 25) % 2 ? 1 : .05) : (Math.random() < .5 ? .08 : 1);
    const [lx, ly] = P(0, -1.1, 4.5);
    g.fillStyle = `rgba(255,240,200,${.85 * L})`; g.fillRect(...(P(-.2, -1.1, 4) as [number, number]), P(.2, -1.1, 4)[0] - P(-.2, -1.1, 4)[0], 5);
    const gr = g.createRadialGradient(lx, ly, 5, lx, ly, H * 1.1);
    gr.addColorStop(0, `rgba(0,0,0,${1 - .9 * L})`); gr.addColorStop(.45, `rgba(0,0,0,${.97 - .5 * L})`); gr.addColorStop(1, "rgba(0,0,0,.985)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (n < S.farL) { const [x, y] = P(.55, -.3, 9), rg = g.createRadialGradient(x, y, 0, x, y, H * .08); rg.addColorStop(0, "rgba(255,190,110,.55)"); rg.addColorStop(1, "rgba(255,190,110,0)"); g.fillStyle = rg; g.fillRect(x - H * .08, y - H * .08, H * .16, H * .16); }
    if (S.hid && n < S.hid.t1) { const [x, y] = P(S.hid.x, S.hid.y, 9); g.globalAlpha = .35; face(x, y, H * .035, .1, "#b8b2a6", false); g.globalAlpha = 1; }
    if (S.per && n < S.per.t1) { g.fillStyle = "rgba(0,0,0,.95)"; g.beginPath(); g.ellipse(S.per.s < 0 ? W * .03 : W * .97, H * .55, W * .03, H * .3, 0, 0, 7); g.fill(); }
    if (S.face && n < S.face.t1) chroma(W / 2, H * .5, S.face.r, S.face.open, S.face.r * .04);
    if (n < S.glitch) slices(cv, 6, 40);
    grain(.07 + Math.min(tp, 120) / 1500);
    const v = g.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .95); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.85)"); g.fillStyle = v; g.fillRect(0, 0, W, H);
    if (n < S.white) { g.fillStyle = "rgba(255,255,255,.92)"; g.fillRect(0, 0, W, H); }
    if (n < S.black) { g.fillStyle = "#000"; g.fillRect(0, 0, W, H); }
  };

  // events: [weights per level 0..3, fn, isFake]
  const fig = (x0: number, x1: number, d: number, dur: number, eyes = false) => { S.fig = { x0, x1, d, t0: now(), t1: now() + dur, eyes }; };
  const fc = (r: number, ms: number, open = .3) => { S.face = { r, open, t1: now() + ms / 1000 }; };
  const pan = () => Math.random() < .5 ? -1 : 1;
  const fake = (f: () => void) => () => { f(); S.lastFake = now(); S.shk = R(1, 2); S.shakeU = now() + R(.3, .5); snd.bang(1); };
  const ev: [number[], () => void, boolean?][] = [
    [[3, 2, 1, 1], () => { S.flick = now() + R(.2, .5); }],
    [[3, 2, 1, 0], () => { S.chairJ = R(-6, 6); snd.creak(.03); }],
    [[3, 2, 1, 1], () => { S.tilt = Math.min(.12, S.tilt + R(.02, .05)); }],
    [[3, 2, 1, 0], () => { S.doorT = Math.min(.35, S.doorT + R(.05, .1)); snd.creak(.05); }],
    [[3, 2, 1, 1], () => { const x = R(-.3, .3); fig(x, x, 8.7, R(.35, .7)); }],
    [[2, 2, 1, 1], () => { S.farL = now() + R(3, 8); }],
    [[2, 2, 2, 1], () => { S.per = { t1: now() + .18, s: pan() }; }],
    [[2, 1, 1, 0], () => { S.camT = R(-14, 14); }],
    [[2, 2, 2, 1], () => { S.hid = { t1: now() + R(.2, .35), x: R(-.25, .25), y: R(-.4, .2) }; }],
    [[2, 1, 1, 0], () => { S.cracks.push([pan(), R(-.9, .4), R(2, 8), R(.2, .5)]); }],
    [[0, 4, 3, 2], () => { const s = pan(); fig(-1.1 * s, 1.1 * s, R(4.5, 6), 2.4); steps(s, 5); }],
    [[0, 3, 2, 2], () => { S.doorT = .9; snd.creak(.1); }],
    [[0, 3, 3, 3], () => steps(pan(), Math.floor(R(5, 9)))],
    [[0, 3, 3, 3], () => snd.breath(R(-1, 1), .25)],
    [[0, 3, 3, 4], () => snd.whisper(R(-1, 1))],
    [[0, 2, 3, 4], () => { S.flick = now() + R(1, 2.2); S.strobeU = S.flick; }],
    [[0, 2, 3, 4], () => { S.glitch = now() + R(.2, .5); }],
    [[0, 2, 3, 3], () => { const x = R(-.3, .3); fig(x, x, 7, .6); setTimeout(() => { if (live()) { S.black = now() + .12; fig(x, x, 4, 1.3, true); snd.step(0, .3); } }, 600); }],
    [[0, 2, 3, 3], () => { fc(H * .3, 100); snd.bang(.25); }],
    [[0, 2, 2, 3], () => { S.black = now() + R(.25, .7); }],
    [[0, 1, 2, 2], () => { S.alt = now() + R(.15, .35); }],
    [[0, 0, 2, 3], fake(() => { fc(H * .6, 110, .8); S.white = now() + .05; }), true],
    [[0, 0, 2, 3], fake(() => { S.white = now() + .1; }), true],
    [[0, 0, 1, 3], fake(() => { fc(H * 1.1, 130, .9); }), true],
  ];

  const startScare = (tp: number) => {
    S.mode = "freeze"; S.sc = now(); S.sil = R(.2, .5); S.final = tp;
    snap.width = W; snap.height = H; snap.getContext("2d")!.drawImage(cv, 0, 0);
    bus.gain.setTargetAtTime(0, ac.currentTime, .003); amb.gain.setTargetAtTime(0, ac.currentTime, .003);
  };
  const boom = (b: number) => {
    const k = Math.min(1, b / .16), ez = 1 - (1 - k) ** 3, sh = (1 - Math.min(1, b / 1.5)) * W * .035;
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2 + R(-sh, sh), H / 2 + R(-sh, sh)); const z = 1 + b * .25; g.scale(z, z); g.translate(-W / 2, -H / 2);
    g.globalAlpha = .5; g.drawImage(snap, 0, 0); g.globalAlpha = 1;
    const r = H * (.2 + 1.25 * ez) + Math.sin(b * 50) * H * .02;
    chroma(W / 2 + R(-1, 1) * sh * .5, H * .5 + (1 - ez) * H * .15 + R(-1, 1) * sh * .5, r, .3 + .7 * Math.abs(Math.sin(b * (b < .2 ? 10 : 26))), r * .05 * (1 + Math.sin(b * 30)));
    g.restore();
    slices(cv, 8, 90);
    if (b < .07) { g.fillStyle = "rgba(200,0,0,.7)"; g.fillRect(0, 0, W, H); }
    else if (b < .14) { g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(0, 0, W, H); }
    else if (Math.random() < .08) { g.fillStyle = "rgba(160,0,0,.3)"; g.fillRect(0, 0, W, H); }
    grain(.5);
  };

  let last = now(), raf = 0;
  const loop = () => {
    if (S.mode === "end") return;
    raf = requestAnimationFrame(loop);
    const n = now(), dt = Math.min(.1, n - last); last = n; const tp = n - S.start;
    if (S.mode === "play") {
      const lvl = tp < 10 ? 0 : tp < 20 ? 1 : tp < 40 ? 2 : 3;
      S.door += (S.doorT - S.door) * Math.min(1, dt * .5); S.cam += (S.camT - S.cam) * Math.min(1, dt * .6);
      amb.gain.setTargetAtTime(.04 + Math.min(tp, 60) / 60 * .08, ac.currentTime, .5);
      if (n > S.next) {
        let fk = false;
        if (S.first) { S.first = false; S.chair = 1; snd.creak(.04); }
        else {
          const ws = ev.map(e => (e[2] && n - S.lastFake < 8) ? 0 : e[0][lvl]); let r = Math.random() * ws.reduce((a, b) => a + b, 0), i = 0;
          for (; i < ws.length - 1; i++) { r -= ws[i]; if (r <= 0) break; }
          ev[i][1](); fk = !!ev[i][2];
        }
        const a = Math.max(0, 1 - tp / 45); let gap = R(1.5 + 3 * a, 3.5 + 5 * a);
        if (Math.random() < .2) gap += R(5, 9);
        if (fk) gap += R(2, 4);
        S.next = n + gap;
      }
      if (tp > 6 && Math.random() < Math.min(.1, .008 + .0012 * (tp - 6)) * dt) startScare(tp);
      if (S.mode === "play") { scene(tp); tm.textContent = fmt(tp); }
    } else if (S.mode === "freeze") {
      const e = n - S.sc; g.drawImage(snap, 0, 0);
      if (e > S.sil * .5 && !S.br) { S.br = 1; burst(hit, 900, 2, "bandpass", .35, .12, .12, 0, 500); }
      if (e > S.sil * .6) slices(snap, 4, 30);
      if (e >= S.sil) { S.mode = "boom"; S.bt = n; tm.style.opacity = "0"; scream(); }
    } else if (S.mode === "boom") {
      const b = n - S.bt; boom(b); if (b > 1.5) { S.mode = "black"; S.bk = n; }
    } else if (S.mode === "black") {
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      if (n - S.bk > 1) { const t = S.final; S.mode = "end"; done(t); }
    }
  };
  loop();
  return () => { S.mode = "end"; cancelAnimationFrame(raf); removeEventListener("resize", rs); try { ns.stop(); o1.stop(); o2.stop(); } catch {} bus.disconnect(); hit.disconnect(); amb.disconnect(); };
}

export default function Game() {
  const [ph, setPh] = useState<"title" | "play" | "dead">("title");
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [muted, setMuted] = useState(false);
  const cv = useRef<HTMLCanvasElement>(null), tm = useRef<HTMLDivElement>(null), au = useRef<any>(null), mu = useRef(false);

  useEffect(() => { const a = setTimeout(() => setStep(1), 1000), b = setTimeout(() => setStep(2), 4500), c = setTimeout(() => setStep(3), 7000); return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); }; }, []);

  const begin = () => {
    if (step < 3) return;
    try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch {}
    if (!au.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext, ac = new AC(), master = ac.createGain();
      master.gain.value = mu.current ? 0 : 1; master.connect(ac.destination); au.current = { ac, master };
    }
    au.current.ac.resume(); setPh("play"); setRun(r => r + 1);
  };
  const again = () => { setPh("play"); setRun(r => r + 1); };
  const toggleMute = () => { mu.current = !mu.current; setMuted(mu.current); if (au.current) au.current.master.gain.value = mu.current ? 0 : 1; };

  useEffect(() => {
    if (ph !== "play" || !cv.current || !tm.current || !au.current) return;
    return engine(cv.current, au.current, tm.current, (t: number) => {
      let b = 0; try { b = Number(localStorage.getItem("dla-best") || 0); if (t > b) { localStorage.setItem("dla-best", String(t)); b = t; } } catch {}
      setBest(b); setScore(t); setPh("dead");
    });
  }, [ph, run]);

  const fade = (on: boolean) => `transition-opacity duration-[2500ms] ${on ? "opacity-90" : "opacity-0"}`;
  return (
    <main className="fixed inset-0 bg-black text-[#cfc9bd] select-none overflow-hidden font-serif" onClick={ph === "title" ? begin : undefined}>
      {ph === "title" && (
        <div className="h-full flex flex-col items-center justify-center gap-10 text-center px-4">
          <h1 className={`text-4xl md:text-7xl tracking-[.3em] ${fade(step >= 1)}`}>DON'T LOOK AWAY</h1>
          <p className={`text-lg md:text-2xl tracking-widest ${fade(step >= 2)}`}>Put on headphones.</p>
          <p className={`text-sm md:text-lg tracking-[.25em] text-[#8a0f0f] ${fade(step >= 3)} ${step >= 3 ? "animate-pulse" : ""}`}>Click anywhere to begin.</p>
        </div>
      )}
      {ph === "play" && (<>
        <canvas ref={cv} className="absolute inset-0 w-full h-full" />
        <div className="pointer-events-none absolute inset-0 scan" />
        <div ref={tm} className="absolute top-3 left-4 font-mono text-xs opacity-40" />
        <button onClick={toggleMute} className="absolute top-3 right-4 font-mono text-[10px] opacity-30 hover:opacity-80">{muted ? "SOUND OFF" : "SOUND ON"}</button>
      </>)}
      {ph === "dead" && (
        <div className="h-full flex flex-col items-center justify-center gap-6 text-center">
          <p className="fadein text-xl tracking-[.4em]" style={{ animationDelay: "0s" }}>YOU SURVIVED</p>
          <p className="fadein font-mono text-sm opacity-70" style={{ animationDelay: "1.2s" }}>Your time:</p>
          <p className="fadein font-mono text-4xl md:text-6xl" style={{ animationDelay: "1.2s" }}>{score.toFixed(2)} SECONDS</p>
          <p className="fadein text-lg tracking-[.3em] text-[#8a0f0f]" style={{ animationDelay: "3s" }}>BUT YOU LOOKED AWAY.</p>
          <button onClick={again} className="fadein mt-6 border border-[#cfc9bd]/40 px-8 py-3 tracking-[.4em] hover:bg-[#cfc9bd] hover:text-black transition-colors" style={{ animationDelay: "4.2s" }}>TRY AGAIN</button>
          <p className="fadein font-mono text-[10px] opacity-40" style={{ animationDelay: "4.2s" }}>BEST {best.toFixed(2)}s</p>
        </div>
      )}
    </main>
  );
}
