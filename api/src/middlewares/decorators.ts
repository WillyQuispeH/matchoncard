import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import { AdminSesion, ClienteAuth, Rol, SesionTelefono } from '../interfaces/auth';
import { CLIENTE_POR_DEFECTO } from '../data/panel';

export const ROLES = 'roles';
export const Roles = (...r: Rol[]) => SetMetadata(ROLES, r);

export const ipDe = (req: Request) => (req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
export const Ip = createParamDecorator((_: unknown, ctx: ExecutionContext) => ipDe(ctx.switchToHttp().getRequest()));
export const Cliente = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().cliente as ClienteAuth);
export const Sesion = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().sesion as SesionTelefono);
export const Admin = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().admin as AdminSesion);

// Cliente sobre el que opera app-admin (cabecera X-Cliente, elegido en el selector). Sin cabecera: el cliente por defecto.
export const ClienteId = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const v = String(ctx.switchToHttp().getRequest().headers['x-cliente'] || '').trim();
  return /^[A-Za-z0-9._-]{1,60}$/.test(v) ? v : CLIENTE_POR_DEFECTO;
});
