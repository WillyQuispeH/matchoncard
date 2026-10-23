# Construye la VARIANTE DE PRUEBA "huella con una sola foto" a partir de la app de producción, sin modificarla.
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    c = s.count(a); assert c == n, (c, a[:100]); s = s.replace(a, b)

# 1) worker: analizar UNA foto contra la cédula (mismas funciones del motor que usa el flujo actual para cada fotograma amplio)
rep("""      if (type === 'frameAdd') {""", """      if (type === 'single') {
        let t = null; try { t = E.analyze(p.gray, { mirror: true, invert: true, maskCoh: 0.22, maskStd: 0.05, maskPer: 0.2 }); } catch (e) {}
        if (!t || t.quality < 40 || t.minutiae.length < 8) return { ok: false, quality: t ? t.quality : 0, minutiae: t ? t.minutiae.length : 0 };
        const J = E.jointVerify(card, [{ tpl: t, T: IDT }], p.slow ? FRAME_OPT_SLOW : FRAME_OPT);
        const outlines = [];
        try { const tiles = E.tileFragments([{ tpl: t, T: IDT }], FRAME_OPT.tile);
          J.per.forEach((q, j) => { if (!q || !q.T || !tiles[j]) return; const tl = tiles[j].tpl, c = [[0, 0], [tl.w, 0], [tl.w, tl.h], [0, tl.h]];
            outlines.push({ llr: q.llr, pts: c.map(([x, y]) => [q.T.c * x - q.T.sn * y + q.T.tx, q.T.sn * x + q.T.c * y + q.T.ty]) }); }); } catch (e) {}
        let ref = null; try { ref = E.match(card, t, { trials: 4 }); } catch (e) {}
        const enh = t.images.enh, mk = t.images.mask, md = new Float32Array(enh.data.length);
        for (let i = 0; i < md.length; i++) md[i] = mk[i] ? enh.data[i] : 0.5;
        return { ok: true, quality: t.quality, minutiae: t.minutiae.length,
          joint: { P: J.P, logit: J.logit, evidence: J.evidence, mirror: J.mirror, polarity: J.polarity, rotationDeg: J.rotationDeg, positive: J.positive, inside: J.inside,
            coverage: J.coverage, covGrid: J.covGrid, fragments: 1, agree: J.P >= 0.5 ? 1 : 0, method: 'foto', outlines, alternatives: J.alternatives,
            per: (J.per || []).map((q) => ({ llr: q && q.llr, outside: q && q.outside, feat: q && q.feat })) },
          tpl: t, match: ref, mosaic: { w: t.w, h: t.h, data: md } };
      }
      if (type === 'frameAdd') {""")
# 2) veredicto: una foto se juzga por las zonas evaluadas (no por cantidad de fotogramas)
rep("if (!J || (J.method === 'bloque' ? J.inside < 4 : J.fragments < 3)) return { text: 'Muestra insuficiente', level: 'warn' };",
    "if (!J || ((J.method === 'bloque' || J.method === 'foto') ? J.inside < 4 : J.fragments < 3)) return { text: 'Muestra insuficiente', level: 'warn' };")
# 3) botón y distintivo de versión de prueba
rep("""      <button class="btn ghost" id="skipFinger" hidden>No puedo escanear mi huella</button>""",
"""      <button class="btn ghost" id="skipFinger" hidden>No puedo escanear mi huella</button>
      <button class="btn primary" id="shotBtn" hidden style="min-width:58%;font-size:18px">Tomar foto</button>""")
