import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DbService } from '../utils/database';
import { CriptoService } from '../utils/cripto';
import { hashClave, verificarClave } from '../utils/claves';
import { AdminSesion, ClienteAuth, RolAdmin } from '../interfaces/auth';
import { BLOQUEO_MIN, MAX_INTENTOS, TAM_PAGINA } from '../data/panel';
import * as Q from '../queries/panel';
import { HISTORIAL_VALIDACION } from '../queries/auditoria';
import { CLIENTE_POR_ID } from '../queries/clientes';
import { AuditoriaService } from './auditoria';
import { ValidacionesService } from './validaciones';

// hash ficticio para que un usuario inexistente tarde lo mismo que uno real (no revela qué usuarios existen)
let HASH_FALSO: Promise<string> | null = null;

@Injectable()
export class PanelService {
  constructor(private db: DbService, private cripto: CriptoService, private audit: AuditoriaService, private validaciones: ValidacionesService) {}

  // Cliente sobre el que opera app-admin (elegido en el selector). Con todos los roles: el panel actúa en su nombre.
  async cliente(id: string): Promise<ClienteAuth> {
    const c = await this.db.uno(CLIENTE_POR_ID, [id]);
    if (!c) throw new NotFoundException(`No existe el cliente ${id}`);
    return { id: c.id, nombre: c.nombre, roles: ['integracion', 'auditor', 'dpo'] };
  }

  async ingresar(usuario: string, clave: string, ip: string): Promise<{ token: string; sesion: AdminSesion }> {
    const u = await this.db.uno(Q.ADMIN_POR_USUARIO, [usuario]);
    if (!u || !u.activo) {
      HASH_FALSO ??= hashClave('x'.repeat(16));
      await verificarClave(clave, await HASH_FALSO);
      await this.audit.registrar('panel.ingreso_fallido', `admin:${usuario.slice(0, 40)}`, null, ip, { motivo: 'usuario' });
      throw new UnauthorizedException('Usuario o clave incorrectos');
    }
    if (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()) {
      throw new ForbiddenException(`Cuenta bloqueada por intentos fallidos. Intenta de nuevo en ${BLOQUEO_MIN} minutos.`);
    }
    if (!(await verificarClave(clave, u.clave_hash))) {
      const n = u.intentos_fallidos + 1;
      const bloquear = n >= MAX_INTENTOS;
      await this.db.q(Q.registrarIntentoFallido(bloquear), [usuario, bloquear ? 0 : n]);
      await this.audit.registrar('panel.ingreso_fallido', `admin:${usuario}`, null, ip, { intento: n });
      throw new UnauthorizedException('Usuario o clave incorrectos');
    }
    const token = this.cripto.token(32);
    await this.db.q(Q.INSERTAR_SESION, [this.cripto.sha256(token), usuario, ip]);
    await this.db.q(Q.ADMIN_INGRESO_OK, [usuario]);
    await this.db.q(Q.BORRAR_SESIONES_VENCIDAS);
    await this.audit.registrar('panel.ingreso', `admin:${usuario}`, null, ip);
    return { token, sesion: { usuario, rol: u.rol as RolAdmin } };
  }

  async sesion(token: string | undefined): Promise<AdminSesion | null> {
    if (!token || !/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
    const s = await this.db.uno(Q.SESION_ACTIVA, [this.cripto.sha256(token)]);
    return s ? { usuario: s.usuario, rol: s.rol as RolAdmin } : null;
  }

  async salir(token: string | undefined, usuario: string, ip: string) {
    if (token) await this.db.q(Q.BORRAR_SESION, [this.cripto.sha256(token)]);
    await this.audit.registrar('panel.salida', `admin:${usuario}`, null, ip);
  }

  async resumen(cliente: ClienteAuth) {
    const porEstado = await this.db.q(Q.RESUMEN_POR_ESTADO, [cliente.id]);
    const porDia = await this.db.q(Q.RESUMEN_POR_DIA, [cliente.id]);
    return { porEstado, porDia };
  }

  async listar(cliente: ClienteAuth, f: { estado?: string; rut?: string; pagina?: number }) {
    const params: unknown[] = [cliente.id];
    let where = 'cliente_id = $1';
    if (f.estado) { params.push(f.estado); where += ` and estado = $${params.length}`; }
    if (f.rut) {
      const n = CriptoService.normalizarRut(f.rut);
      if (!n) return { total: 0, filas: [] };
      params.push(this.cripto.hashRut(n)); where += ` and rut_hash = $${params.length}`;
    }
    const pagina = Math.max(1, f.pagina || 1), tam = TAM_PAGINA;
    const total = (await this.db.uno(Q.contarValidaciones(where), params))!.n;
    const filas = await this.db.q(Q.listarValidaciones(where, tam, (pagina - 1) * tam), params);
    return {
      total, pagina, tam,
      filas: filas.map((r) => ({
        ...ValidacionesService.vista(r),
        nombre: r.nombre,
        dispositivo: r.resultado?.dispositivo?.modelo || r.resultado?.dispositivo?.perfil || null,
        duracion_ms: r.resultado?.duracion_ms ?? null,
      })),
    };
  }

  async detalle(cliente: ClienteAuth, id: string, actor: string, ip: string) {
    const r = await this.validaciones.fila(cliente, id);
    const historial = await this.db.q(HISTORIAL_VALIDACION, [id]);
    const informes = await this.db.q(Q.INFORMES_DE_VALIDACION, [id]);
    await this.audit.registrar('validacion.consultada', actor, id, ip);
    return {
      ...ValidacionesService.vista(r),
      nombre: r.nombre,
      resultado: r.resultado,
      consentimiento_texto: r.consentimiento?.texto ?? null,
      tiene_evidencia: !!(r.evidencia_subida_en && r.dek_envuelta),
      historial,
      informes,
    };
  }

  async existe(cliente: ClienteAuth, id: string) {
    const r = await this.db.uno(Q.EXISTE_VALIDACION, [id, cliente.id]);
    if (!r) throw new NotFoundException('Validación no encontrada');
  }
}
