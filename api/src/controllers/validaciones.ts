import { Body, Controller, Delete, Get, Header, HttpCode, Param, Post, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ClienteGuard } from '../middlewares/auth';
import { Cliente, Ip, Roles } from '../middlewares/decorators';
import { ClienteAuth } from '../interfaces/auth';
import { CrearValidacionDto, MotivoDto } from '../schemas/validaciones';
import { ValidacionesService } from '../models/validaciones';

@Controller('v1')
@UseGuards(ClienteGuard)
export class ValidacionesController {
  constructor(private svc: ValidacionesService) {}

  @Post('validaciones')
  @Roles('integracion')
  crear(@Cliente() c: ClienteAuth, @Body() dto: CrearValidacionDto, @Ip() ip: string) {
    return this.svc.crear(c, dto, ip);
  }

  @Get('validaciones/:id')
  @Roles('integracion', 'auditor', 'dpo')
  obtener(@Cliente() c: ClienteAuth, @Param('id') id: string, @Ip() ip: string) {
    return this.svc.obtener(c, id, ip);
  }

  @Get('validaciones/:id/evidencia')
  @Roles('auditor')
  @Header('Cache-Control', 'no-store')
  async evidencia(@Cliente() c: ClienteAuth, @Param('id') id: string, @Query() q: MotivoDto, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const zip = await this.svc.evidencia(c, id, q.motivo, ip);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="evidencia-${id}.zip"`);
    return new StreamableFile(zip);
  }

  @Delete('validaciones/:id')
  @Roles('dpo')
  @HttpCode(200)
  borrar(@Cliente() c: ClienteAuth, @Param('id') id: string, @Body() dto: MotivoDto, @Ip() ip: string) {
    return this.svc.borrar(c, id, dto.motivo, ip);
  }

  @Get('titulares/:rut/validaciones')
  @Roles('dpo')
  porRut(@Cliente() c: ClienteAuth, @Param('rut') rut: string, @Ip() ip: string) {
    return this.svc.porRut(c, rut, ip);
  }
}
