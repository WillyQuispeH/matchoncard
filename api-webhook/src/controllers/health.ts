import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  salud() {
    return { ok: true, version: process.env.npm_package_version || '1.0.0' };
  }
}
