import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
// utils
import { DbService } from './utils/database';
import { CriptoService } from './utils/cripto';
import { AlmacenService } from './utils/almacen';
import { FirmadorClient } from './utils/firmador';
import { EmisorWebhooksClient } from './utils/emisorWebhooks';
// middlewares
import { ClienteGuard, SesionGuard } from './middlewares/auth';
import { AdminGuard, SuperadminGuard } from './middlewares/adminAuth';
// models
import { AuditoriaService } from './models/auditoria';
import { WebhooksService } from './models/webhooks';
import { ValidacionesService } from './models/validaciones';
import { CapturaService } from './models/captura';
import { DocumentosService } from './models/documentos';
import { PanelService } from './models/panel';
import { OperacionService } from './models/operacion';
import { InformeService } from './models/informe';
import { RetencionService } from './models/retencion';
import { AdminClientesService } from './models/adminClientes';
import { AdminUsuariosService } from './models/adminUsuarios';
import { AdminWebhooksService } from './models/adminWebhooks';
import { AdminAuditoriaService } from './models/adminAuditoria';
import { AdminEstadoService } from './models/adminEstado';
// controllers
import { HealthController } from './controllers/health';
import { ValidacionesController } from './controllers/validaciones';
import { CapturaController } from './controllers/captura';
import { DocumentosController } from './controllers/documentos';
import { VerificarController } from './controllers/verificar';
import { AdminSesionController } from './controllers/adminSesion';
import { AdminValidacionesController } from './controllers/adminValidaciones';
import { AdminDocumentosController } from './controllers/adminDocumentos';
import { AdminClientesController } from './controllers/adminClientes';
import { AdminUsuariosController } from './controllers/adminUsuarios';
import { AdminWebhooksController } from './controllers/adminWebhooks';
import { AdminAuditoriaController } from './controllers/adminAuditoria';

@Module({
  imports: [
    ...(process.env.DISABLE_SCHEDULER === 'true' ? [] : [ScheduleModule.forRoot()]),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
  ],
  controllers: [
    HealthController, ValidacionesController, CapturaController, DocumentosController, VerificarController,
    AdminSesionController, AdminValidacionesController, AdminDocumentosController, AdminClientesController,
    AdminUsuariosController, AdminWebhooksController, AdminAuditoriaController,
  ],
  providers: [
    DbService, CriptoService, AlmacenService, FirmadorClient, EmisorWebhooksClient,
    ClienteGuard, SesionGuard, AdminGuard, SuperadminGuard,
    AuditoriaService, WebhooksService, ValidacionesService, CapturaService, DocumentosService,
    PanelService, OperacionService, InformeService, RetencionService,
    AdminClientesService, AdminUsuariosService, AdminWebhooksService, AdminAuditoriaService, AdminEstadoService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }
