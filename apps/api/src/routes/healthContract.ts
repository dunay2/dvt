import { HTTP_STATUS_CODE } from './httpStatus.js';

export const OVERALL_HEALTH_STATUS = Object.freeze({
  healthy: 'healthy',
  degraded: 'degraded',
} as const);

export const OVERALL_HEALTH_STATUS_VALUES = Object.freeze([
  OVERALL_HEALTH_STATUS.healthy,
  OVERALL_HEALTH_STATUS.degraded,
] as const);

export const RECONCILER_HEALTH_STATUS = Object.freeze({
  starting: 'starting',
  healthy: 'healthy',
  disabled: 'disabled',
  degraded: 'degraded',
} as const);

export const NON_DEGRADED_RECONCILER_STATUS_VALUES = Object.freeze([
  RECONCILER_HEALTH_STATUS.starting,
  RECONCILER_HEALTH_STATUS.healthy,
  RECONCILER_HEALTH_STATUS.disabled,
] as const);

export const RECONCILER_HEALTH_REASON_CODE = Object.freeze({
  bootstrapFailed: 'bootstrap_failed',
  runtimeUnavailable: 'runtime_unavailable',
} as const);

export const RECONCILER_HEALTH_REASON_CODE_VALUES = Object.freeze([
  RECONCILER_HEALTH_REASON_CODE.bootstrapFailed,
  RECONCILER_HEALTH_REASON_CODE.runtimeUnavailable,
] as const);

export const READINESS_STATUS = Object.freeze({
  ready: 'ready',
  notReady: 'not_ready',
} as const);

export const READINESS_REASON_CODE = Object.freeze({
  reconcilerStarting: 'reconciler_starting',
  reconcilerDegraded: 'reconciler_degraded',
  databaseUnavailable: 'database_unavailable',
  adapterUnavailable: 'adapter_unavailable',
} as const);

export const READINESS_REASON_CODE_VALUES = Object.freeze([
  READINESS_REASON_CODE.reconcilerStarting,
  READINESS_REASON_CODE.reconcilerDegraded,
  READINESS_REASON_CODE.databaseUnavailable,
  READINESS_REASON_CODE.adapterUnavailable,
] as const);

export type ReadinessPayload =
  | {
      ok: true;
      status: typeof READINESS_STATUS.ready;
    }
  | {
      ok: false;
      status: typeof READINESS_STATUS.notReady;
      reasonCode: (typeof READINESS_REASON_CODE_VALUES)[number];
    };

export const HEALTH_ROUTE_PATHS = Object.freeze({
  healthz: '/healthz',
  readyz: '/readyz',
} as const);

export const HTTP_STATUS = HTTP_STATUS_CODE;

export const HEALTHZ_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'status', 'components'],
  properties: {
    ok: { type: 'boolean', const: true },
    status: { type: 'string', enum: OVERALL_HEALTH_STATUS_VALUES },
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
                status: { type: 'string', enum: NON_DEGRADED_RECONCILER_STATUS_VALUES },
              },
            },
            {
              type: 'object',
              additionalProperties: false,
              required: ['status', 'reasonCode'],
              properties: {
                status: { type: 'string', const: RECONCILER_HEALTH_STATUS.degraded },
                reasonCode: { type: 'string', enum: RECONCILER_HEALTH_REASON_CODE_VALUES },
              },
            },
          ],
        },
      },
    },
  },
} as const;

export const READYZ_RESPONSE_SCHEMA = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['ok', 'status'],
      properties: {
        ok: { type: 'boolean', const: true },
        status: { type: 'string', const: READINESS_STATUS.ready },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['ok', 'status', 'reasonCode'],
      properties: {
        ok: { type: 'boolean', const: false },
        status: { type: 'string', const: READINESS_STATUS.notReady },
        reasonCode: { type: 'string', enum: READINESS_REASON_CODE_VALUES },
      },
    },
  ],
} as const;
