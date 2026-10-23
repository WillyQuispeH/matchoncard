"""
Firmador MatchOnCard: servicio interno (solo red de Docker) que hace la parte criptográfica de los PDF.

  POST /preparar   PDF original + ubicaciones  -> PDF con campos de firma vacíos y SELLO DE CERTIFICACIÓN
                   (DocMDP nivel 2: después solo se permite completar formularios y FIRMAR; cualquier otra
                   edición invalida el sello y queda en evidencia)
  POST /firmar     PDF actual + campos de un firmante + datos de la estampa -> firma cada campo (incremental,
                   no rompe firmas anteriores). La estampa visible lleva la firma dibujada, nombre, RUT, fecha,
                   folio de validación y hash de la evidencia.
  POST /verificar  PDF -> lista de firmas con su validez, cobertura y si hubo modificaciones no permitidas.

Coordenadas de las ubicaciones: puntos PDF (1/72"), página desde 1, origen ARRIBA-izquierda (como en pantalla).
"""
import base64
import io
import os
from datetime import datetime, timezone
from typing import List, Optional

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
        if r.embedded_signatures:
            raise HTTPException(400, 'El PDF ya contiene firmas; envía el documento original sin firmar')
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
        nombres.add(u.nombre)
        mb = [float(v) for v in _pagina(r, u.pagina - 1)['/MediaBox']]
        alto_pag = mb[3] - mb[1]
        x1 = mb[0] + u.x
        y2 = mb[1] + alto_pag - u.y
        y1 = y2 - u.alto
        if x1 + u.ancho > mb[2] + 1 or y1 < mb[1] - 1:
            raise HTTPException(400, f'La ubicación {u.nombre} se sale de la página {u.pagina}')
        fields.append_signature_field(w, fields.SigFieldSpec(sig_field_name=u.nombre, on_page=u.pagina - 1, box=(x1, y1, x1 + u.ancho, y2)))
    meta = signers.PdfSignatureMetadata(
        field_name='MatchOnCard-Sello',
        certify=True,
        docmdp_permissions=fields.MDPPerm.FILL_FORMS,  # nivel 2: solo completar formularios y firmar
        reason='Documento registrado en MatchOnCard. Solo admite firmas electrónicas de los firmantes designados.',
        location='matchoncard.cl',
        name='MatchOnCard',
        subfilter=fields.SigSeedSubFilter.PADES,
    )
    out = io.BytesIO()
    signers.PdfSigner(meta, signer=firmante(), timestamper=tsa()).sign_pdf(w, output=out)
    pdf = out.getvalue()
    return {'pdf': base64.b64encode(pdf).decode(), 'paginas': paginas}


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


def _fuente(tam, negrita=False):
    ruta = FUENTE.replace('DejaVuSans.ttf', 'DejaVuSans-Bold.ttf') if negrita else FUENTE
    try:
        return ImageFont.truetype(ruta, tam)
    except Exception:
        return ImageFont.truetype(FUENTE, tam)


def _estampa(req: Firmar, ancho_pt: float, alto_pt: float) -> TextStampStyle:
    """Dibuja la estampa completa como imagen (4 px por punto) con las proporciones exactas del campo."""
    k = 4
    W, H = max(40, int(ancho_pt * k)), max(20, int(alto_pt * k))
    lienzo = Image.new('RGBA', (W, H), (255, 255, 255, 0))
    d = ImageDraw.Draw(lienzo)
    pad = int(3 * k)
    vertical = alto_pt > ancho_pt * 0.75          # campos altos: firma arriba, texto abajo
    if vertical:
        zona_firma = (pad, pad, W - pad, int(H * 0.5))
        zona_texto = (pad, int(H * 0.5) + pad, W - pad, H - pad)
        d.line([(pad, int(H * 0.5)), (W - pad, int(H * 0.5))], fill=(20, 52, 130, 120), width=max(1, k // 2))
    else:
        corte = int(W * 0.40)
        zona_firma = (pad, pad, corte - pad, H - pad)
        zona_texto = (corte + pad, pad, W - pad, H - pad)
        d.line([(corte, pad), (corte, H - pad)], fill=(20, 52, 130, 120), width=max(1, k // 2))
    tinta = _tinta(req.firma_png) if req.firma_png else None
    if tinta is not None:
        zw, zh = zona_firma[2] - zona_firma[0], zona_firma[3] - zona_firma[1]
        esc = min(zw / tinta.width, zh / tinta.height)
        t = tinta.resize((max(1, int(tinta.width * esc)), max(1, int(tinta.height * esc))), Image.LANCZOS)
        lienzo.alpha_composite(t, (zona_firma[0] + (zw - t.width) // 2, zona_firma[1] + (zh - t.height) // 2))
    fecha = datetime.now(timezone.utc).astimezone(ZONA).strftime('%d-%m-%Y %H:%M')
    lineas = [
        ('Firmado electrónicamente por', False, (90, 90, 90)),
        (req.nombre, True, (15, 23, 42)),
        (f'RUT {req.rut}', False, (15, 23, 42)),
        (f'{fecha} (hora de Chile)', False, (15, 23, 42)),
        (f'Validación {req.validacion_id[:8]} · huella, rostro, firma', False, (90, 90, 90)),
        (f'Evidencia {req.evidencia_sha256[:16]}…', False, (90, 90, 90)),
    ]
    if req.estado_validacion != 'aprobada':
        lineas.insert(4, ('Validación con observaciones', True, (160, 90, 0)))
    zw, zh = zona_texto[2] - zona_texto[0], zona_texto[3] - zona_texto[1]
    # busca el tamaño de letra más grande que quepa en la zona
    tam = int(9 * k)
    while tam > 3 * k:
        alto_l = int(tam * 1.22)
        if alto_l * len(lineas) <= zh and all(d.textlength(t, font=_fuente(tam, n)) <= zw for t, n, _ in lineas):
            break
        tam -= 1
    alto_l = int(tam * 1.22)
    y = zona_texto[1] + max(0, (zh - alto_l * len(lineas)) // 2)
    for t, n, color in lineas:
        f = _fuente(tam, n)
        while d.textlength(t, font=f) > zw and len(t) > 4:   # último recurso: recorta
            t = t[:-2] + '…'
        d.text((zona_texto[0], y), t, font=f, fill=color + (255,))
        y += alto_l
    return TextStampStyle(
        stamp_text='',
        background=PdfImage(lienzo),
        background_opacity=1,
        background_layout=SimpleBoxLayoutRule(x_align=AxisAlignment.ALIGN_MID, y_align=AxisAlignment.ALIGN_MID, margins=Margins(0, 0, 0, 0)),
        border_width=1,
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
    for s in r.embedded_signatures:
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
                'cobertura': st.coverage.name if st.coverage else None,
                'modificaciones': mod.name if mod is not None else None,
                'modificaciones_permitidas': mod is None or mod.value <= ModificationLevel.FORM_FILLING.value,
                'docmdp_ok': st.docmdp_ok,
                'certificado': s.signer_cert.subject.human_friendly,
            })
        except Exception as e:
            res.append({'campo': s.field_name, 'error': str(e), 'integra': False})
    vacios = [f[0] for f in fields.enumerate_sig_fields(r, filled_status=False)]
    return {'firmas': res, 'campos_pendientes': vacios, 'sha256': __import__('hashlib').sha256(data).hexdigest()}
