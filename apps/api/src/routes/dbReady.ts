import type { FastifyInstance } from 'fastify';

import { getPgPool } from '../db/pool.js';
import type { Env } from '../plugins/env.js';

export async function dbReadyRoutes(app: FastifyInstance, opts: { env: Env }): Promise<void> {
  app.get('/db/ready', async (_req, reply) => {
    const cs = opts.env.DATABASE_URL;

    if (!cs) {
      reply.code(503);
      return { ok: false, reason: 'DATABASE_URL not set' };
    }

    const pool = getPgPool(cs);

    try {
      const result = await pool.query('SELECT 1 as ok');
      const ok = result.rows?.[0]?.ok === 1;
      return { ok };
    } catch (err) {
      app.log.warn({ err }, 'db/ready failed');
      reply.code(503);
      return { ok: false };
    }
  });
}
