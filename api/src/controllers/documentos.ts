import { Body, Controller, Delete, Get, Header, HttpCode, Param, Post, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ClienteGuard } from '../middlewares/auth';
import { Cliente, Ip, Roles } from '../middlewares/decorators';
import { ClienteAuth } from '../interfaces/auth';
import { nombreArchivo } from '../utils/archivos';
import { MotivoDto } from '../schemas/validaciones';
import { CancelarDto, CrearDocumentoDto } from '../schemas/documentos';
import { DocumentosService } from '../models/documentos';

@Controller('v1/documentos')
@UseGuards(ClienteGuard)
export class DocumentosController {
  constructor(private svc: DocumentosService) {}

  @Post()
  @Roles('integracion')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  crear(@Cliente() c: ClienteAuth, @Body() dto: CrearDocumentoDto, @Ip() ip: string) {
    return this.svc.crear(c, dto, ip);
  }

  @Get()
  @Roles('integracion', 'auditor')
  listar(@Cliente() c: ClienteAuth) {
    return this.svc.listar(c);
  }

  @Get(':id')
  @Roles('integracion', 'auditor', 'dpo')
  obtener(@Cliente() c: ClienteAuth, @Param('id') id: string) {
    return this.svc.vista(c, id);
  }

  @Get(':id/pdf')
  @Roles('integracion', 'auditor')
  @Header('Cache-Control', 'no-store')
  async pdf(@Cliente() c: ClienteAuth, @Param('id') id: string, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const d = await this.svc.pdf(c, id, ip);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo(d.nombre, d.version, d.estado)}"`);
    res.setHeader('X-Documento-Version', String(d.version));
    res.setHeader('X-Documento-Sha256', d.sha256);
    return new StreamableFile(d.pdf);
  }

  @Post(':id/firmantes/:fid/enlace')
  @Roles('integracion')
  @HttpCode(200)
  reenviar(@Cliente() c: ClienteAuth, @Param('id') id: string, @Param('fid') fid: string, @Ip() ip: string) {
    return this.svc.reenviar(c, id, fid, ip);
  }

  @Post(':id/cancelar')
  @Roles('integracion')
  @HttpCode(200)
  cancelar(@Cliente() c: ClienteAuth, @Param('id') id: string, @Body() dto: CancelarDto, @Ip() ip: string) {
    return this.svc.cancelar(c, id, dto.motivo, ip);
  }

  @Delete(':id')
  @Roles('dpo')
  @HttpCode(200)
  suprimir(@Cliente() c: ClienteAuth, @Param('id') id: string, @Body() dto: MotivoDto, @Ip() ip: string) {
    return this.svc.suprimir(c, id, dto.motivo, ip);
  }
}
