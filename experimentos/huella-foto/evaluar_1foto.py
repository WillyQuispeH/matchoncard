# Evalúa la variante de 1 foto: cada foto de pulgar contra cada cédula (misma persona vs. otra persona).
# Necesita una carpeta WWW con foto.html (variante con COTEJO_CONFIG.debug) y ev/<sesion>/{cedula/acercamiento_1.jpg,pulgar/*.jpg}.
# Las evidencias son DATOS BIOMÉTRICOS: no se suben al repositorio. Etiqueta cada sesión con su persona en PERSONA.
import asyncio, subprocess, time, json, os, glob
from playwright.async_api import async_playwright
WWW = os.environ.get('WWW', './www')
srv = subprocess.Popen(['python3','-m','http.server','8765','-d',WWW],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
PERSONA = json.loads(os.environ.get('PERSONA', '{}'))   # ej. {"sesion1":"A","sesion2":"A","sesion3":"B"}
fotos = {}
for s in PERSONA:
    fs = sorted(os.listdir(f'{WWW}/ev/{s}/pulgar'))
    k = max(1, len(fs) // 8); fotos[s] = fs[::k][:8]
JS = """async ({card, items}) => {
  const C = window.__call, out = [];
  const load = (u) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
  const gray = (im, W, H, ch, circle) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(im, 0, 0, W, H);
    const px = g.getImageData(0, 0, W, H).data, d = new Float32Array(W * H);
    for (let i = 0, j = 0; i < W * H; i++, j += 4) d[i] = ch === 'gb' ? (0.6 * px[j + 1] + 0.4 * px[j + 2]) / 255 : (0.299 * px[j] + 0.587 * px[j + 1] + 0.114 * px[j + 2]) / 255;
    if (circle) { let m = 0; for (const v of d) m += v; m /= d.length; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const u = x / W - 0.5, v = y / H - 0.5; if (u * u + v * v > 0.25) d[y * W + x] = m; } }
    return { w: W, h: H, data: d }; };
  const ci = await load(card); const s = Math.min(1, 2600 / Math.max(ci.naturalWidth, ci.naturalHeight));
  const cr = await C('card', { gray: gray(ci, Math.round(ci.naturalWidth * s), Math.round(ci.naturalHeight * s), 'lum', false) });
  await C('setCard', { tpl: cr.tpl });
  for (const it of items) { const im = await load(it.u); const t0 = performance.now();
    const r = await C('single', { gray: gray(im, 720, 720, 'gb', true) });
    out.push({ s: it.s, f: it.f, ok: r.ok, P: r.ok ? r.joint.P : null, q: r.quality, ins: r.ok ? r.joint.inside : null, pos: r.ok ? r.joint.positive : null, ms: Math.round(performance.now() - t0) }); }
  return { cardQ: cr.tpl.quality, cardMin: cr.tpl.minutiae.length, out };
}"""
async def main():
    res = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.add_init_script("window.COTEJO_CONFIG={debug:true}")
        await pg.goto('http://localhost:8765/foto.html'); await pg.wait_for_timeout(1500)
        items = [{'s': s, 'f': f, 'u': f'/ev/{s}/pulgar/{f}'} for s in fotos for f in fotos[s]]
        for c in PERSONA:
            t0 = time.time()
            r = await pg.evaluate(JS, {'card': f'/ev/{c}/cedula/acercamiento_1.jpg', 'items': items})
            for o in r['out']: o['card'] = c; o['gen'] = PERSONA[o['s']] == PERSONA[c]
            res += r['out']; print(c, PERSONA[c], 'cédula calidad', r['cardQ'], 'puntos', r['cardMin'], f'{time.time()-t0:.0f}s', flush=True)
        await b.close()
    json.dump(res, open(os.environ.get('SALIDA', 'eval1foto.json'), 'w'))
asyncio.run(main()); srv.terminate()
