/**
 * Owned concern: connect protected-runtime lifecycle transitions to Fastify.
 * This module owns `migrate()` on startup and `close()` on shutdown.
 */
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from './types.js';

export function registerOperationalHooks(
  app: FastifyInstance,
  module: ProtectedRuntimeModule
): void {
  app.addHook('onReady', async () => {
    await module.migrate();
  });

  app.addHook('onClose', async () => {
    await module.close();
  });
}
