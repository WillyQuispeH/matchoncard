import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { config } from '../utils/config';
import { DbService } from '../utils/database';
import { CriptoService } from '../utils/cripto';
import { ClienteGuard } from '../middlewares/auth';
import { ActualizarClienteDto, CrearClienteDto } from '../schemas/admin';
import * as Q from '../queries/admin';
import { AuditoriaService } from './auditoria';

// Clientes de la API (Portalfirma u otros). Los secretos se guardan envueltos con la KEK
// y se muestran UNA sola vez: al crear el cliente o al rotarlos.
@Injectable()
export class AdminClientesService {
  constructor(private db: DbService, private cripto: CriptoService, private audit: AuditoriaService, private guard: ClienteGuard) {}

  private nuevoSecreto() { return randomBytes(32).toString('base64url'); }

  listar() {
    return this.db.q(Q.LISTAR_CLIENTES, [config.webhooks.maxIntentos]);
  }

  async crear(dto: CrearClienteDto, actor: string, ip: string) {
    const secreto_jwt = this.nuevoSecreto(), secreto_webhook = this.nuevoSecreto();
    const r = await this.db.uno(Q.INSERTAR_CLIENTE, [dto.id, dto.nombre.trim(), this.cripto.envolver(Buffer.from(secreto_jwt)), this.cripto.envolver(Buffer.from(secreto_webhook)), dto.roles]);
    if (!r) throw new ConflictException(`Ya existe un cliente con id ${dto.id}`);
    await this.audit.registrar('cliente.creado', actor, null, ip, { cliente_id: dto.id, roles: dto.roles });
    return { id: dto.id, nombre: dto.nombre.trim(), roles: dto.roles, secreto_jwt, secreto_webhook };
  }

  async actualizar(id: string, dto: ActualizarClienteDto, actor: string, ip: string) {
    if (dto.nombre === undefined && dto.roles === undefined && dto.activo === undefined) throw new BadRequestException('No hay cambios');
    const r = await this.db.uno(Q.ACTUALIZAR_CLIENTE, [id, dto.nombre?.trim() ?? null, dto.roles ?? null, dto.activo ?? null]);
    if (!r) throw new NotFoundException(`No existe el cliente ${id}`);
    this.guard.olvidar(id);   // desactivar o cambiar roles vale de inmediato
    const accion = dto.activo === false ? 'cliente.desactivado' : dto.activo === true ? 'cliente.activado' : 'cliente.actualizado';
    await this.audit.registrar(accion, actor, null, ip, { cliente_id: id, ...dto });
    return r;
  }

  async rotar(id: string, secreto: 'jwt' | 'webhook' | 'ambos', motivo: string | undefined, actor: string, ip: string) {
    if (!(await this.db.uno(Q.CLIENTE_ADMIN, [id]))) throw new NotFoundException(`No existe el cliente ${id}`);
    const salida: { id: string; secreto_jwt?: string; secreto_webhook?: string } = { id };
    if (secreto !== 'webhook') {
      salida.secreto_jwt = this.nuevoSecreto();
      await this.db.q(Q.ROTAR_SECRETO_JWT, [id, this.cripto.envolver(Buffer.from(salida.secreto_jwt))]);
    }
    if (secreto !== 'jwt') {
      salida.secreto_webhook = this.nuevoSecreto();
      await this.db.q(Q.ROTAR_SECRETO_WEBHOOK, [id, this.cripto.envolver(Buffer.from(salida.secreto_webhook))]);
    }
    this.guard.olvidar(id);   // el JWT firmado con el secreto anterior deja de valer al tiro
    await this.audit.registrar('cliente.secreto_rotado', actor, null, ip, { cliente_id: id, secreto, ...(motivo ? { motivo } : {}) });
    return salida;
  }
}
