import type { FastifyInstance } from 'fastify';

import type { Env } from '../plugins/env.js';

export async function versionRoutes(app: FastifyInstance, opts: { env: Env }): Promise<void> {
  // /version — deployment-controlled: enabled only via explicit flag
  if (opts.env.DVT_VERSION_ENABLED) {
    app.get('/version', async () => ({
      name: opts.env.SERVICE_NAME,
      version: '0.1.0',
    }));
  }
}
