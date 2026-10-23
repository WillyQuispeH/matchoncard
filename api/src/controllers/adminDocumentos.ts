import { Body, Controller, Get, Header, HttpCode, Param, Post, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminGuard } from '../middlewares/adminAuth';
import { Admin, ClienteId, Ip } from '../middlewares/decorators';
import { AdminSesion } from '../interfaces/auth';
import { nombreArchivo } from '../utils/archivos';
import { CancelarDto, CrearDocumentoDto } from '../schemas/documentos';
import { DocumentosService } from '../models/documentos';
import { PanelService } from '../models/panel';

// Documentos del cliente elegido en app-admin (cabecera X-Cliente)
@Controller('admin/api/documentos')
@UseGuards(AdminGuard)
export class AdminDocumentosController {
  constructor(private panel: PanelService, private docs: DocumentosService) {}

  @Get()
  async listar(@ClienteId() cid: string) { return this.docs.listar(await this.panel.cliente(cid)); }

  @Post()
  async crear(@ClienteId() cid: string, @Admin() a: AdminSesion, @Body() dto: CrearDocumentoDto, @Ip() ip: string) {
    return this.docs.crear(await this.panel.cliente(cid), dto, ip, `admin:${a.usuario}`);
  }

  @Get(':id')
  async detalle(@ClienteId() cid: string, @Param('id') id: string) { return this.docs.vista(await this.panel.cliente(cid), id); }

  @Get(':id/pdf')
  @Header('Cache-Control', 'no-store')
  async pdf(@ClienteId() cid: string, @Admin() a: AdminSesion, @Param('id') id: string, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const d = await this.docs.pdf(await this.panel.cliente(cid), id, ip, `admin:${a.usuario}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo(d.nombre, d.version, d.estado)}"`);
    res.setHeader('X-Documento-Sha256', d.sha256);
    return new StreamableFile(d.pdf);
  }

  @Post(':id/firmantes/:fid/enlace')
  @HttpCode(200)
  async enlace(@ClienteId() cid: string, @Admin() a: AdminSesion, @Param('id') id: string, @Param('fid') fid: string, @Ip() ip: string) {
    return this.docs.reenviar(await this.panel.cliente(cid), id, fid, ip, `admin:${a.usuario}`);
  }

  @Post(':id/cancelar')
  @HttpCode(200)
  async cancelar(@ClienteId() cid: string, @Admin() a: AdminSesion, @Param('id') id: string, @Body() dto: CancelarDto, @Ip() ip: string) {
    return this.docs.cancelar(await this.panel.cliente(cid), id, dto.motivo, ip, `admin:${a.usuario}`);
  }
}
