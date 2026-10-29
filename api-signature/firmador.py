"""
Firmador MatchOnCard: servicio interno (solo red de Docker) que hace la parte criptográfica de los PDF.

  POST /preparar   PDF original + ubicaciones  -> PDF con campos de firma vacíos y SELLO DE CERTIFICACIÓN
                   (DocMDP nivel 2: después solo se permite completar formularios y FIRMAR; cualquier otra
                   edición invalida el sello y queda en evidencia). Si el PDF ya trae firmas de otro sistema,
                   (incluido un registro anterior en MatchOnCard), se conservan y el sello entra como firma de
                   APROBACIÓN en un campo nuevo (la certificación debe ser la primera firma del PDF).
  POST /firmar     PDF actual + campos de un firmante + datos de la estampa -> firma cada campo (incremental,
                   no rompe firmas anteriores). La estampa visible lleva la firma dibujada, nombre, RUT, fecha, el
                   resultado de cada factor, el ID de la validación y un QR a su verificación pública.
  POST /verificar  PDF -> lista de firmas con su validez, cobertura y si hubo modificaciones no permitidas.

Coordenadas de las ubicaciones: puntos PDF (1/72"), página desde 1, origen ARRIBA-izquierda (como en pantalla).
El campo de firma se ensancha a alto x PROPORCION_ESTAMPA (la estampa es horizontal: firma | datos | QR).
"""
import base64
import io
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional
from urllib.parse import urlparse

import segno
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from PIL import Image, ImageDraw, ImageFont
from zoneinfo import ZoneInfo

from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.pdf_utils.images import PdfImage
from pyhanko.pdf_utils.layout import SimpleBoxLayoutRule, AxisAlignment, Margins
from pyhanko.sign import signers, fields, timestamps
from pyhanko.sign.validation import validate_pdf_signature
from pyhanko.sign.validation.settings import KeyUsageConstraints
from pyhanko.sign.diff_analysis import ModificationLevel
from pyhanko.stamp import TextStampStyle
from pyhanko_certvalidator import ValidationContext
from asn1crypto import pem, x509

