import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { DbService } from '../utils/database';
import { CriptoService } from '../utils/cripto';
import { ClienteAuth, Rol, SesionTelefono } from '../interfaces/auth';
import { CLIENTE_ACTIVO } from '../queries/clientes';
import { ROLES } from './decorators';

// Clientes de la API (Portalfirma u otros): cabecera "id" + "Authorization: Bearer <JWT HS256>" firmado con el secreto del cliente.
// El JWT debe ser de vida corta (exp - iat ≤ CLIENT_JWT_MAX_SECONDS) y su "iss" debe ser el id del cliente.
@Injectable()
export class ClienteGuard implements CanActivate {
  private cache = new Map<string, { at: number; secreto: string; c: ClienteAuth }>();
  constructor(private db: DbService, private cripto: CriptoService, private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const id = String(req.headers['id'] || '');
    const auth = String(req.headers['authorization'] || '');
    if (!id || !auth.startsWith('Bearer ')) throw new UnauthorizedException('Faltan las cabeceras id y Authorization');
    const reg = await this.cliente(id);
    if (!reg) throw new UnauthorizedException('Cliente desconocido');
    let p: jwt.JwtPayload;
    try {
      p = jwt.verify(auth.slice(7), reg.secreto, { algorithms: ['HS256'], issuer: id, clockTolerance: 30 }) as jwt.JwtPayload;
    } catch {
      throw new UnauthorizedException('JWT inválido o vencido');
    }
    if (!p.iat || !p.exp || p.exp - p.iat > config.jwtMaxSegundos) throw new UnauthorizedException(`El JWT debe durar como máximo ${config.jwtMaxSegundos} s`);
    const necesarios = this.reflector.getAllAndOverride<Rol[]>(ROLES, [ctx.getHandler(), ctx.getClass()]) || ['integracion'];
    if (!necesarios.some((r) => reg.c.roles.includes(r))) throw new ForbiddenException('El cliente no tiene el rol requerido');
    req.cliente = reg.c;
    return true;
  }

  // al desactivar un cliente o rotar su secreto, deja de valer de inmediato (sin esperar el minuto de caché)
  olvidar(id: string) { this.cache.delete(id); }

  private async cliente(id: string) {
    const hit = this.cache.get(id);
    if (hit && Date.now() - hit.at < 60_000) return hit;
    const r = await this.db.uno(CLIENTE_ACTIVO, [id]);
    if (!r) { this.cache.delete(id); return null; }
    const v = { at: Date.now(), secreto: this.cripto.desenvolver(r.secreto_cifrado).toString('utf8'), c: { id: r.id, nombre: r.nombre, roles: r.roles } };
    this.cache.set(id, v);
    return v;
  }
}

// Teléfono del firmante: token de sesión emitido al canjear el link (Authorization: Bearer <sesión>), válido para UNA validación.
@Injectable()
export class SesionGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const auth = String(req.headers['authorization'] || '');
    if (!auth.startsWith('Bearer ')) throw new UnauthorizedException('Falta la sesión de captura');
    try {
      const p = jwt.verify(auth.slice(7), config.secretoSesion, { algorithms: ['HS256'], audience: 'captura' }) as jwt.JwtPayload;
      req.sesion = { validacionId: String(p.sub) } as SesionTelefono;
      return true;
    } catch {
      throw new UnauthorizedException('La sesión de captura venció. Abre de nuevo el enlace que recibiste.');
    }
  }
}

export function emitirSesion(validacionId: string, minutos: number): string {
  return jwt.sign({}, config.secretoSesion, { algorithm: 'HS256', subject: validacionId, audience: 'captura', expiresIn: minutos * 60 });
}
