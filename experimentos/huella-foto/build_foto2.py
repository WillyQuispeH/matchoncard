# VARIANTE DE PRUEBA 2: mano abierta → pulgar → 3 fotos automáticas (2 de 3 deben coincidir). Parte de la variante 1.
import sys, re
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    c = s.count(a); assert c == n, (c, a[:100]); s = s.replace(a, b)

a = s.index("  // ══════════ VARIANTE DE PRUEBA: huella con una sola foto ══════════")
b = s.index("  $('#shotBtn').addEventListener('click', shotStart);")
NUEVO = r"""  // ══════════ VARIANTE DE PRUEBA 2: mano abierta → pulgar → 3 fotos automáticas ══════════
  const ONE_SHOT = true;
  const MANO = CFG.manoCedula || 'derecha';            // la cédula chilena lleva la huella del pulgar derecho
  const NFOTOS = 3, AUTO_RUN = 3, GAP_MS = 900, BURST_MS = 600;
  S.shotLog = [];
  const HAND = { lm: null, loading: null, failed: false, last: null, lastAt: 0, busy: false };
  function handModel() {
    if (HAND.lm || HAND.failed) return Promise.resolve(HAND.lm);
    if (!HAND.loading) HAND.loading = (async () => {
      try {
        const V = await import(CFG.mpVision || 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');
        const fs = await V.FilesetResolver.forVisionTasks(CFG.mpWasm || 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
        const opts = (d) => ({ baseOptions: { modelAssetPath: CFG.mpHand || 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: d }, runningMode: 'VIDEO', numHands: 1 });
        try { HAND.lm = await V.HandLandmarker.createFromOptions(fs, opts('GPU')); } catch (e) { HAND.lm = await V.HandLandmarker.createFromOptions(fs, opts('CPU')); }
      } catch (e) { HAND.failed = true; console.warn('Modelo de mano no disponible:', e); }
      return HAND.lm;
    })();
    return HAND.loading;
  }
  function handDetect(now, every) {
    if (!HAND.lm || HAND.busy || now - HAND.lastAt < every) return HAND.last;
    HAND.busy = true; HAND.lastAt = now;
    try {
      const r = HAND.lm.detectForVideo(video, now);
      if (r && r.landmarks && r.landmarks[0]) {
        const lab = r.handedness && r.handedness[0] && r.handedness[0][0];
        // MediaPipe supone imagen espejada (cámara frontal); con la cámara trasera la etiqueta se invierte
        let mano = lab ? (lab.categoryName === 'Left' ? 'derecha' : 'izquierda') : null;
        if (S.facing === 'user' && mano) mano = mano === 'derecha' ? 'izquierda' : 'derecha';
        HAND.last = { pts: r.landmarks[0], mano, score: lab ? lab.score : 0, at: now };
      } else HAND.last = null;
    } catch (e) { HAND.last = null; }
    HAND.busy = false;
    return HAND.last;
  }
  const dedosExtendidos = (p) => { const d = (a, b) => Math.hypot(p[a].x - p[b].x, p[a].y - p[b].y); let n = 0; for (const [m, t] of [[5, 8], [9, 12], [13, 16], [17, 20]]) if (d(0, t) > 1.55 * d(0, m)) n++; return n; };
  function drawHand(G, h) {
    const P = h.pts.map((p) => ({ x: toScreenX(G, p.x * video.videoWidth), y: p.y * video.videoHeight * G.k + G.oy }));
    og.strokeStyle = 'rgba(93,177,209,.9)'; og.lineWidth = 3;
    for (const ch of [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [5, 9, 10, 11, 12], [9, 13, 14, 15, 16], [13, 17, 18, 19, 20], [0, 17]]) { og.beginPath(); ch.forEach((i, k) => (k ? og.lineTo(P[i].x, P[i].y) : og.moveTo(P[i].x, P[i].y))); og.stroke(); }
    for (let i = 0; i < 21; i++) { og.fillStyle = i === 4 ? '#3FD49A' : '#E8EEF1'; og.beginPath(); og.arc(P[i].x, P[i].y, i === 4 ? 10 : 4, 0, Math.PI * 2); og.fill(); }
    og.fillStyle = '#3FD49A'; og.font = '600 15px sans-serif'; og.fillText('pulgar', P[4].x + 14, P[4].y + 5);
  }
  // etapa 1: mano abierta
  function handStart() {
    S.hand = { t0: performance.now(), ok: 0 };
    try { const z = $('#zoom'); S.hand.zoom = +z.value || 1; if (!z.hidden && +z.value > 1.05) setZoom(1); } catch (e) {}
    $('#shotBtn').hidden = true; $('#scanRow').hidden = true;
    $('#camTitle').textContent = 'Muestra tu mano'; $('#camSub').textContent = 'Paso 1 de 3 · Huella · primero la mano abierta';
    say(`Muestra tu mano ${MANO} abierta, con la palma hacia la cámara`, ''); voice(`Muestra tu mano ${MANO} abierta, con la palma hacia la cámara`);
    handModel(); S.mode = 'hand';
  }
  function tickHand(G, now) {
    const H = S.hand; og.clearRect(0, 0, G.sw, G.sh);
    if (HAND.failed || now - H.t0 > 25000) { handDone(false, HAND.failed ? 'modelo no disponible' : 'no se detectó la mano a tiempo'); return; }
    if (!HAND.lm) { say('Preparando el reconocimiento de la mano…'); return; }
    const h = handDetect(now, 120);
    if (!h) { H.ok = 0; say(`Muestra tu mano ${MANO} abierta, con la palma hacia la cámara`, ''); return; }
    drawHand(G, h);
    if (h.mano && h.mano !== MANO && h.score > 0.7) { H.ok = 0; H.wrong = (H.wrong || 0) + 1; say(`Esa parece tu mano ${h.mano}. Muestra la ${MANO}`, 'warn'); return; }
    if (dedosExtendidos(h.pts) < 4) { H.ok = 0; say('Abre bien la mano, con los dedos separados', 'warn'); return; }
    H.ok++; say('¡Bien! Mantén la mano así…', 'ok');
    if (H.ok >= 5) handDone(true, null, h);
  }
  function handDone(ok, motivo, h) {
    S.handCheck = { ok, motivo, mano: h ? h.mano : null, score: h ? +h.score.toFixed(2) : null, deteccionesManoEquivocada: (S.hand && S.hand.wrong) || 0, at: new Date().toISOString() };
    if (ok) uxGood();
    try { if (S.hand && S.hand.zoom > 1.05) setZoom(S.hand.zoom); } catch (e) {}
    $('#camTitle').textContent = 'Ahora tu pulgar'; $('#camSub').textContent = 'Paso 1 de 3 · Huella · 3 fotos automáticas';
    $('#scanRow').hidden = false; $('#shotBtn').hidden = false;
    const t = ok ? 'Muy bien. Ahora acerca solo tu pulgar al círculo, a un palmo. Las fotos se toman solas' : 'Acerca tu pulgar al círculo, a un palmo. Las fotos se toman solas';
    say(t, 'ok'); voice(t);
    if (S.fp) { S.fp.t0 = performance.now(); S.fp.holdUntil = performance.now() + 2500; S.fp.shots = []; S.fp.pending = 0; }
    S.mode = 'finger';
  }
  // etapa 2: pulgar y fotos automáticas
  function circleVideo() { const G = geo(), c = circleGuide(G), v = toVideo(G, { x: c.cx - c.r, y: c.cy - c.r, w: 2 * c.r, h: 2 * c.r }); return { x: v.x + v.w / 2, y: v.y + v.h / 2, r: v.w / 2 }; }
  function shotGray(vr) {
    const dim = Math.min(S.perf.slow ? 600 : 720, Math.round(vr.w));
    const { gray } = grab(vr, dim, 'gb');
    let mean = 0; for (const v of gray.data) mean += v; mean /= gray.data.length;
    for (let y = 0; y < gray.h; y++) for (let x = 0; x < gray.w; x++) { const u = x / gray.w - 0.5, v = y / gray.h - 0.5; if (u * u + v * v > 0.25) gray.data[y * gray.w + x] = mean; }
    const rw = Math.min(IS_IOS ? 1100 : 900, Math.round(vr.w)), c = document.createElement('canvas'); c.width = rw; c.height = rw;
    c.getContext('2d').drawImage(video, vr.x, vr.y, vr.w, vr.h, 0, 0, rw, rw);
    return { gray, canvas: c };
  }
  function shotStart(auto) {
    const F = S.fp; if (!F || S.mode !== 'finger' || F.burst) return;
    F.burst = { until: performance.now() + BURST_MS, best: null, auto };
    try { navigator.vibrate && navigator.vibrate(25); } catch (e) {}
  }
  function shotCollect(F, vr, a, ok, now) {
    // ¿qué dedo está en el círculo? (cuando la mano se alcanza a ver de cerca)
    const h = HAND.lm ? handDetect(now, S.perf.slow ? 600 : 350) : null;
    if (h) { const c = circleVideo(), inC = (i) => Math.hypot(h.pts[i].x * video.videoWidth - c.x, h.pts[i].y * video.videoHeight - c.y) < c.r;
      if (inC(4)) F.thumbAt = now; else if ([8, 12, 16, 20].some(inC)) F.otherAt = now; }
    const otro = F.otherAt && now - F.otherAt < 1500 && !(F.thumbAt && F.thumbAt > F.otherAt);
    if (otro) { F.okRun = 0; say('Usa tu pulgar, no otro dedo', 'warn'); F.holdUntil = now + 1500; }
    const B = F.burst;
    if (!B) {
      F.shots = F.shots || []; F.pending = F.pending || 0;
      F.okRun = ok && !otro ? (F.okRun || 0) + 1 : 0;
      const good = F.shots.filter((x) => x.ok).length;
      if (F.okRun >= AUTO_RUN && good + F.pending < NFOTOS && now - (F.lastShotAt || 0) > GAP_MS) shotStart(true);
      return;
    }
    const score = (ok ? 1 : 0.35) * a.cohMean * Math.min(1, a.coverage / 0.6) * (a.motion > 0.07 ? 0.5 : 1);
    if (!B.best || score > B.best.score) { const g = shotGray(vr); B.best = { score, ok, thumb: !!(F.thumbAt && now - F.thumbAt < 2500), ...g }; }
    if (now > B.until && B.best) { F.burst = null; F.lastShotAt = now; F.okRun = 0; shotAnalyze(B.best); }
  }
  function shotProgress(F) {
    const el = $('#simpleProg'); if (!el || !F) return;
    const n = (F.shots || []).filter((x) => x.ok).length;
    const dots = Array.from({ length: NFOTOS }, (_, i) => `<i style="display:inline-block;width:16px;height:16px;border-radius:50%;margin:0 5px;border:2px solid ${i < n ? '#3FD49A' : 'rgba(255,255,255,.5)'};background:${i < n ? '#3FD49A' : 'transparent'}"></i>`).join('');
    const txt = n >= NFOTOS ? 'Listo, comparando…' : F.burst || F.pending ? `Foto ${Math.min(NFOTOS, n + 1)} de ${NFOTOS}…` : n ? `${n} de ${NFOTOS} fotos · mantén el pulgar quieto` : 'Mantén el pulgar quieto en el círculo: la foto se toma sola';
    const html = `<div style="display:grid;justify-items:center;gap:6px"><div>${dots}</div><div class="pl">${txt}</div></div>`;
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  async function shotAnalyze(b) {
    const F = S.fp; F.pending = (F.pending || 0) + 1; uxGood();
    const t0 = performance.now();
    let r; try { r = await call('single', { gray: b.gray, slow: S.perf.slow }); } catch (e) { r = { ok: false, error: e.message }; }
    F.pending--;
    const ms = Math.round(performance.now() - t0), jpeg = b.canvas.toDataURL('image/jpeg', 0.85);
    if (S.raw) { const raw = { i: S.raw.fragments.length, at: new Date().toISOString(), size: b.canvas.width, accepted: !!r.ok, reason: 'foto_auto', ms, P: r.ok ? r.joint.P : null, quality: r.quality, pulgar: b.thumb }; b.canvas.toBlob((bl) => { raw.blob = bl; }, 'image/jpeg', 0.9); S.raw.fragments.push(raw); }
    F.shots.push({ ok: !!r.ok, r, jpeg, thumb: b.thumb, quality: r.quality || 0, ms });
    S.shotLog.push({ P: r.ok ? r.joint.P : null, quality: r.quality || 0 });
    if (!r.ok) { F.fails = (F.fails || 0) + 1; say('Esa foto salió borrosa: acerca un poco el pulgar y quédate quieto', 'warn'); F.holdUntil = performance.now() + 1800;
      if (F.fails >= 4 && !F.shots.some((x) => x.ok)) { S.mode = 'finger-analiza'; showShots(F, null); } return; }
    if (F.shots.filter((x) => x.ok).length >= NFOTOS && S.mode === 'finger') { S.mode = 'finger-analiza'; showShots(F, combine(F)); }
  }
  // combinación igual a la del flujo actual: mejor foto, corregida por cuántas se evaluaron, más un aporte por cada foto que concuerde
  function combine(F) {
    const W = F.shots.filter((x) => x.ok), b = W.reduce((a, x) => (x.r.joint.logit > a.r.joint.logit ? x : a));
    const agree = W.filter((x) => x.r.joint.mirror === b.r.joint.mirror && Math.abs(((x.r.joint.rotationDeg - b.r.joint.rotationDeg + 540) % 360) - 180) <= 30 && x.r.joint.logit >= 3);
    const logit = b.r.joint.logit - Math.log(W.length) + 0.8 * Math.min(5, Math.max(0, agree.length - 1));
    let P = 1 / (1 + Math.exp(-logit));
    if (agree.length < 2) P = Math.min(P, 0.89);   // con menos de 2 fotos concordantes no se confirma
    return { best: b, agree: agree.length, n: W.length, J: { ...b.r.joint, P: +P.toFixed(4), logit: +logit.toFixed(2), fragments: W.length, agree: agree.length },
      pulgar: W.filter((x) => x.thumb).length };
  }
  function showShots(F, C) {
    const sh = $('#sheet'); sh.hidden = false; $('#camBottom').hidden = true; voiceStop();
    const mini = F.shots.map((x) => `<figure style="margin:0;display:grid;gap:3px;justify-items:center"><img src="${x.jpeg}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;opacity:${x.ok ? 1 : 0.45}"><span class="muted small2">${x.ok ? pct(x.r.joint.P) + ' %' : 'borrosa'}</span></figure>`).join('');
    const HC = S.handCheck || {};
    const mano = HC.ok ? `<span class="pill ok">mano ${HC.mano} verificada</span>` : `<span class="pill warn">mano no verificada${HC.motivo ? ' (' + String(HC.motivo).replace(/[<>&"]/g, '') + ')' : ''}</span>`;
    if (!C) {
      sh.innerHTML = `<b style="font-size:18px">No pudimos leer los surcos</b><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${mini}</div>
        <p class="muted" style="font-size:15px">Las fotos salieron con poca nitidez. Acerca la yema hasta ver los surcos grandes y mantén el dedo quieto.</p>
        <button class="btn primary" id="shotAgain" style="width:100%">Intentar de nuevo</button>`;
    } else {
      const J = C.J, V = verdictOf(J);
      S.best = { joint: J, tpl: C.best.r.tpl, match: C.best.r.match, mosaic: C.best.r.mosaic, coverage: J.coverage, foto: C.best.jpeg }; S.attempts = [S.best];
      sh.innerHTML = `<b style="font-size:18px">Resultado de la huella</b>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">${mini}</div>
        <div style="text-align:center"><div style="font:700 36px var(--cond,sans-serif)">${pct(J.P)} %</div><div class="muted small2">probabilidad de que sea la huella de tu cédula</div>
          <div style="margin-top:6px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap"><span class="pill ${V.level}">${V.text}</span>${mano}</div></div>
        <p class="muted small2">${C.agree} de ${C.n} fotos coinciden entre sí · pulgar visto en ${C.pulgar} de ${C.n} · zonas que calzan (mejor) ${J.positive} de ${J.inside}</p>
        <p class="muted small2">Historial de esta prueba: ${S.shotLog.map((x) => (x.P == null ? '—' : pct(x.P) + '%')).join(' · ')}</p>
        <button class="btn primary" id="shotGo" style="width:100%">Continuar con el rostro</button>
        <button class="btn" id="shotAgain" style="width:100%">Repetir la huella</button>`;
      voice(`Probabilidad ${Math.round(J.P * 100)} por ciento. ${V.text}.`);
      $('#shotGo').onclick = () => { sh.hidden = true; $('#camBottom').hidden = false; voiceStop(); S.mode = 'finger-done'; uxFingerOff(); nextStep(); };
    }
    $('#shotAgain').onclick = () => { sh.hidden = true; $('#camBottom').hidden = false; voiceStop(); S.best = null;
      Object.assign(F, { shots: [], pending: 0, fails: 0, okRun: 0, burst: null, t0: performance.now() }); S.mode = 'finger'; };
  }
"""
s = s[:a] + NUEVO + s[b:]
rep("  $('#shotBtn').addEventListener('click', shotStart);", "  $('#shotBtn').addEventListener('click', () => shotStart(false));")
# despacho del bucle
rep("    else if (S.mode === 'finger') tickFinger(G, now);", "    else if (S.mode === 'hand') tickHand(G, now);\n    else if (S.mode === 'finger') tickFinger(G, now);")
# al terminar la introducción: primero la mano
rep("""    await fingerIntro();   // demostración animada (una vez)
    S.mode = 'finger';""", """    await fingerIntro();   // demostración animada (una vez)
    handStart();""")
rep("    if (ONE_SHOT) return 'Bien enfocado: toca «Tomar foto»';", "    if (ONE_SHOT) return 'Bien, quieto… la foto se toma sola';")
# el avance muestra las 3 fotos
rep("""  function uxProgress(F) {
    const el = $('#simpleProg'); if (!el || !F) return;""", """  function uxProgress(F) {
    if (ONE_SHOT) { shotProgress(F); return; }
    const el = $('#simpleProg'); if (!el || !F) return;""")
rep("""      <button class="btn primary" id="shotBtn" hidden style="min-width:58%;font-size:18px">Tomar foto</button>""",
    """      <button class="btn ghost" id="shotBtn" hidden>Tomar foto ahora</button>""")
rep("PRUEBA · HUELLA CON 1 FOTO", "PRUEBA 2 · MANO + 3 FOTOS AUTOMÁTICAS")
rep("<title>PRUEBA 1 foto · ", "<title>PRUEBA 2 · ")
# el botón vuelve a su texto
s = s.replace("$('#shotBtn').textContent = 'Tomar foto';", "$('#shotBtn').textContent = 'Tomar foto ahora';")
open(out, 'w', encoding='utf-8').write(s)
print('variante 2 lista', len(s))
