import type { FastifyInstance } from 'fastify';

import type { Env } from '../plugins/env.js';

export async function healthRoutes(app: FastifyInstance, opts: { env: Env }): Promise<void> {
  // /healthz — always public: safe for external liveness probing
  app.get('/healthz', async () => ({ ok: true }));

  // /readyz — deployment-controlled: enabled only via explicit flag
  if (opts.env.DVT_READYZ_ENABLED) {
    app.get('/readyz', async () => ({ ok: true }));
  }
}
