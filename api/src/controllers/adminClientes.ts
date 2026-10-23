import { Body, Controller, Get, Header, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard, SuperadminGuard } from '../middlewares/adminAuth';
import { Admin, Ip } from '../middlewares/decorators';
import { AdminSesion } from '../interfaces/auth';
import { ActualizarClienteDto, CrearClienteDto, RotarSecretoDto } from '../schemas/admin';
import { AdminClientesService } from '../models/adminClientes';

// Listar: cualquier usuario (lo usa el selector de cliente). Crear, editar y rotar: solo superadmin.
@Controller('admin/api/clientes')
@UseGuards(AdminGuard)
export class AdminClientesController {
  constructor(private svc: AdminClientesService) {}

  @Get()
  listar() { return this.svc.listar(); }

  @Post()
  @UseGuards(SuperadminGuard)
  @Header('Cache-Control', 'no-store')
  crear(@Admin() a: AdminSesion, @Body() dto: CrearClienteDto, @Ip() ip: string) {
    return this.svc.crear(dto, `admin:${a.usuario}`, ip);
  }

  @Patch(':id')
  @UseGuards(SuperadminGuard)
  actualizar(@Admin() a: AdminSesion, @Param('id') id: string, @Body() dto: ActualizarClienteDto, @Ip() ip: string) {
    return this.svc.actualizar(id, dto, `admin:${a.usuario}`, ip);
  }

  @Post(':id/rotar')
  @HttpCode(200)
  @UseGuards(SuperadminGuard)
  @Header('Cache-Control', 'no-store')
  rotar(@Admin() a: AdminSesion, @Param('id') id: string, @Body() dto: RotarSecretoDto, @Ip() ip: string) {
    return this.svc.rotar(id, dto.secreto, dto.motivo, `admin:${a.usuario}`, ip);
  }
}
