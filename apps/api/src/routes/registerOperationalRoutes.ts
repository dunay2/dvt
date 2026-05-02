import type { FastifyInstance } from 'fastify';

import type { Env } from '../plugins/env.js';
import type { ReconcilerHealthState } from '../runtime/reconcilerHealth.js';

import { capabilitiesRoutes } from './capabilities.js';
import { dbReadyRoutes } from './dbReady.js';
import { healthRoutes } from './health.js';
import type { HealthReadinessPorts } from './healthReadinessPorts.js';
import { versionRoutes } from './version.js';

export type RegisterOperationalRoutesOptions = {
  readonly env: Env;
  readonly getIntentReconcilerHealth: () => ReconcilerHealthState;
  readonly readinessPorts: HealthReadinessPorts;
};

export async function registerOperationalRoutes(
  app: FastifyInstance,
  options: RegisterOperationalRoutesOptions
): Promise<void> {
  app.register(healthRoutes, {
    prefix: '/',
    env: options.env,
    getIntentReconcilerHealth: options.getIntentReconcilerHealth,
    readinessPorts: options.readinessPorts,
  });
  app.register(capabilitiesRoutes, { prefix: '/' });
  app.register(versionRoutes, { prefix: '/', env: options.env });
  app.register(dbReadyRoutes, { prefix: '/', env: options.env });

  app.get('/', async () => ({ service: options.env.SERVICE_NAME, ok: true }));
}
