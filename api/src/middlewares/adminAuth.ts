import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { COOKIE } from '../data/panel';
import { AdminSesion } from '../interfaces/auth';
import { PanelService } from '../models/panel';
import { config } from '../utils/config';

const ADMIN_LOCAL: AdminSesion = { usuario: 'dev-local', rol: 'superadmin' };

export const leerCookie = (req: Request) => {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : undefined;
};

// Usuario de app-admin: cookie de sesión (SameSite=Strict) + cabecera X-Panel en las llamadas que modifican.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private panel: PanelService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    // defensa CSRF adicional a SameSite=Strict: app-admin siempre envía esta cabecera
    if (req.method !== 'GET' && req.headers['x-panel'] !== '1') throw new UnauthorizedException('Solicitud no válida');
    if (config.adminSinLogin) { req.admin = ADMIN_LOCAL; return true; }
    const s = await this.panel.sesion(leerCookie(req));
    if (!s) throw new UnauthorizedException('Sesión vencida');
    req.admin = s;
    return true;
  }
}

// Solo superadmin: gestión de clientes y de usuarios. Va DESPUÉS de AdminGuard.
@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const a = ctx.switchToHttp().getRequest().admin as AdminSesion | undefined;
    if (a?.rol !== 'superadmin') throw new ForbiddenException('Solo un superadmin puede hacer esto');
    return true;
  }
}
