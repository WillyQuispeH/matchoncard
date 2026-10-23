import { Body, Controller, Delete, Get, Header, HttpCode, Param, Post, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminGuard } from '../middlewares/adminAuth';
import { Admin, ClienteId, Ip } from '../middlewares/decorators';
import { AdminSesion } from '../interfaces/auth';
import { CrearValidacionDto, MotivoDto } from '../schemas/validaciones';
import { ListaDto } from '../schemas/admin';
import { ValidacionesService } from '../models/validaciones';
import { PanelService } from '../models/panel';
import { OperacionService } from '../models/operacion';
import { InformeService } from '../models/informe';

// Validaciones del cliente elegido en app-admin (cabecera X-Cliente)
@Controller('admin/api')
@UseGuards(AdminGuard)
export class AdminValidacionesController {
  constructor(private panel: PanelService, private validaciones: ValidacionesService, private operacion: OperacionService, private informe: InformeService) {}

  @Get('resumen')
  async resumen(@ClienteId() cid: string) { return this.panel.resumen(await this.panel.cliente(cid)); }

  @Get('validaciones')
  async listar(@ClienteId() cid: string, @Query() q: ListaDto) { return this.panel.listar(await this.panel.cliente(cid), q); }

  @Post('validaciones')
  async crear(@ClienteId() cid: string, @Admin() a: AdminSesion, @Body() dto: CrearValidacionDto, @Ip() ip: string) {
    return this.validaciones.crear(await this.panel.cliente(cid), dto, ip, `admin:${a.usuario}`);
  }

  @Get('validaciones/:id')
  async detalle(@ClienteId() cid: string, @Admin() a: AdminSesion, @Param('id') id: string, @Ip() ip: string) {
    return this.panel.detalle(await this.panel.cliente(cid), id, `admin:${a.usuario}`, ip);
  }

  @Get('validaciones/:id/evidencia')
  @Header('Cache-Control', 'no-store')
  async evidencia(@ClienteId() cid: string, @Admin() a: AdminSesion, @Param('id') id: string, @Query() q: MotivoDto, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const zip = await this.validaciones.evidencia(await this.panel.cliente(cid), id, q.motivo, ip, `admin:${a.usuario}`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="evidencia-${id}.zip"`);
    return new StreamableFile(zip);
  }

  // Revisión de los 3 factores: imágenes descifradas al vuelo + datos del motor. Cada apertura queda auditada.
  @Get('validaciones/:id/operacion')
  @Header('Cache-Control', 'no-store')
  async verOperacion(@ClienteId() cid: string, @Admin() a: AdminSesion, @Param('id') id: string, @Ip() ip: string) {
    const c = await this.panel.cliente(cid);
    await this.panel.existe(c, id);
    const op = await this.operacion.abrir(c.id, id, `admin:${a.usuario}`, ip);
    const imagenes: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(op.imagenes)) imagenes[k] = v ? `data:${v.mime};base64,${v.data.toString('base64')}` : null;
    return { imagenes, datos: op.datos };
  }

  @Post('validaciones/:id/informe')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async emitirInforme(@ClienteId() cid: string, @Admin() a: AdminSesion, @Param('id') id: string, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const actor = `admin:${a.usuario}`;
    const c = await this.panel.cliente(cid);
    const v = await this.panel.detalle(c, id, actor, ip);
    const op = await this.operacion.abrir(c.id, id, actor, ip);
    const r = await this.informe.emitir(v, op, v.historial, actor, ip);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="informe-${r.folio}.pdf"`);
    res.setHeader('X-Informe-Folio', r.folio);
    res.setHeader('X-Informe-Sha256', r.sha256);
    return new StreamableFile(r.pdf);
  }

  @Delete('validaciones/:id')
  @HttpCode(200)
  async borrar(@ClienteId() cid: string, @Admin() a: AdminSesion, @Param('id') id: string, @Body() dto: MotivoDto, @Ip() ip: string) {
    const c = await this.panel.cliente(cid);
    this.operacion.olvidar(c.id, id);
    return this.validaciones.borrar(c, id, dto.motivo, ip, `admin:${a.usuario}`);
  }
}
