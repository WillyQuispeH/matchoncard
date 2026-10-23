import { BadRequestException, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { DocumentosService } from '../models/documentos';

// Verificación pública: cualquiera puede subir un PDF y comprobar sus firmas. El archivo no se guarda.
// La página /verificar la sirve "app".
@Controller('verificar')
export class VerificarController {
  constructor(private svc: DocumentosService) {}

  @Post('api')
  @HttpCode(200)
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  verificar(@Req() req: Request) {
    const b = req.body;
    if (!Buffer.isBuffer(b) || !b.length) throw new BadRequestException('Envía el PDF como cuerpo de la solicitud (Content-Type: application/pdf)');
    return this.svc.verificar(b);
  }
}
