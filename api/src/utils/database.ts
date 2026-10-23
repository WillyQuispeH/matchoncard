import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { conexionDb } from './conexion-db';

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool = new Pool({ ...conexionDb(), max: 10 });

  async q<T extends QueryResultRow = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const r = await this.pool.query<T>(sql, params);
    return r.rows;
  }
  async uno<T extends QueryResultRow = any>(sql: string, params: unknown[] = []): Promise<T | null> {
    const r = await this.q<T>(sql, params);
    return r[0] ?? null;
  }
  async tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query('begin');
      const r = await fn(c);
      await c.query('commit');
      return r;
    } catch (e) {
      await c.query('rollback');
      throw e;
    } finally {
      c.release();
    }
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