P12 = os.environ.get('FIRMA_P12_PATH', '/run/secrets/firma.p12')
P12_CLAVE = os.environ.get('FIRMA_P12_CLAVE', '').encode()
CA_PEM = os.environ.get('FIRMA_CA_PATH', '/run/secrets/firma-ca.pem')
TSA_URL = os.environ.get('TSA_URL', '')
FUENTE = os.environ.get('FIRMA_FUENTE', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
ZONA = ZoneInfo(os.environ.get('FIRMA_ZONA', 'America/Santiago'))
MAX_PDF = int(os.environ.get('MAX_PDF_BYTES', str(25 * 1024 * 1024)))
SELLO = 'MatchOnCard-Sello'
PROPORCION_ESTAMPA = 3.6   # ancho mínimo del campo = alto x 3.6 (80 pt de alto -> 288 pt, unos 10 cm)

app = FastAPI(title='MatchOnCard firmador', docs_url=None, redoc_url=None)
_firmante = None


def firmante():
    global _firmante
    if _firmante is None:
        _firmante = signers.SimpleSigner.load_pkcs12(P12, passphrase=P12_CLAVE or None)
        if _firmante is None:
            raise RuntimeError('No se pudo cargar el certificado de firma')
    return _firmante


def tsa():
    return timestamps.HTTPTimeStamper(TSA_URL) if TSA_URL else None


def leer_pdf(b64: str) -> bytes:
    try:
        data = base64.b64decode(b64, validate=True)
    except Exception:
        raise HTTPException(400, 'PDF mal codificado')
    if len(data) > MAX_PDF:
        raise HTTPException(413, 'PDF demasiado grande')
    if not data.startswith(b'%PDF'):
        raise HTTPException(400, 'El archivo no es un PDF')
    return data


class Ubicacion(BaseModel):
    nombre: str = Field(pattern=r'^[A-Za-z0-9_.-]{1,64}$')
    pagina: int = Field(ge=1)
    x: float = Field(ge=0)
    y: float = Field(ge=0)
    ancho: float = Field(ge=40, le=600)
    alto: float = Field(ge=20, le=400)


class Preparar(BaseModel):
    pdf: str
    ubicaciones: List[Ubicacion]
    documento_id: str
    titulo: Optional[str] = None


class Firmar(BaseModel):
    pdf: str
    campos: List[str]
    nombre: str
    rut: str
    validacion_id: str
    evidencia_sha256: str
    estado_validacion: str = 'aprobada'
    firma_png: Optional[str] = None  # firma dibujada (PNG base64)
    documento_id: str
    factores: Optional[Dict[str, Optional[str]]] = None   # huella/rostro/firma -> ok | warn | bad | omitida
    url_verificacion: Optional[str] = Field(None, max_length=300)   # destino del QR


class Verificar(BaseModel):
    pdf: str


def contexto():
    confianza = []
    if os.path.exists(CA_PEM):
        with open(CA_PEM, 'rb') as f:
            for _, _, der in pem.unarmor(f.read(), multiple=True):
                confianza.append(x509.Certificate.load(der))
    return ValidationContext(trust_roots=confianza, allow_fetching=False)


@app.get('/salud')
def salud():
    s = firmante()
    return {'ok': True, 'certificado': s.signing_cert.subject.human_friendly, 'vence': s.signing_cert.not_valid_after.isoformat()}


@app.post('/preparar')
def preparar(req: Preparar):
    data = leer_pdf(req.pdf)
    try:
        r = PdfFileReader(io.BytesIO(data), strict=False)
        if r.encrypted:
            raise HTTPException(400, 'El PDF está protegido con contraseña')
        # Firmas previas (de otro sistema o de un registro anterior en MatchOnCard): se conservan. El sello de MatchOnCard no puede certificar (la certificación
        # debe ser la primera firma del PDF), así que entra como firma de aprobación. Un PDF certificado "sin cambios"
        # (DocMDP nivel 1) no admite nada más: agregar campos o firmas rompería esa certificación.
        previas = r.embedded_signatures
        if any(s.docmdp_level == fields.MDPPerm.NO_CHANGES for s in previas):
            raise HTTPException(400, 'El PDF está certificado sin permitir cambios; no admite más firmas')
        existentes = {f[0] for f in fields.enumerate_sig_fields(r)}
        paginas = int(r.root['/Pages']['/Count'])
        w = IncrementalPdfFileWriter(io.BytesIO(data), strict=False)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f'No se pudo leer el PDF: {e}')
    nombres = set()
    for u in req.ubicaciones:
        if u.pagina > paginas:
            raise HTTPException(400, f'La ubicación {u.nombre} apunta a la página {u.pagina}, pero el documento tiene {paginas}')
        if u.nombre in nombres:
            raise HTTPException(400, f'Ubicación repetida: {u.nombre}')
        if u.nombre in existentes:
            raise HTTPException(400, f'El PDF ya tiene un campo de firma llamado {u.nombre}')
        nombres.add(u.nombre)
        mb = [float(v) for v in _pagina(r, u.pagina - 1)['/MediaBox']]
        alto_pag = mb[3] - mb[1]
        x1 = mb[0] + u.x
        y2 = mb[1] + alto_pag - u.y
        y1 = y2 - u.alto
        if x1 + u.ancho > mb[2] + 1 or y1 < mb[1] - 1:
            raise HTTPException(400, f'La ubicación {u.nombre} se sale de la página {u.pagina}')
        # la estampa es horizontal (firma | datos | QR): el campo se ensancha hacia la derecha hasta esa proporción,
        # y si no cabe en la página se corre a la izquierda (nunca más ancho que la página)
        ancho = min(max(u.ancho, u.alto * PROPORCION_ESTAMPA), mb[2] - mb[0])
        if x1 + ancho > mb[2]:
            x1 = mb[2] - ancho
        fields.append_signature_field(w, fields.SigFieldSpec(sig_field_name=u.nombre, on_page=u.pagina - 1, box=(x1, y1, x1 + ancho, y2)))
    certifica = not previas
    # si el PDF ya pasó por MatchOnCard trae su propio sello: el nuevo va en otro campo (MatchOnCard-Sello-2, -3…)
    campo_sello, n = SELLO, 1
    while campo_sello in existentes:
        n += 1
        campo_sello = f'{SELLO}-{n}'
    meta = signers.PdfSignatureMetadata(
        field_name=campo_sello,
        certify=certifica,
        docmdp_permissions=fields.MDPPerm.FILL_FORMS,  # nivel 2: solo completar formularios y firmar (solo aplica si certifica)
        reason='Documento registrado en MatchOnCard. Solo admite firmas electrónicas de los firmantes designados.' if certifica
        else 'Documento registrado en MatchOnCard. Conserva las firmas que traía y agrega las de los firmantes designados.',
        location='matchoncard.cl',
        name='MatchOnCard',
        subfilter=fields.SigSeedSubFilter.PADES,
    )
    out = io.BytesIO()
    signers.PdfSigner(meta, signer=firmante(), timestamper=tsa()).sign_pdf(w, output=out)
    pdf = out.getvalue()
    return {'pdf': base64.b64encode(pdf).decode(), 'paginas': paginas, 'certificado': certifica, 'firmas_previas': len(previas)}