rep("<body>", """<body>
<div id="pruebaBadge" style="position:fixed;top:96px;left:50%;transform:translateX(-50%);z-index:99;white-space:nowrap;background:#F1B84B;color:#08161D;font:700 11px/1 sans-serif;padding:5px 10px;border-radius:999px;letter-spacing:.04em;pointer-events:none">PRUEBA · HUELLA CON 1 FOTO</div>""", 1)
# 4) sin captura automática de fragmentos: se junta una ráfaga corta al tocar el botón y se queda la más nítida
rep("""        if (ok && !F.busy && now - F.lastCap > SCAN.minGap) captureFragment(vr);""",
"""        if (ONE_SHOT) shotCollect(F, vr, a, ok, now); else if (ok && !F.busy && now - F.lastCap > SCAN.minGap) captureFragment(vr);""")
rep("""        if ((now - F.t0) / 1000 > SCAN.timeout && !F.busy) fingerTimeUp(F, now);""",
"""        if (!ONE_SHOT && (now - F.t0) / 1000 > SCAN.timeout && !F.busy) fingerTimeUp(F, now);""")
rep("""    $('#camTitle').textContent = 'Escanea tu pulgar'; $('#camSub').textContent = 'Paso 1 de 3 · Huella · recorre la yema con la cámara';""",
"""    $('#camTitle').textContent = 'Foto de tu pulgar'; $('#camSub').textContent = 'Paso 1 de 3 · Huella · una sola foto';""")
rep("""    $('#scanRow').hidden = false; $('#finishScan').hidden = false; $('#manual').hidden = true; S.fp.joint = null;""",
"""    $('#scanRow').hidden = false; $('#finishScan').hidden = true; $('#shotBtn').hidden = false; $('#shotBtn').disabled = false; $('#manual').hidden = true; S.fp.joint = null;""")
rep("""    if (!J) return 'Mantén la yema del pulgar dentro del círculo, quieta y enfocada';""",
"""    if (ONE_SHOT) return 'Bien enfocado: toca «Tomar foto»';
    if (!J) return 'Mantén la yema del pulgar dentro del círculo, quieta y enfocada';""")
rep("""  function duoReset() {
    const el = $('#duo'); if (!el) return; el.hidden = false;""","""  function duoReset() {
    const el = $('#duo'); if (!el) return; el.hidden = ONE_SHOT;""")
