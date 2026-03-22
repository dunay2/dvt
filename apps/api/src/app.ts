import type { ISpan } from '@dvt/observability';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';

import { GetRunEventsUseCase } from './application/services/getRunEventsUseCase.js';
import { GetRunStatusUseCase } from './application/services/getRunStatusUseCase.js';
import { ListRunsUseCase } from './application/services/listRunsUseCase.js';
import { SignalRunUseCase } from './application/services/signalRunUseCase.js';
import { registerAdminRoutes } from './entrypoints/http/adminRoutes.js';
import { getRunEventsRoute } from './entrypoints/http/getRunEventsRoute.js';
import { getRunRoute } from './entrypoints/http/getRunRoute.js';
import { listRunsRoute } from './entrypoints/http/listRunsRoute.js';
import { signalRunRoute } from './entrypoints/http/signalRunRoute.js';
import { startRunRoute } from './entrypoints/http/startRunRoute.js';
import { buildProtectedRuntimeModule } from './modules/buildProtectedRuntimeModule.js';
import { registerOperationalHooks } from './modules/registerOperationalHooks.js';
import { loadEnv, type Env } from './plugins/env.js';
import { buildLoggerOptions } from './plugins/logger.js';
import { buildObservability } from './plugins/observability.js';
import { dbReadyRoutes } from './routes/dbReady.js';
import { healthRoutes } from './routes/health.js';
import type { ReconcilerHealthState } from './runtime/reconcilerHealth.js';
import { versionRoutes } from './routes/version.js';

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
      ? { status: 'disabled' }
      : { status: 'starting' };

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

  app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
  });

  app.register(healthRoutes, {
    prefix: '/',
    env,
    getIntentReconcilerHealth: ctx.getIntentReconcilerHealth,
  });
  app.register(versionRoutes, { prefix: '/', env });
  app.register(dbReadyRoutes, { prefix: '/', env });

  app.get('/', async () => ({ service: env.SERVICE_NAME, ok: true }));

  if (env.OIDC_JWKS_URI && env.OIDC_ISSUER && env.OIDC_AUDIENCE) {
    const protectedModule = await buildProtectedRuntimeModule(app, env, observability);
    registerOperationalHooks(app, protectedModule);

    const runtimeAuth = {
      authenticator: protectedModule.authenticator,
      authorizer: protectedModule.authorizer,
    };
    const getRunStatusUseCase = new GetRunStatusUseCase(
      protectedModule.engine,
      protectedModule.stateStore
    );
    const listRunsUseCase = new ListRunsUseCase(protectedModule.stateStore);
    const getRunEventsUseCase = new GetRunEventsUseCase(protectedModule.stateStore);
    const signalRunUseCase = new SignalRunUseCase(
      protectedModule.engine,
      protectedModule.stateStore
    );

    app.post<{ Body: Parameters<typeof startRunRoute>[0]['body'] }>(
      '/runs/start',
      async (request, reply) => startRunRoute(request as never, reply, protectedModule.facade)
    );

    app.get('/runs', async (request, reply) =>
      listRunsRoute(request as never, reply, { ...runtimeAuth, useCase: listRunsUseCase })
    );
    app.get('/runs/:runId', async (request, reply) =>
      getRunRoute(request as never, reply, { ...runtimeAuth, useCase: getRunStatusUseCase })
    );
    app.get('/runs/:runId/events', async (request, reply) =>
      getRunEventsRoute(request as never, reply, { ...runtimeAuth, useCase: getRunEventsUseCase })
    );
    app.post('/runs/:runId/signal', async (request, reply) =>
      signalRunRoute(request as never, reply, { ...runtimeAuth, useCase: signalRunUseCase })
    );

    if (env.DVT_ADMIN_ROUTES_ENABLED) {
      registerAdminRoutes(app, protectedModule.stateStore);
      app.log.warn('admin routes enabled: POST /admin/runs/:runId/rebuild-snapshot');
    }

    app.log.info(
      'protected runtime routes registered: POST /runs/start, GET /runs, GET /runs/:runId, GET /runs/:runId/events, POST /runs/:runId/signal'
    );
  } else {
    app.log.warn(
      'OIDC not configured (OIDC_JWKS_URI, OIDC_ISSUER, OIDC_AUDIENCE) — protected runtime endpoints are disabled'
    );
  }

  return { app, ctx };
}
