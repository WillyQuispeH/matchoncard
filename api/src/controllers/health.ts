import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DbService } from '../utils/database';
import { PING } from '../queries/health';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private db: DbService) {}
  @Get()
  async salud() {
    try { await this.db.q(PING); } catch { throw new ServiceUnavailableException({ ok: false, db: false }); }
    return { ok: true, db: true, version: process.env.npm_package_version || '0.1.0' };
  }
}