def _pagina(r, idx):
    # recorre el árbol de páginas para obtener la página idx (0-based) con herencia de MediaBox
    pages = r.root['/Pages']
    def walk(node, inherited):
        mb = node.get('/MediaBox', inherited)
        if node.get('/Type') == '/Pages':
            for kid in node['/Kids']:
                yield from walk(kid.get_object(), mb)
        else:
            yield node, mb
    for i, (p, mb) in enumerate(walk(pages, None)):
        if i == idx:
            d = dict(p); d['/MediaBox'] = mb
            return d
    raise HTTPException(400, 'Página inexistente')


def _tinta(png_b64):
    """La firma del teléfono es trazo claro sobre fondo oscuro: se pasa a tinta azul sobre transparente."""
    try:
        im = Image.open(io.BytesIO(base64.b64decode(png_b64))).convert('RGBA')
    except Exception:
        return None
    px = im.load(); w, h = im.size
    limpio = Image.new('RGBA', (w, h), (255, 255, 255, 0)); q = limpio.load()
    for yy in range(h):
        for xx in range(w):
            r_, g_, b_, a_ = px[xx, yy]
            lum = (r_ + g_ + b_) / 3
            if a_ > 0 and lum > 140:
                q[xx, yy] = (20, 52, 130, int(min(255, (lum - 140) * 2.4)))
    bbox = limpio.getbbox()
    return limpio.crop(bbox) if bbox else None


# Fuentes de la estampa: normal (FIRMA_FUENTE), negrita y monoespaciada en la misma carpeta (DejaVu en Docker, Arial/Consolas en Windows)
_VARIANTES = {'negrita': ['DejaVuSans-Bold.ttf', 'arialbd.ttf', 'segoeuib.ttf'], 'mono': ['DejaVuSansMono.ttf', 'consola.ttf']}
_fuentes = {}


def _fuente(tam, tipo='normal'):
    clave = (tipo, tam)
    if clave not in _fuentes:
        rutas = [os.environ.get(f'FIRMA_FUENTE_{tipo.upper()}', '')] + [os.path.join(os.path.dirname(FUENTE), n) for n in _VARIANTES.get(tipo, [])] + [FUENTE]
        for ruta in rutas:
            try:
                _fuentes[clave] = ImageFont.truetype(ruta, tam)
                break
            except Exception:
                continue
    return _fuentes[clave]


