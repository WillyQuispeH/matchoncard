import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { config } from './config';

// Cifrado de sobre (envelope):
//  - cada validación tiene su DEK (32 bytes) con la que el teléfono cifra el ZIP;
//  - la DEK se guarda envuelta con la KEK (AES-256-GCM) en formato "<kekId>:<base64(iv|ct|tag)>".
// Destruir la DEK deja la evidencia ilegible aunque sobreviva alguna copia del objeto.

export const MAGIA_EVIDENCIA = Buffer.from('V3P1');
export const MAGIA_DOCUMENTO = Buffer.from('V3D1'); // cabecera del archivo cifrado: "V3P1" | iv(12) | cifrado | tag(16)

@Injectable()
export class CriptoService {
  private keks = new Map<string, Buffer>();
  constructor() {
    const add = (id: string, b64: string) => {
      const k = Buffer.from(b64, 'base64');
      if (k.length !== 32) throw new Error(`La KEK ${id} debe tener 32 bytes en base64`);
      this.keks.set(id, k);
    };
    add(config.kek.id, config.kek.clave);
    for (const k of config.kekAnteriores) add(k.id, k.clave);
  }

  nuevaDek(): Buffer {
    return randomBytes(32);
  }

  envolver(dato: Buffer): string {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', this.keks.get(config.kek.id)!, iv);
    const ct = Buffer.concat([c.update(dato), c.final()]);
    return `${config.kek.id}:${Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64')}`;
  }
  desenvolver(envuelto: string): Buffer {
    const [id, b64] = envuelto.split(':');
    const kek = this.keks.get(id);
    if (!kek) throw new Error(`KEK desconocida: ${id}`);
    const raw = Buffer.from(b64, 'base64');
    const d = createDecipheriv('aes-256-gcm', kek, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(raw.length - 16));
    return Buffer.concat([d.update(raw.subarray(12, raw.length - 16)), d.final()]);
  }
  kekDe(envuelto: string): string {
    return envuelto.split(':')[0];
  }

  // Descifra un archivo de evidencia producido por el teléfono (WebCrypto AES-GCM: el tag va al final del cifrado)
  descifrarEvidencia(archivo: Buffer, dek: Buffer): Buffer {
    if (archivo.length < 4 + 12 + 16 || !archivo.subarray(0, 4).equals(MAGIA_EVIDENCIA)) throw new Error('Formato de evidencia desconocido');
    const iv = archivo.subarray(4, 16);
    const tag = archivo.subarray(archivo.length - 16);
    const d = createDecipheriv('aes-256-gcm', dek, iv);
    d.setAAD(MAGIA_EVIDENCIA);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(archivo.subarray(16, archivo.length - 16)), d.final()]);
  }

  // Documentos PDF en reposo: "V3D1" | iv(12) | cifrado | tag(16), AAD = "V3D1" + id del documento
  cifrarDocumento(pdf: Buffer, dek: Buffer, documentoId: string): Buffer {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', dek, iv);
    c.setAAD(Buffer.concat([MAGIA_DOCUMENTO, Buffer.from(documentoId)]));
    return Buffer.concat([MAGIA_DOCUMENTO, iv, c.update(pdf), c.final(), c.getAuthTag()]);
  }
  descifrarDocumento(archivo: Buffer, dek: Buffer, documentoId: string): Buffer {
    if (archivo.length < 32 || !archivo.subarray(0, 4).equals(MAGIA_DOCUMENTO)) throw new Error('Formato de documento desconocido');
    const d = createDecipheriv('aes-256-gcm', dek, archivo.subarray(4, 16));
    d.setAAD(Buffer.concat([MAGIA_DOCUMENTO, Buffer.from(documentoId)]));
    d.setAuthTag(archivo.subarray(archivo.length - 16));
    return Buffer.concat([d.update(archivo.subarray(16, archivo.length - 16)), d.final()]);
  }

  token(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
  }
  sha256(dato: string | Buffer): string {
    return createHash('sha256').update(dato).digest('hex');
  }
  hmac(secreto: string | Buffer, dato: string | Buffer): string {
    return createHmac('sha256', secreto).update(dato).digest('hex');
  }
  igual(a: string, b: string): boolean {
    const x = Buffer.from(a), y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
  }

  // RUT: normaliza (sin puntos ni guion, DV en mayúscula), valida dígito verificador y produce hash + máscara
  static normalizarRut(rut: string): string | null {
    const s = String(rut || '').toUpperCase().replace(/[^0-9K]/g, '');
    if (s.length < 2) return null;
    const cuerpo = s.slice(0, -1), dv = s.slice(-1);
    if (!/^\d{6,9}$/.test(cuerpo)) return null;
    let suma = 0, m = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) { suma += Number(cuerpo[i]) * m; m = m === 7 ? 2 : m + 1; }
    const r = 11 - (suma % 11), esperado = r === 11 ? '0' : r === 10 ? 'K' : String(r);
    return dv === esperado ? `${Number(cuerpo)}-${dv}` : null;
  }
  hashRut(rutNormalizado: string): string {
    return this.hmac(config.pimientaRut, rutNormalizado);
  }
  static mascaraRut(rutNormalizado: string): string {
    const [c, dv] = rutNormalizado.split('-');
    return `****${c.slice(-3)}-${dv}`;
  }
}
