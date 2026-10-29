import { BadRequestException, Controller, Get, Header, HttpCode, Param, ParseUUIDPipe, Post, Req, Res, StreamableFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Ip } from '../middlewares/decorators';
import { DocumentosService } from '../models/documentos';
import { FirmaPublicaService } from '../models/firmaPublica';

// Verificación pública: cualquiera puede subir un PDF y comprobar sus firmas. El archivo no se guarda.
// GET /verificar/:id es el destino del QR de la estampa: resumen de la firma y su informe de validación completo.
// Las páginas /verificar y /verificar/:id las sirve "app".
@Controller('verificar')
export class VerificarController {
  constructor(private svc: DocumentosService, private firmas: FirmaPublicaService) {}

  @Post('api')
  @HttpCode(200)
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  verificar(@Req() req: Request) {
    const b = req.body;
    if (!Buffer.isBuffer(b) || !b.length) throw new BadRequestException('Envía el PDF como cuerpo de la solicitud (Content-Type: application/pdf)');
    return this.svc.verificar(b);
  }

  @Get(':id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  firma(@Param('id', ParseUUIDPipe) id: string) {
    return this.firmas.resumen(id);
  }

  @Get(':id/informe')
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  async informe(@Param('id', ParseUUIDPipe) id: string, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const r = await this.firmas.informe(id, ip);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="informe-${r.folio}.pdf"`);
    res.setHeader('X-Informe-Folio', r.folio);
    res.setHeader('X-Informe-Sha256', r.sha256);
    return new StreamableFile(r.pdf);
  }
}
