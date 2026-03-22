import type { FastifyInstance } from 'fastify';

import type { Env } from '../plugins/env.js';
import type {
  ReconcilerHealthReasonCode,
  ReconcilerHealthState,
  ReconcilerHealthStatus,
} from '../runtime/reconcilerHealth.js';

type HealthRouteOpts = {
  env: Env;
  getIntentReconcilerHealth: () => ReconcilerHealthState;
};

function resolveOverallHealthStatus(reconciler: ReconcilerHealthState): 'healthy' | 'degraded' {
  return reconciler.status === 'degraded' ? 'degraded' : 'healthy';
}

function toPublicIntentReconcilerHealth(reconciler: ReconcilerHealthState): {
  status: ReconcilerHealthStatus;
  reasonCode?: ReconcilerHealthReasonCode;
} {
  if (reconciler.status !== 'degraded') {
    return { status: reconciler.status };
  }
  return {
    status: 'degraded',
    reasonCode: reconciler.reasonCode ?? 'runtime_unavailable',
  };
}

const HEALTHZ_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'status', 'components'],
  properties: {
    ok: { type: 'boolean', const: true },
    status: { type: 'string', enum: ['healthy', 'degraded'] },
    components: {
      type: 'object',
      additionalProperties: false,
      required: ['intentReconciler'],
      properties: {
        intentReconciler: {
          oneOf: [
            {
              type: 'object',
              additionalProperties: false,
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['starting', 'healthy', 'disabled'] },
              },
            },
            {
              type: 'object',
              additionalProperties: false,
              required: ['status', 'reasonCode'],
              properties: {
                status: { type: 'string', const: 'degraded' },
                reasonCode: {
                  type: 'string',
                  enum: ['bootstrap_failed', 'runtime_unavailable'],
                },
              },
            },
          ],
        },
      },
    },
  },
} as const;

export async function healthRoutes(app: FastifyInstance, opts: HealthRouteOpts): Promise<void> {
  // /healthz - always public: liveness remains `ok: true`; component state is conveyed via `status`.
  app.get('/healthz', { schema: { response: { 200: HEALTHZ_RESPONSE_SCHEMA } } }, async () => {
    const reconciler = opts.getIntentReconcilerHealth();
    const intentReconciler = toPublicIntentReconcilerHealth(reconciler);
    return {
      ok: true,
      status: resolveOverallHealthStatus(reconciler),
      components: {
        intentReconciler,
      },
    };
  });

  // /readyz - deployment-controlled: enabled only via explicit flag.
  if (opts.env.DVT_READYZ_ENABLED) {
    app.get('/readyz', async () => ({ ok: true }));
  }
}
