import { Body, Controller, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SesionGuard } from '../middlewares/auth';
import { Ip, Sesion } from '../middlewares/decorators';
import { SesionTelefono } from '../interfaces/auth';
import { ConsentimientoDto, IniciarDto, ResultadoDto, SubidaDto } from '../schemas/captura';
import { CapturaService } from '../models/captura';

// Llamadas del teléfono. La página /captura/:token la sirve "app" en el mismo origen (sin CORS).
@Controller('v1/captura')
export class CapturaController {
  constructor(private svc: CapturaService) {}

  @Post('iniciar')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  iniciar(@Body() dto: IniciarDto, @Ip() ip: string, @Headers('user-agent') ua = '') {
    return this.svc.iniciar(dto.token, ip, ua);
  }

  @Post('consentimiento')
  @HttpCode(200)
  @UseGuards(SesionGuard)
  consentimiento(@Sesion() s: SesionTelefono, @Body() dto: ConsentimientoDto, @Ip() ip: string, @Headers('user-agent') ua = '') {
    return this.svc.consentimiento(s.validacionId, dto, ip, ua);
  }

  @Post('subida')
  @HttpCode(200)
  @UseGuards(SesionGuard)
  subida(@Sesion() s: SesionTelefono, @Body() dto: SubidaDto, @Ip() ip: string) {
    return this.svc.subida(s.validacionId, dto.bytes, ip);
  }

  @Post('resultado')
  @HttpCode(200)
  @UseGuards(SesionGuard)
  resultado(@Sesion() s: SesionTelefono, @Body() dto: ResultadoDto, @Ip() ip: string) {
    return this.svc.resultado(s.validacionId, dto, ip);
  }
}