COL = {
    'borde': (46, 143, 181), 'fondo': (238, 245, 249), 'linea': (196, 212, 221), 'tinta': (20, 52, 130),
    'ink': (20, 32, 42), 'ink2': (74, 90, 102), 'ink3': (128, 143, 153), 'acento': (46, 143, 181), 'qr': (20, 32, 42),
}
# nivel del factor -> (texto e ícono, fondo, borde)
CHIP = {'ok': ((19, 128, 90), (226, 244, 233), (186, 224, 202)), 'warn': ((168, 106, 0), (251, 236, 212), (238, 211, 165)),
        'bad': ((178, 58, 42), (248, 225, 221), (234, 188, 180))}
ISOTIPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'matchoncard-isotipo.png')
_isotipo = None


def _logo(px):
    global _isotipo
    if _isotipo is None:
        _isotipo = Image.open(ISOTIPO).convert('RGBA')
    return _isotipo.resize((px, px), Image.LANCZOS)


def _qr(url, px):
    """QR con zona de silencio blanca, módulos de tamaño entero (nítidos al imprimir)."""
    q = segno.make(url, error='l', micro=False)   # sube solo el nivel de corrección si cabe en la misma versión
    m = [list(f) for f in q.matrix_iter(scale=1, border=2)]
    n = len(m); mod = max(1, px // n)
    im = Image.new('RGBA', (px, px), (255, 255, 255, 255))
    d = ImageDraw.Draw(im); o = (px - n * mod) // 2
    for yy, fila in enumerate(m):
        for xx, v in enumerate(fila):
            if v:
                d.rectangle([o + xx * mod, o + yy * mod, o + (xx + 1) * mod - 1, o + (yy + 1) * mod - 1], fill=COL['qr'] + (255,))
    return im


def _nivel(f):
    if f is None:
        return None
    return 'warn' if f == 'omitida' else f if f in CHIP else None


# Una fila es una lista de piezas: ('logo',) | ('txt', texto, tipo_fuente, color) | ('chip', texto, nivel). Tamaño base en puntos.
def _ancho_pieza(d, p, t):
    if p[0] == 'logo':
        return t * 1.25 + t * 0.4
    if p[0] == 'txt':
        return d.textlength(p[1], font=_fuente(max(1, int(t)), p[2]))
    return t * 0.55 * 2 + t * 0.8 + t * 0.3 + d.textlength(p[1], font=_fuente(max(1, int(t)), 'normal'))


def _ancho_fila(d, fila, t):
    _, tam, piezas, sep = fila
    return sum(_ancho_pieza(d, p, t) for p in piezas) + sep * t * max(0, len(piezas) - 1)


def _alto_fila(fila, t):
    return t * (1.7 if any(p[0] == 'chip' for p in fila[2]) else 1.22)


def _dibujar_fila(lienzo, d, fila, t, x, y):
    _, _, piezas, sep = fila
    h = _alto_fila(fila, t); cy = y + h / 2
    for p in piezas:
        if p[0] == 'logo':
            s = int(t * 1.25); lienzo.alpha_composite(_logo(s), (int(x), int(cy - s / 2))); x += s + t * 0.4
        elif p[0] == 'txt':
            d.text((x, cy), p[1], font=_fuente(max(1, int(t)), p[2]), fill=p[3] + (255,), anchor='lm'); x += _ancho_pieza(d, p, t)
        else:
            tinta, fondo, borde = CHIP[p[2]]
            w = _ancho_pieza(d, p, t); ch = t * 1.45
            d.rounded_rectangle([x, cy - ch / 2, x + w, cy + ch / 2], radius=ch / 2, fill=fondo + (255,), outline=borde + (255,), width=max(1, int(t * 0.08)))
            ix, s, lw = x + t * 0.55, t * 0.8, max(1, int(t * 0.14))
            if p[2] == 'ok':
                d.line([(ix, cy), (ix + s * 0.35, cy + s * 0.32), (ix + s, cy - s * 0.38)], fill=tinta + (255,), width=lw, joint='curve')
            elif p[2] == 'warn':
                d.line([(ix + s * 0.1, cy), (ix + s * 0.9, cy)], fill=tinta + (255,), width=lw)
            else:
                d.line([(ix + s * 0.15, cy - s * 0.35), (ix + s * 0.85, cy + s * 0.35)], fill=tinta + (255,), width=lw)
                d.line([(ix + s * 0.15, cy + s * 0.35), (ix + s * 0.85, cy - s * 0.35)], fill=tinta + (255,), width=lw)
            d.text((ix + s + t * 0.3, cy), p[1], font=_fuente(max(1, int(t)), 'normal'), fill=tinta + (255,), anchor='lm')
            x += w
        x += sep * t


def _bloque_texto(lienzo, d, filas, zona):
    """Escala todas las filas juntas para que quepan en la zona; la fila del nombre puede achicarse sola."""
    zx, zy, zw, zh = zona[0], zona[1], zona[2] - zona[0], zona[3] - zona[1]
    def medir(s):
        tams = []
        for f in filas:
            t = f[1] * s
            if f[0] == 'nombre':   # nombres largos: se achica solo esta fila (hasta 60 %)
                while _ancho_fila(d, f, t) > zw and t > f[1] * s * 0.6:
                    t *= 0.96
            tams.append(t)
        alto = sum(_alto_fila(f, t) for f, t in zip(filas, tams)) + sum(tams) * 0.12
        cabe = alto <= zh and all(_ancho_fila(d, f, t) <= zw or f[0] == 'nombre' for f, t in zip(filas, tams))
        return cabe, tams, alto
    s = 4.0
    while s > 0.5:
        cabe, tams, alto = medir(s)
        if cabe:
            break
        s *= 0.97
    y = zy + (zh - alto) / 2
    for f, t in zip(filas, tams):
        if f[0] == 'nombre':   # último recurso: recorta el nombre
            p = f[2][0]; txt = p[1]
            while _ancho_fila(d, (f[0], f[1], [(p[0], txt, p[2], p[3])], 0), t) > zw and len(txt) > 4:
                txt = txt[:-2] + '…'
            f = (f[0], f[1], [(p[0], txt, p[2], p[3])], f[3])
        _dibujar_fila(lienzo, d, f, t, zx, y)
        y += _alto_fila(f, t) + t * 0.12


def _estampa(req: Firmar, ancho_pt: float, alto_pt: float) -> TextStampStyle:
    """Dibuja la estampa como imagen (8 px por punto) con las proporciones exactas del campo: firma | datos | QR.
    /preparar ya ensancha los campos a PROPORCION_ESTAMPA; uno más angosto (preparado antes) achica el contenido."""
    k = 8
    W, H = max(40, int(ancho_pt * k)), max(20, int(alto_pt * k))
    lienzo = Image.new('RGBA', (W, H), (255, 255, 255, 0))
    d = ImageDraw.Draw(lienzo)
    pad, bw = H * 0.05, max(1, int(0.9 * k))
    d.rounded_rectangle([bw / 2, bw / 2, W - 1 - bw / 2, H - 1 - bw / 2], radius=H * 0.0625, fill=COL['fondo'] + (255,), outline=COL['borde'] + (255,), width=bw)

    # QR (a la verificación pública) a la derecha, centrado en el alto
    q = int(min(H - 2 * pad, W * 0.3))
    qx, qy = int(W - pad - q), int((H - q) / 2)
    if req.url_verificacion:
        lienzo.alpha_composite(_qr(req.url_verificacion, q), (qx, qy))
    resto = qx - pad * 0.9 if req.url_verificacion else W - pad

    corte = pad + (resto - pad) * 0.34
    zona_firma = (pad, H * 0.26, corte - pad * 0.8, H * 0.8)
    d.line([(corte, pad * 1.4), (corte, H - pad * 1.4)], fill=COL['linea'] + (255,), width=max(1, int(0.5 * k)))
    zona_texto = (corte + pad * 1.1, pad, resto, H - pad)

    # firma dibujada, con una línea base debajo
    zf_w, zf_h = zona_firma[2] - zona_firma[0], zona_firma[3] - zona_firma[1]
    base_y = zona_firma[3] - zf_h * 0.08
    d.line([(zona_firma[0] + zf_w * 0.04, base_y), (zona_firma[2] - zf_w * 0.04, base_y)], fill=COL['tinta'] + (90,), width=max(1, int(0.45 * k)))
    tinta = _tinta(req.firma_png) if req.firma_png else None
    if tinta is not None:
        aw, ah = zf_w * 0.94, zf_h * 0.86
        esc = min(aw / tinta.width, ah / tinta.height)
        t = tinta.resize((max(1, int(tinta.width * esc)), max(1, int(tinta.height * esc))), Image.LANCZOS)
        lienzo.alpha_composite(t, (int(zona_firma[0] + (zf_w - t.width) / 2), int(base_y - t.height + zf_h * 0.04)))

    fecha = datetime.now(timezone.utc).astimezone(ZONA).strftime('%d-%m-%Y %H:%M')
    host = urlparse(req.url_verificacion).netloc if req.url_verificacion else 'matchoncard.cl'
    obs = req.estado_validacion == 'revision'
    marca = [('logo',), ('txt', 'Match', 'negrita', COL['ink']), ('txt', 'On', 'negrita', COL['acento']), ('txt', 'Card', 'negrita', COL['ink'])]
    marca_fila = ('marca', 6.2, marca, 0)
    if obs:
        marca_fila = ('marca', 6.2, marca + [('txt', '  ·  Con observaciones', 'negrita', CHIP['warn'][0])], 0)
    factores = req.factores or {}
    chips = [('chip', etq, _nivel(factores.get(c))) for c, etq in (('huella', 'Huella'), ('rostro', 'Rostro'), ('firma', 'Firma'))]
    chips = [c for c in chips if c[2]]
    filas = [
        marca_fila,
        ('nombre', 9.0, [('txt', req.nombre, 'negrita', COL['ink'])], 0),
        ('meta', 5.6, [('txt', f'RUT {req.rut}  ·  {fecha} hrs.', 'normal', COL['ink2'])], 0),
    ]
    if chips:
        filas.append(('chips', 5.4, chips, 0.35))
    filas.append(('id', 4.4, [('txt', f'ID {req.validacion_id[:8]} · {host}/verificar', 'mono', COL['ink3'])], 0))
    if obs and _ancho_fila(d, marca_fila, 6.2 * k * 0.75) > zona_texto[2] - zona_texto[0]:
        # en recuadros angostos "Con observaciones" va en su propia línea
        filas[0] = ('marca', 6.2, marca, 0)
        filas.insert(1, ('obs', 5.0, [('txt', 'Con observaciones', 'negrita', CHIP['warn'][0])], 0))
    filas = [(f[0], f[1] * k, f[2], f[3]) for f in filas]
    _bloque_texto(lienzo, d, filas, zona_texto)

    return TextStampStyle(
        stamp_text='',
        background=PdfImage(lienzo),
        background_opacity=1,
        background_layout=SimpleBoxLayoutRule(x_align=AxisAlignment.ALIGN_MID, y_align=AxisAlignment.ALIGN_MID, margins=Margins(0, 0, 0, 0)),
        border_width=0,
    )


def _caja(r, campo):
    for nombre, _, ref in fields.enumerate_sig_fields(r):
        if nombre == campo:
            obj = ref.get_object()
            rect = obj.get('/Rect') or obj['/Kids'][0].get_object()['/Rect']
            x1, y1, x2, y2 = [float(v) for v in rect]
            return abs(x2 - x1), abs(y2 - y1)
    return 200.0, 70.0


@app.post('/firmar')
def firmar(req: Firmar):
    data = leer_pdf(req.pdf)
    r = PdfFileReader(io.BytesIO(data), strict=False)
    existentes = {f[0] for f in fields.enumerate_sig_fields(r, filled_status=False)}
    faltan = [c for c in req.campos if c not in existentes]
    if faltan:
        raise HTTPException(400, f'Campos de firma inexistentes o ya firmados: {", ".join(faltan)}')
    for campo in req.campos:
        estilo = _estampa(req, *_caja(PdfFileReader(io.BytesIO(data), strict=False), campo))
        w = IncrementalPdfFileWriter(io.BytesIO(data), strict=False)
        meta = signers.PdfSignatureMetadata(
            field_name=campo,
            reason=f'Firma electrónica simple con validación biométrica MatchOnCard ({req.validacion_id}). Evidencia SHA-256 {req.evidencia_sha256}',
            location='matchoncard.cl',
            name=f'{req.nombre} (RUT {req.rut})',
            subfilter=fields.SigSeedSubFilter.PADES,
        )
        out = io.BytesIO()
        signers.PdfSigner(meta, signer=firmante(), timestamper=tsa(), stamp_style=estilo).sign_pdf(w, output=out)
        data = out.getvalue()
    return {'pdf': base64.b64encode(data).decode()}


@app.post('/verificar')
def verificar(req: Verificar):
    data = leer_pdf(req.pdf)
    r = PdfFileReader(io.BytesIO(data), strict=False)
    ctx = contexto()
    res = []
    firmas = r.embedded_signatures
    # el sello vigente es el último (un PDF registrado de nuevo trae los sellos anteriores); las firmas anteriores
    # a él ya estaban en el PDF al registrarlo, sean de otro sistema o de un registro anterior en MatchOnCard
    sellos = [i for i, s in enumerate(firmas) if s.field_name.startswith(SELLO)]
    i_sello = sellos[-1] if sellos else None
    for i, s in enumerate(firmas):
        try:
            st = validate_pdf_signature(s, ctx, key_usage_settings=KeyUsageConstraints(key_usage={'non_repudiation'}, extd_key_usage=None, explicit_extd_key_usage_required=False))
            mod = st.modification_level
            res.append({
                'campo': s.field_name,
                'nombre': str(s.sig_object.get('/Name', '')),
                'motivo': str(s.sig_object.get('/Reason', '')),
                'fecha': st.signer_reported_dt.isoformat() if st.signer_reported_dt else None,
                'integra': bool(st.intact and st.valid),
                'confiable': bool(st.trusted),
                'certificacion': s.sig_object.get('/Reference') is not None and any(str(x.get('/TransformMethod')) == '/DocMDP' for x in s.sig_object.get('/Reference', [])),
                'sello': i == i_sello,
                'previa': i_sello is not None and i < i_sello,
                'cobertura': st.coverage.name if st.coverage else None,
                'modificaciones': mod.name if mod is not None else None,
                'modificaciones_permitidas': mod is None or mod.value <= ModificationLevel.FORM_FILLING.value,
                'docmdp_ok': st.docmdp_ok,
                'certificado': s.signer_cert.subject.human_friendly,
            })
        except Exception as e:
            res.append({'campo': s.field_name, 'error': str(e), 'integra': False, 'sello': i == i_sello, 'previa': i_sello is not None and i < i_sello})
    vacios = [f[0] for f in fields.enumerate_sig_fields(r, filled_status=False)]
    return {'firmas': res, 'campos_pendientes': vacios, 'sha256': __import__('hashlib').sha256(data).hexdigest()}
