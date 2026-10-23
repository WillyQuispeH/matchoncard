import { Injectable } from '@nestjs/common';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './config';

// Cloudflare R2 por su API compatible con S3 (por eso el cliente es el de @aws-sdk/client-s3).
@Injectable()
export class AlmacenService {
  readonly r2 = new S3Client({
    endpoint: config.r2.endpoint,
    region: 'auto',
    credentials: { accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey },
    // R2 no acepta los checksums CRC32 que el SDK agrega por defecto: romperían las URLs de subida firmadas
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  readonly bucket = config.r2.bucket;

  claveObjeto(validacionId: string, fecha = new Date()): string {
    // sin RUT ni nombres en la ruta
    return `evidencia/${fecha.getUTCFullYear()}/${String(fecha.getUTCMonth() + 1).padStart(2, '0')}/${validacionId}.v3p`;
  }

  // URL de subida firmada para UN objeto, con tamaño exacto firmado (no se puede subir otra cosa ni más grande)
  async urlSubida(clave: string, bytes: number): Promise<string> {
    const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: clave, ContentType: 'application/octet-stream', ContentLength: bytes });
    return getSignedUrl(this.r2, cmd, { expiresIn: config.captura.subidaSegundos, signableHeaders: new Set(['content-type', 'content-length']) });
  }

  async tamano(clave: string): Promise<number | null> {
    try {
      const r = await this.r2.send(new HeadObjectCommand({ Bucket: this.bucket, Key: clave }));
      return r.ContentLength ?? null;
    } catch (e: any) {
      if (e?.$metadata?.httpStatusCode === 404 || e?.name === 'NotFound') return null;
      throw e;
    }
  }

  async leer(clave: string): Promise<Buffer> {
    const r = await this.r2.send(new GetObjectCommand({ Bucket: this.bucket, Key: clave }));
    return Buffer.from(await r.Body!.transformToByteArray());
  }

  async escribir(clave: string, dato: Buffer): Promise<void> {
    await this.r2.send(new PutObjectCommand({ Bucket: this.bucket, Key: clave, Body: dato, ContentType: 'application/octet-stream' }));
  }

  async borrar(clave: string): Promise<void> {
    await this.r2.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: clave }));
  }
}
