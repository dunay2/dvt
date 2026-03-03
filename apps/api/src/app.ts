import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import type { ISpan } from '@dvt/observability';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';

import { loadEnv, type Env } from './plugins/env.js';
import { buildLoggerOptions } from './plugins/logger.js';
import { buildObservability } from './plugins/observability.js';
import { dbReadyRoutes } from './routes/dbReady.js';
import { healthRoutes } from './routes/health.js';
import { versionRoutes } from './routes/version.js';

export type AppContext = {
  env: Env;
  observability: ReturnType<typeof buildObservability>;
};

const REQUEST_SPAN = Symbol('requestSpan');

type RequestWithSpan = FastifyRequest & {
  [REQUEST_SPAN]?: ISpan;
};

export function buildApp(): { app: FastifyInstance; ctx: AppContext } {
  const env = loadEnv(process.env);
  const observability = buildObservability(env);

  const app = Fastify({
    logger: buildLoggerOptions(env),
    ajv: {
      customOptions: {
        coerceTypes: 'array',
        removeAdditional: 'all',
      },
    },
  });

  const ctx: AppContext = { env, observability };

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

  app.register(healthRoutes, { prefix: '/' });
  app.register(versionRoutes, { prefix: '/' });
  app.register(dbReadyRoutes, { prefix: '/', env });

  app.get('/', async () => ({ service: env.SERVICE_NAME, ok: true }));

  return { app, ctx };
}
