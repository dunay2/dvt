import type { ISpan } from '@dvt/observability';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import type { Logger } from 'pino';

import { AuthorizeCommandScopeService } from './application/services/authorizeCommandScopeService.js';
import { NotImplementedStartRunUseCase } from './application/services/notImplementedStartRunUseCase.js';
import { StartRunAuthorizedFacade } from './application/services/startRunAuthorizedFacade.js';
import { getPgPool } from './db/pool.js';
import { TenantHierarchyAuthorizationPolicy } from './domain/auth/policy.js';
import { startRunRoute } from './entrypoints/http/startRunRoute.js';
import { StructuredAuditLogger } from './infrastructure/audit/structuredAuditLogger.js';
import { JwksJwtVerifier } from './infrastructure/auth/jwksJwtVerifier.js';
import { OidcAuthenticator } from './infrastructure/auth/oidcAuthenticator.js';
import { PostgresPrincipalAccessRepository } from './infrastructure/auth/postgresPrincipalAccessRepository.js';
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

function requireDatabaseUrlForProtectedRoutes(env: Env): string {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when OIDC-protected runtime routes are enabled');
  }
  return env.DATABASE_URL;
}

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

  app.register(healthRoutes, { prefix: '/', env });
  app.register(versionRoutes, { prefix: '/', env });
  app.register(dbReadyRoutes, { prefix: '/', env });

  app.get('/', async () => ({ service: env.SERVICE_NAME, ok: true }));

  // Protected runtime routes — wired only when OIDC is fully configured
  if (env.OIDC_JWKS_URI && env.OIDC_ISSUER && env.OIDC_AUDIENCE) {
    const pool = getPgPool(requireDatabaseUrlForProtectedRoutes(env));
    const accessRepo = new PostgresPrincipalAccessRepository(pool, env.DVT_PG_SCHEMA);
    const auditLogger = new StructuredAuditLogger(app.log as unknown as Logger);
    const policy = new TenantHierarchyAuthorizationPolicy();
    const authorizer = new AuthorizeCommandScopeService(
      accessRepo,
      policy,
      auditLogger,
      () => new Date()
    );
    const authenticator = new OidcAuthenticator(
      new JwksJwtVerifier({
        jwksUri: env.OIDC_JWKS_URI,
        issuer: env.OIDC_ISSUER,
        audience: env.OIDC_AUDIENCE,
        algorithms: env.OIDC_ALGORITHMS.split(',').map((a) => a.trim()),
      })
    );
    const facade = new StartRunAuthorizedFacade(
      authenticator,
      authorizer,
      new NotImplementedStartRunUseCase()
    );

    app.addHook('onReady', async () => {
      await accessRepo.migrate();
    });

    app.post<{ Body: Parameters<typeof startRunRoute>[0]['body'] }>(
      '/runs/start',
      async (request, reply) => startRunRoute(request as never, reply, facade)
    );

    app.log.info('protected runtime routes registered: POST /runs/start');
  } else {
    app.log.warn(
      'OIDC not configured (OIDC_JWKS_URI, OIDC_ISSUER, OIDC_AUDIENCE) — protected runtime endpoints are disabled'
    );
  }

  return { app, ctx };
}
