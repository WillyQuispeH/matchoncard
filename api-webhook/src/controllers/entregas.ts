import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { EmisorService } from '../models/emisor';
import { Entrega } from '../interfaces/webhook';

// Solo la llama la API por la red interna de Docker
@Controller('entregar')
export class EntregasController {
  constructor(private emisor: EmisorService) {}

  @Post()
  @HttpCode(200)
  entregar(@Body() e: Entrega) {
    return this.emisor.entregar(e);
  }
}
