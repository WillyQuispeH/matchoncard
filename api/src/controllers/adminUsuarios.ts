import { Body, Controller, ForbiddenException, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard, SuperadminGuard } from '../middlewares/adminAuth';
import { Admin, Ip } from '../middlewares/decorators';
import { AdminSesion } from '../interfaces/auth';
import { ActualizarUsuarioDto, ClaveDto, CrearUsuarioDto } from '../schemas/admin';
import { AdminUsuariosService } from '../models/adminUsuarios';

// Usuarios de app-admin: solo superadmin. Cada usuario puede cambiar su propia clave.
@Controller('admin/api/usuarios')
@UseGuards(AdminGuard)
export class AdminUsuariosController {
  constructor(private svc: AdminUsuariosService) {}

  @Get()
  @UseGuards(SuperadminGuard)
  listar() { return this.svc.listar(); }

  @Post()
  @UseGuards(SuperadminGuard)
  crear(@Admin() a: AdminSesion, @Body() dto: CrearUsuarioDto, @Ip() ip: string) { return this.svc.crear(dto, a, ip); }

  @Patch(':usuario')
  @UseGuards(SuperadminGuard)
  actualizar(@Admin() a: AdminSesion, @Param('usuario') u: string, @Body() dto: ActualizarUsuarioDto, @Ip() ip: string) { return this.svc.actualizar(u, dto, a, ip); }

  @Post(':usuario/desbloquear')
  @HttpCode(200)
  @UseGuards(SuperadminGuard)
  desbloquear(@Admin() a: AdminSesion, @Param('usuario') u: string, @Ip() ip: string) { return this.svc.desbloquear(u, a, ip); }

  // la propia clave la puede cambiar cualquiera; la de otro, solo un superadmin
  @Post(':usuario/clave')
  @HttpCode(200)
  async clave(@Admin() a: AdminSesion, @Param('usuario') u: string, @Body() dto: ClaveDto, @Ip() ip: string) {
    if (u !== a.usuario && a.rol !== 'superadmin') throw new ForbiddenException('Solo un superadmin puede cambiar la clave de otro usuario');
    return this.svc.cambiarClave(u, dto.clave, a, ip);
  }
}
