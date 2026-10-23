import { Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../middlewares/adminAuth';
import { Admin, Ip } from '../middlewares/decorators';
import { AdminSesion } from '../interfaces/auth';
import { ListaWebhooksDto } from '../schemas/admin';
import { AdminWebhooksService } from '../models/adminWebhooks';

@Controller('admin/api/webhooks')
@UseGuards(AdminGuard)
export class AdminWebhooksController {
  constructor(private svc: AdminWebhooksService) {}

  @Get()
  listar(@Query() q: ListaWebhooksDto) { return this.svc.listar(q); }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) { return this.svc.detalle(id); }

  @Post(':id/reintentar')
  @HttpCode(200)
  reintentar(@Admin() a: AdminSesion, @Param('id', ParseIntPipe) id: number, @Ip() ip: string) { return this.svc.reintentar(id, `admin:${a.usuario}`, ip); }

  @Post(':id/descartar')
  @HttpCode(200)
  descartar(@Admin() a: AdminSesion, @Param('id', ParseIntPipe) id: number, @Ip() ip: string) { return this.svc.descartar(id, `admin:${a.usuario}`, ip); }
}