rep("""  function uxFingerOff() {""","""  // ══════════ VARIANTE DE PRUEBA: huella con una sola foto ══════════
  const ONE_SHOT = true;
  S.shotLog = [];
  function shotGray(vr) {
    const dim = Math.min(S.perf.slow ? 600 : 720, Math.round(vr.w));
    const { gray } = grab(vr, dim, 'gb');
    let mean = 0; for (const v of gray.data) mean += v; mean /= gray.data.length;
    for (let y = 0; y < gray.h; y++) for (let x = 0; x < gray.w; x++) { const u = x / gray.w - 0.5, v = y / gray.h - 0.5; if (u * u + v * v > 0.25) gray.data[y * gray.w + x] = mean; }
    const rw = Math.min(IS_IOS ? 1100 : 900, Math.round(vr.w)), c = document.createElement('canvas'); c.width = rw; c.height = rw;
    c.getContext('2d').drawImage(video, vr.x, vr.y, vr.w, vr.h, 0, 0, rw, rw);
    return { gray, canvas: c };
  }
  function shotStart() {
    const F = S.fp; if (!F || S.mode !== 'finger' || F.burst) return;
    F.burst = { until: performance.now() + 1200, best: null, n: 0 }; $('#shotBtn').disabled = true; $('#shotBtn').textContent = 'Quieto…';
    say('Quieto… tomando la foto', 'ok'); try { navigator.vibrate && navigator.vibrate(30); } catch (e) {}
  }
  // durante 1,2 s se evalúa cada cuadro (nitidez, cobertura, movimiento) y se conserva solo el mejor: para la persona es UNA foto
  function shotCollect(F, vr, a, ok, now) {
    const B = F.burst; if (!B) return;
    const score = (ok ? 1 : 0.35) * a.cohMean * Math.min(1, a.coverage / 0.6) * (a.motion > 0.07 ? 0.5 : 1);
    B.n++;
    if (!B.best || score > B.best.score) { const g = shotGray(vr); B.best = { score, ok, cohMean: a.cohMean, coverage: a.coverage, ...g }; }
    if (now > B.until && B.best) { F.burst = null; shotAnalyze(B.best); }
  }
  async function shotAnalyze(b) {
    S.mode = 'finger-analiza'; say('Analizando la foto…', 'ok'); uxGood();
    const F = S.fp, t0 = performance.now();
    let r; try { r = await call('single', { gray: b.gray, slow: S.perf.slow }); } catch (e) { r = { ok: false, error: e.message }; }
    const ms = Math.round(performance.now() - t0);
    const jpeg = b.canvas.toDataURL('image/jpeg', 0.85);
    if (S.raw) { const raw = { i: S.raw.fragments.length, at: new Date().toISOString(), size: b.canvas.width, accepted: !!r.ok, reason: 'foto_unica', ms, P: r.ok ? r.joint.P : null, quality: r.quality }; b.canvas.toBlob((bl) => { raw.blob = bl; }, 'image/jpeg', 0.9); S.raw.fragments.push(raw); }
    S.shotLog.push({ P: r.ok ? r.joint.P : null, quality: r.quality || 0, ms });
    const hist = S.shotLog.map((x, i) => `${i + 1}: ${x.P == null ? 'sin surcos' : pct(x.P) + ' %'}`).join(' · ');
    const sh = $('#sheet'); sh.hidden = false; $('#camBottom').hidden = true;
    if (!r.ok) {
      sh.innerHTML = `<b style="font-size:18px">No pudimos leer los surcos</b>
        <img src="${jpeg}" alt="Foto tomada" style="width:46%;justify-self:center;border-radius:50%;aspect-ratio:1;object-fit:cover">
        <p class="muted" style="font-size:15px">La foto salió con poca nitidez (calidad ${r.quality || 0}/100${r.minutiae != null ? `, ${r.minutiae} puntos clave` : ''}). Acerca la yema hasta ver los surcos grandes y mantén el dedo quieto.</p>
        <p class="muted small2">Fotos de esta prueba: ${hist}</p>
        <button class="btn primary" id="shotAgain" style="width:100%">Tomar otra foto</button>`;
      voice('No pudimos leer los surcos. Toma otra foto, más cerca y quieto.');
    } else {
      const J = r.joint, V = verdictOf(J);
      S.best = { joint: J, tpl: r.tpl, match: r.match, mosaic: r.mosaic, coverage: J.coverage, foto: jpeg }; S.attempts = [S.best];
      sh.innerHTML = `<b style="font-size:18px">Resultado de la foto</b>
        <div style="display:grid;grid-template-columns:96px 1fr;gap:14px;align-items:center">
          <img src="${jpeg}" alt="Foto tomada" style="width:96px;height:96px;border-radius:50%;object-fit:cover">
          <div><div style="font:700 34px var(--cond,sans-serif)">${pct(J.P)} %</div><div class="muted small2">probabilidad de que sea la huella de tu cédula</div>
          <span class="pill ${V.level}">${V.text}</span></div></div>
        <p class="muted small2">Zonas que calzan: ${J.positive} de ${J.inside} · cobertura de la cédula ${Math.round((J.coverage || 0) * 100)} % · calidad de la foto ${r.quality}/100 · análisis ${(ms / 1000).toFixed(1)} s</p>
        <p class="muted small2">Fotos de esta prueba: ${hist}</p>
        <button class="btn primary" id="shotGo" style="width:100%">Continuar con el rostro</button>
        <button class="btn" id="shotAgain" style="width:100%">Tomar otra foto</button>`;
      voice(`Probabilidad ${Math.round(J.P * 100)} por ciento. ${V.text}.`);
      $('#shotGo').onclick = () => { sh.hidden = true; $('#camBottom').hidden = false; voiceStop(); S.mode = 'finger-done'; uxFingerOff(); nextStep(); };
    }
    $('#shotAgain').onclick = () => { sh.hidden = true; $('#camBottom').hidden = false; voiceStop(); S.best = null;
      $('#shotBtn').disabled = false; $('#shotBtn').textContent = 'Tomar foto'; if (S.fp) S.fp.t0 = performance.now(); S.mode = 'finger'; };
  }
  $('#shotBtn').addEventListener('click', shotStart);

  function uxFingerOff() { if ($('#shotBtn')) { $('#shotBtn').hidden = true; $('#shotBtn').disabled = false; $('#shotBtn').textContent = 'Tomar foto'; }""")
rep("""<title>""", """<title>PRUEBA 1 foto · """, 1)
rep("  $('#shotBtn').addEventListener('click', shotStart);", "  $('#shotBtn').addEventListener('click', shotStart);\n  if (CFG.debug) window.__call = call;")
open(out, 'w', encoding='utf-8').write(s)
print('variante lista', len(s))
