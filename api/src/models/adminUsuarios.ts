import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../utils/database';
import { hashClave } from '../utils/claves';
import { AdminSesion } from '../interfaces/auth';
import { ActualizarUsuarioDto, CrearUsuarioDto } from '../schemas/admin';
import * as Q from '../queries/admin';
import { AuditoriaService } from './auditoria';

// Usuarios de app-admin. Siempre debe quedar al menos un superadmin activo.
@Injectable()
export class AdminUsuariosService {
  constructor(private db: DbService, private audit: AuditoriaService) {}

  listar() {
    return this.db.q(Q.LISTAR_ADMINS);
  }

  private async existente(usuario: string) {
    const u = await this.db.uno(Q.ADMIN, [usuario]);
    if (!u) throw new NotFoundException(`No existe el usuario ${usuario}`);
    return u;
  }

  async crear(dto: CrearUsuarioDto, yo: AdminSesion, ip: string) {
    const r = await this.db.uno(Q.INSERTAR_ADMIN, [dto.usuario, await hashClave(dto.clave), dto.rol]);
    if (!r) throw new ConflictException(`Ya existe el usuario ${dto.usuario}`);
    await this.audit.registrar('usuario.creado', `admin:${yo.usuario}`, null, ip, { usuario: dto.usuario, rol: dto.rol });
    return { usuario: dto.usuario, rol: dto.rol };
  }

  async actualizar(usuario: string, dto: ActualizarUsuarioDto, yo: AdminSesion, ip: string) {
    const u = await this.existente(usuario);
    if (dto.rol === undefined && dto.activo === undefined) throw new BadRequestException('No hay cambios');
    if (usuario === yo.usuario && (dto.activo === false || dto.rol === 'operador')) throw new BadRequestException('No puedes desactivarte ni quitarte el rol de superadmin a ti mismo');
    // no dejar el sistema sin superadmin
    const dejaDeSerSuper = u.rol === 'superadmin' && u.activo && (dto.rol === 'operador' || dto.activo === false);
    if (dejaDeSerSuper && (await this.db.uno(Q.CONTAR_SUPERADMINS_ACTIVOS))!.n <= 1) throw new BadRequestException('Debe quedar al menos un superadmin activo');
    await this.db.q(Q.ACTUALIZAR_ADMIN, [usuario, dto.rol ?? null, dto.activo ?? null]);
    if (dto.activo === false || dto.rol) await this.db.q(Q.CERRAR_SESIONES_ADMIN, [usuario]);   // el cambio vale desde el próximo ingreso
    await this.audit.registrar(dto.activo === false ? 'usuario.desactivado' : 'usuario.actualizado', `admin:${yo.usuario}`, null, ip, { usuario, ...dto });
    return { usuario, ok: true };
  }

  async cambiarClave(usuario: string, clave: string, yo: AdminSesion, ip: string) {
    await this.existente(usuario);
    await this.db.q(Q.CAMBIAR_CLAVE_ADMIN, [usuario, await hashClave(clave)]);
    if (usuario !== yo.usuario) await this.db.q(Q.CERRAR_SESIONES_ADMIN, [usuario]);   // cierra las sesiones abiertas con la clave anterior
    await this.audit.registrar('usuario.clave_cambiada', `admin:${yo.usuario}`, null, ip, { usuario });
    return { usuario, ok: true };
  }

  async desbloquear(usuario: string, yo: AdminSesion, ip: string) {
    await this.existente(usuario);
    await this.db.q(Q.DESBLOQUEAR_ADMIN, [usuario]);
    await this.audit.registrar('usuario.desbloqueado', `admin:${yo.usuario}`, null, ip, { usuario });
    return { usuario, ok: true };
  }
}
