import { Module } from '@nestjs/common';
import { EmisorService } from './models/emisor';
import { HealthController } from './controllers/health';
import { EntregasController } from './controllers/entregas';

@Module({
  controllers: [HealthController, EntregasController],
  providers: [EmisorService],
})
export class AppModule {}
