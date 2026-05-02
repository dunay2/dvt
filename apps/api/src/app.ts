import type { ISpan } from '@dvt/observability';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';

import { registerProtectedRuntimeRoutes } from './entrypoints/http/registerProtectedRuntimeRoutes.js';
import { buildProtectedRuntimeModule } from './modules/buildProtectedRuntimeModule.js';
import { registerOperationalHooks } from './modules/registerOperationalHooks.js';
import { loadEnv, type Env } from './plugins/env.js';
import { buildLoggerOptions } from './plugins/logger.js';
import { buildObservability } from './plugins/observability.js';
import {
  createHealthReadinessPorts,
  HEALTH_READINESS_EVENTS,
  READINESS_PROBE_STATUS,
  type ReadinessProbeStatus,
} from './routes/healthReadinessPorts.js';
import { registerOperationalRoutes } from './routes/registerOperationalRoutes.js';
import {
  RECONCILER_HEALTH_STATUS,
  type ReconcilerHealthState,
} from './runtime/reconcilerHealth.js';

export type AppContext = {
  env: Env;
  observability: ReturnType<typeof buildObservability>;
  setIntentReconcilerHealth: (health: ReconcilerHealthState) => void;
  getIntentReconcilerHealth: () => ReconcilerHealthState;
};

const REQUEST_SPAN = Symbol('requestSpan');

type RequestWithSpan = FastifyRequest & {
  [REQUEST_SPAN]?: ISpan;
};

export async function buildApp(): Promise<{ app: FastifyInstance; ctx: AppContext }> {
  const env = loadEnv(process.env);
  const observability = buildObservability(env);
  let intentReconcilerHealth: ReconcilerHealthState =
    !env.DVT_INTENT_RECONCILER_ENABLED || !env.DATABASE_URL
      ? { status: RECONCILER_HEALTH_STATUS.disabled }
      : { status: RECONCILER_HEALTH_STATUS.starting };

  const app = Fastify({
    logger: buildLoggerOptions(env),
    ajv: {
      customOptions: {
        coerceTypes: 'array',
        removeAdditional: 'all',
      },
    },
  });

  const ctx: AppContext = {
    env,
    observability,
    setIntentReconcilerHealth: (health) => {
      intentReconcilerHealth = health;
    },
    getIntentReconcilerHealth: () => intentReconcilerHealth,
  };

  let runtimeAdaptersReadyProbe: () => ReadinessProbeStatus = () =>
    READINESS_PROBE_STATUS.notConfigured;
  const readinessPorts = createHealthReadinessPorts({
    databaseUrl: env.DATABASE_URL,
    checkRuntimeAdaptersReady: () => runtimeAdaptersReadyProbe(),
    onDatabaseProbeFailure: (error) => {
      app.log.warn({ event: HEALTH_READINESS_EVENTS.databaseProbeFailed, err: error });
    },
  });

  app.addHook('onRequest', async (request) => {
    const span = observability.traces.startSpan('api.request', {
      attributes: {
        method: request.method,
        route: request.routeOptions.url ?? 'unknown',
      },
    });
    (request as RequestWithSpan)[REQUEST_SPAN] = span;
    observability.logs.info({
      msg: 'API request started',
      attributes: {
        method: request.method,
        url: request.url,
        requestId: request.id,
      },
    });
  });

  app.addHook('onResponse', async (request, reply) => {
    const span = (request as RequestWithSpan)[REQUEST_SPAN];
    if (!span) return;
    span.setStatus(reply.statusCode >= 500 ? 'error' : 'ok');
    span.end();
    observability.logs.info({
      msg: 'API request completed',
      attributes: {
        method: request.method,
        url: request.url,
        requestId: request.id,
        statusCode: String(reply.statusCode),
      },
    });
  });

  app.addHook('onError', async (request, _reply, error) => {
    const span = (request as RequestWithSpan)[REQUEST_SPAN];
    if (span) {
      span.recordException(error);
      span.setStatus('error', error.message);
      span.end();
    }
    observability.logs.error({
      msg: 'API request failed',
      err: error,
      attributes: {
        method: request.method,
        url: request.url,
        requestId: request.id,
      },
    });
  });

  app.register(helmet);
  app.register(sensible);
  await app.register(rateLimit, {
    global: false,
    max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
    timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
  });

  app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'OPTIONS'],
  });

  await registerOperationalRoutes(app, {
    env,
    getIntentReconcilerHealth: ctx.getIntentReconcilerHealth,
    readinessPorts,
  });

  if (env.OIDC_JWKS_URI && env.OIDC_ISSUER && env.OIDC_AUDIENCE) {
    const protectedModule = await buildProtectedRuntimeModule(app, env, observability);
    runtimeAdaptersReadyProbe = () => {
      return protectedModule.adapters.has('temporal')
        ? READINESS_PROBE_STATUS.ready
        : READINESS_PROBE_STATUS.unavailable;
    };
    registerOperationalHooks(app, protectedModule);

    await registerProtectedRuntimeRoutes(app, {
      env,
      observability,
      protectedModule,
    });
  } else {
    app.log.warn(
      'OIDC not configured (OIDC_JWKS_URI, OIDC_ISSUER, OIDC_AUDIENCE) — protected runtime endpoints are disabled'
    );
  }

  return { app, ctx };
}
