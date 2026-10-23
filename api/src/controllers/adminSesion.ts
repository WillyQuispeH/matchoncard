import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AdminGuard, leerCookie } from '../middlewares/adminAuth';
import { Admin, Ip } from '../middlewares/decorators';
import { AdminSesion } from '../interfaces/auth';
import { COOKIE, SESION_HORAS } from '../data/panel';
import { LoginDto } from '../schemas/admin';
import { PanelService } from '../models/panel';

// La cookie solo viaja a la API de app-admin (admin.matchoncard.cl/admin/api/*)
const RUTA_COOKIE = '/admin/api';

@Controller('admin/api')
export class AdminSesionController {
  constructor(private panel: PanelService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Ip() ip: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (req.headers['x-panel'] !== '1') throw new UnauthorizedException('Solicitud no válida');
    const { token, sesion } = await this.panel.ingresar(dto.usuario.trim(), dto.clave, ip);
    res.cookie(COOKIE, token, { httpOnly: true, secure: true, sameSite: 'strict', path: RUTA_COOKIE, maxAge: SESION_HORAS * 3600_000 });
    return sesion;
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AdminGuard)
  async logout(@Admin() a: AdminSesion, @Req() req: Request, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    await this.panel.salir(leerCookie(req), a.usuario, ip);
    res.clearCookie(COOKIE, { path: RUTA_COOKIE });
    return { ok: true };
  }

  @Get('yo')
  @UseGuards(AdminGuard)
  yo(@Admin() a: AdminSesion) { return a; }
}
