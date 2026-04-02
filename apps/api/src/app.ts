import type { ISpan } from '@dvt/observability';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';

import { CancelRunUseCase } from './application/services/cancelRunUseCase.js';
import { GetRunEventsUseCase } from './application/services/getRunEventsUseCase.js';
import { GetRunStatusUseCase } from './application/services/getRunStatusUseCase.js';
import { ListRunsUseCase } from './application/services/listRunsUseCase.js';
import { SignalRunUseCase } from './application/services/signalRunUseCase.js';
import { registerAdminRoutes } from './entrypoints/http/adminRoutes.js';
import { cancelRunRoute } from './entrypoints/http/cancelRunRoute.js';
import { getRunEventsRoute } from './entrypoints/http/getRunEventsRoute.js';
import { getRunRoute } from './entrypoints/http/getRunRoute.js';
import { listRunsRoute } from './entrypoints/http/listRunsRoute.js';
import {
  PROTECTED_RUNTIME_ROUTE_SUMMARY,
  RUNTIME_ROUTE_PATH,
} from './entrypoints/http/runtimeRoutes.constants.js';
import { signalRunRoute } from './entrypoints/http/signalRunRoute.js';
import { startRunRoute } from './entrypoints/http/startRunRoute.js';
import { ObservabilityRunStatusStalenessTelemetry } from './infrastructure/telemetry/ObservabilityRunStatusStalenessTelemetry.js';
import { SafeRunSnapshotStalenessReader } from './infrastructure/telemetry/SafeRunSnapshotStalenessReader.js';
import { buildProtectedRuntimeModule } from './modules/buildProtectedRuntimeModule.js';
import { registerOperationalHooks } from './modules/registerOperationalHooks.js';
import { loadEnv, type Env } from './plugins/env.js';
import { buildLoggerOptions } from './plugins/logger.js';
import { buildObservability } from './plugins/observability.js';
import { dbReadyRoutes } from './routes/dbReady.js';
import { healthRoutes } from './routes/health.js';
import {
  createHealthReadinessPorts,
  HEALTH_READINESS_EVENTS,
  READINESS_PROBE_STATUS,
  type ReadinessProbeStatus,
} from './routes/healthReadinessPorts.js';
import { versionRoutes } from './routes/version.js';
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

  app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
  });

  app.register(healthRoutes, {
    prefix: '/',
    env,
    getIntentReconcilerHealth: ctx.getIntentReconcilerHealth,
    readinessPorts,
  });
  app.register(versionRoutes, { prefix: '/', env });
  app.register(dbReadyRoutes, { prefix: '/', env });

  app.get('/', async () => ({ service: env.SERVICE_NAME, ok: true }));

  if (env.OIDC_JWKS_URI && env.OIDC_ISSUER && env.OIDC_AUDIENCE) {
    const protectedModule = await buildProtectedRuntimeModule(app, env, observability);
    runtimeAdaptersReadyProbe = () => {
      if (env.TEMPORAL_ADDRESS) {
        return protectedModule.adapters.has('temporal')
          ? READINESS_PROBE_STATUS.ready
          : READINESS_PROBE_STATUS.unavailable;
      }
      return protectedModule.adapters.size > 0
        ? READINESS_PROBE_STATUS.ready
        : READINESS_PROBE_STATUS.unavailable;
    };
    registerOperationalHooks(app, protectedModule);

    const runtimeAuth = {
      authenticator: protectedModule.authenticator,
      authorizer: protectedModule.authorizer,
    };
    const getRunStatusUseCase = new GetRunStatusUseCase(
      protectedModule.engine,
      protectedModule.stateStore.read,
      new SafeRunSnapshotStalenessReader(
        protectedModule.stateStore.snapshotStaleness,
        observability
      ),
      new ObservabilityRunStatusStalenessTelemetry({ observability })
    );
    const listRunsUseCase = new ListRunsUseCase(protectedModule.stateStore.read);
    const getRunEventsUseCase = new GetRunEventsUseCase(protectedModule.stateStore.read);
    const signalRunUseCase = new SignalRunUseCase(
      protectedModule.engine,
      protectedModule.stateStore.read
    );
    const cancelRunUseCase = new CancelRunUseCase(signalRunUseCase);

    app.post<{ Body: Parameters<typeof startRunRoute>[0]['body'] }>(
      RUNTIME_ROUTE_PATH.start,
      async (request, reply) =>
        startRunRoute(
          request as never,
          reply,
          protectedModule.facade,
          protectedModule.startRunTargetAdapterRegistry
        )
    );

    app.get(RUNTIME_ROUTE_PATH.list, async (request, reply) =>
      listRunsRoute(request as never, reply, { ...runtimeAuth, useCase: listRunsUseCase })
    );
    app.get(RUNTIME_ROUTE_PATH.get, async (request, reply) =>
      getRunRoute(request as never, reply, { ...runtimeAuth, useCase: getRunStatusUseCase })
    );
    app.get(RUNTIME_ROUTE_PATH.events, async (request, reply) =>
      getRunEventsRoute(request as never, reply, { ...runtimeAuth, useCase: getRunEventsUseCase })
    );
    app.post(RUNTIME_ROUTE_PATH.signal, async (request, reply) =>
      signalRunRoute(request as never, reply, {
        ...runtimeAuth,
        useCase: signalRunUseCase,
        compatibilityPolicy: { allowCancelSignalType: env.DVT_SIGNAL_ROUTE_ALLOW_CANCEL },
      })
    );
    app.post(RUNTIME_ROUTE_PATH.cancel, async (request, reply) =>
      cancelRunRoute(request as never, reply, { ...runtimeAuth, useCase: cancelRunUseCase })
    );

    if (env.DVT_ADMIN_ROUTES_ENABLED) {
      registerAdminRoutes(app, protectedModule.stateStore.maintenance);
      app.log.warn('admin routes enabled: POST /admin/runs/:runId/rebuild-snapshot');
    }

    app.log.info(`protected runtime routes registered: ${PROTECTED_RUNTIME_ROUTE_SUMMARY}`);
  } else {
    app.log.warn(
      'OIDC not configured (OIDC_JWKS_URI, OIDC_ISSUER, OIDC_AUDIENCE) — protected runtime endpoints are disabled'
    );
  }

  return { app, ctx };
}
