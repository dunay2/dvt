import type { FastifyInstance } from 'fastify';

import type { Env } from '../plugins/env.js';
import type { ReconcilerHealthState } from '../runtime/reconcilerHealth.js';

import {
  HEALTH_ROUTE_PATHS,
  HEALTHZ_RESPONSE_SCHEMA,
  HTTP_STATUS,
  READYZ_RESPONSE_SCHEMA,
} from './healthContract.js';
import {
  resolveOverallHealthStatus,
  toPublicIntentReconcilerHealth,
} from './healthPresenter.js';
import { evaluateReadinessByPorts } from './healthReadinessPolicy.js';
import type { HealthReadinessPorts } from './healthReadinessPorts.js';

type HealthRouteOpts = {
  env: Env;
  getIntentReconcilerHealth: () => ReconcilerHealthState;
  readinessPorts: HealthReadinessPorts;
};

export async function healthRoutes(app: FastifyInstance, opts: HealthRouteOpts): Promise<void> {
  // /healthz - always public: liveness remains `ok: true`; component state is conveyed via `status`.
  app.get(
    HEALTH_ROUTE_PATHS.healthz,
    { schema: { response: { [HTTP_STATUS.ok]: HEALTHZ_RESPONSE_SCHEMA } } },
    async () => {
      const reconciler = opts.getIntentReconcilerHealth();
      const intentReconciler = toPublicIntentReconcilerHealth(reconciler);
      return {
        ok: true,
        status: resolveOverallHealthStatus(reconciler),
        components: {
          intentReconciler,
        },
      };
    }
  );

  // /readyz - deployment-controlled: enabled only via explicit flag.
  if (opts.env.DVT_READYZ_ENABLED) {
    app.get(
      HEALTH_ROUTE_PATHS.readyz,
      {
        schema: {
          response: {
            [HTTP_STATUS.ok]: READYZ_RESPONSE_SCHEMA,
            [HTTP_STATUS.serviceUnavailable]: READYZ_RESPONSE_SCHEMA,
          },
        },
      },
      async (_request, reply) => {
        const readiness = await evaluateReadinessByPorts(
          opts.getIntentReconcilerHealth(),
          opts.readinessPorts
        );
        if (!readiness.ok) {
          return reply.code(HTTP_STATUS.serviceUnavailable).send(readiness);
        }
        return reply.code(HTTP_STATUS.ok).send(readiness);
      }
    );
  }
}
