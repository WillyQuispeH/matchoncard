import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { FirmarParams, Ubicacion } from '../interfaces/firmador';

// Cliente del servicio interno api-signature (Python + pyHanko). Solo es alcanzable dentro de la red de Docker.
@Injectable()
export class FirmadorClient {
  private log = new Logger('Firmador');
  private url = (process.env.FIRMADOR_URL || 'http://api-signature:4563').replace(/\/$/, '');

  private async post(ruta: string, cuerpo: unknown, segundos = 90): Promise<any> {
    let r: Response;
    try {
      r = await fetch(`${this.url}${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(segundos * 1000) });
    } catch (e) {
      this.log.error(`${ruta}: ${(e as Error).message}`);
      throw new ServiceUnavailableException('El servicio de firma no está disponible. Intenta en unos minutos.');
    }
    const j: any = await r.json().catch(() => ({}));
    if (r.status === 400) throw new BadRequestException(j.detail || 'PDF no válido');
    if (!r.ok) { this.log.error(`${ruta}: HTTP ${r.status} ${JSON.stringify(j).slice(0, 300)}`); throw new ServiceUnavailableException('Error en el servicio de firma'); }
    return j;
  }

  preparar(pdf: Buffer, ubicaciones: Ubicacion[], documentoId: string, titulo: string) {
    return this.post('/preparar', { pdf: pdf.toString('base64'), ubicaciones, documento_id: documentoId, titulo }) as Promise<{ pdf: string; paginas: number }>;
  }
  firmar(p: FirmarParams) {
    return this.post('/firmar', { ...p, pdf: p.pdf.toString('base64'), firma_png: p.firma_png ? p.firma_png.toString('base64') : null }) as Promise<{ pdf: string }>;
  }
  verificar(pdf: Buffer) {
    return this.post('/verificar', { pdf: pdf.toString('base64') }, 60);
  }
  async salud() {
    try { const r = await fetch(`${this.url}/salud`, { signal: AbortSignal.timeout(5000) }); return r.ok ? await r.json() : null; } catch { return null; }
  }
}
