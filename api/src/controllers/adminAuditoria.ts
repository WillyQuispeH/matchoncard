import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../middlewares/adminAuth';
import { ListaAuditoriaDto } from '../schemas/admin';
import { AdminAuditoriaService } from '../models/adminAuditoria';
import { AdminEstadoService } from '../models/adminEstado';

@Controller('admin/api')
@UseGuards(AdminGuard)
export class AdminAuditoriaController {
  constructor(private auditoria: AdminAuditoriaService, private estado: AdminEstadoService) {}

  @Get('auditoria')
  listar(@Query() q: ListaAuditoriaDto) { return this.auditoria.listar(q); }

  @Get('auditoria/acciones')
  acciones() { return this.auditoria.acciones(); }

  @Get('estado')
  estadoSistema() { return this.estado.estado(); }
}
