/**
 * Owned concern: local protected-runtime auth bootstrap for the coordinated dev stack.
 */
const { Client } = require('pg');
const { createServer } = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DEFAULT_DEV_ISSUER = 'https://issuer.local.dvt/';
const DEFAULT_DEV_AUDIENCE = 'dvt-api';
const DEFAULT_DEV_PRINCIPAL_ID = 'principal-dev-local';
const DEFAULT_TENANT_ID = 'tenant';
const DEFAULT_PROJECT_ID = 'project';
const DEFAULT_ENVIRONMENT_ID = 'dev';
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_JWK_KID = 'dev-stack-local-key';
const DEFAULT_DEV_BEARER_TOKEN_TTL_SECONDS = 24 * 60 * 60;
const LOCAL_TOKEN_REFRESH_PATH = '/__dvt/local-protected-runtime/token';

const LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS = Object.freeze([
  'project:create',
  'run:start',
  'run:list',
  'run:view',
  'run:logs:view',
  'run:signal',
  'run:cancel',
  'run:retry',
  'workspace:graph-draft:view',
  'workspace:graph-draft:save',
  'workspace:files:view',
  'workspace:files:save',
  'workspace:diff:view',
  'workspace:plugins:view',
  'workspace:source-import:view',
  'workspace:source-connection:create',
  'workspace:source-connection:rename',
  'workspace:source-connection:test',
  'workspace:source-import:import',
  'workspace:source-import:rebind',
]);

let joseModulePromise;

function readNonEmptyEnv(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function resolveDevBearerTokenTtlSeconds(env = process.env) {
  const configuredTtl = readNonEmptyEnv(env.DVT_DEV_PROTECTED_RUNTIME_TOKEN_TTL_SECONDS);
  if (configuredTtl === undefined) {
    return DEFAULT_DEV_BEARER_TOKEN_TTL_SECONDS;
  }

  const parsedTtl = Number.parseInt(configuredTtl, 10);
  if (!Number.isInteger(parsedTtl) || parsedTtl <= 0) {
    throw new Error(
      'DVT_DEV_PROTECTED_RUNTIME_TOKEN_TTL_SECONDS must be a positive integer when provided'
    );
  }

  return parsedTtl;
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function resolveDevWorkspaceScope(env = process.env) {
  return {
    tenantId: readNonEmptyEnv(env.VITE_DEFAULT_TENANT_ID) ?? DEFAULT_TENANT_ID,
    projectId: readNonEmptyEnv(env.VITE_DEFAULT_PROJECT_ID) ?? DEFAULT_PROJECT_ID,
    environmentId: readNonEmptyEnv(env.VITE_DEFAULT_ENVIRONMENT_ID) ?? DEFAULT_ENVIRONMENT_ID,
  };
}

function resolveAssertedProjectIds(
  workspaceScope,
  additionalProjectIds = [],
  includeWorkspaceProject = true
) {
  return Array.from(
    new Set(
      [...(includeWorkspaceProject ? [workspaceScope.projectId] : []), ...additionalProjectIds]
        .map((projectId) => readNonEmptyEnv(projectId))
        .filter((projectId) => projectId !== undefined)
    )
  );
}

function hasCompleteProtectedRuntimeOidcEnv(env = process.env) {
  return Boolean(
    readNonEmptyEnv(env.OIDC_JWKS_URI) &&
    readNonEmptyEnv(env.OIDC_ISSUER) &&
    readNonEmptyEnv(env.OIDC_AUDIENCE)
  );
}

function shouldBootstrapLocalProtectedRuntimeAuth(env = process.env) {
  return !hasCompleteProtectedRuntimeOidcEnv(env);
}

async function loadJoseModule() {
  if (!joseModulePromise) {
    const joseEntryPoint = require.resolve('jose', {
      paths: [path.resolve(__dirname, '../apps/api')],
    });
    joseModulePromise = import(pathToFileURL(joseEntryPoint).href);
  }

  return joseModulePromise;
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function applyLocalAuthCorsHeaders(response) {
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  response.setHeader('access-control-allow-headers', 'Accept, Content-Type');
}

function resolveRequestPath(request) {
  return new URL(request.url ?? '/', 'http://local.dvt').pathname;
}

async function handleLocalProtectedRuntimeAuthRequest(args) {
  const { request, response, jwksPayload, issueBearerToken } = args;
  const requestPath = resolveRequestPath(request);

  if (requestPath === '/.well-known/jwks.json' && request.method === 'GET') {
    response.statusCode = 200;
    response.setHeader('content-type', 'application/json');
    response.end(jwksPayload);
    return;
  }

  if (requestPath === LOCAL_TOKEN_REFRESH_PATH && request.method === 'OPTIONS') {
    applyLocalAuthCorsHeaders(response);
    response.statusCode = 204;
    response.end();
    return;
  }

  if (requestPath === LOCAL_TOKEN_REFRESH_PATH && request.method === 'POST') {
    const issuedToken = await issueBearerToken();
    applyLocalAuthCorsHeaders(response);
    response.statusCode = 200;
    response.setHeader('cache-control', 'no-store');
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        bearerToken: issuedToken.bearerToken,
        tokenType: 'Bearer',
        expiresAt: new Date(issuedToken.expiresAtSeconds * 1000).toISOString(),
      })
    );
    return;
  }

  response.statusCode = 404;
  response.end('not found');
}

async function startLocalProtectedRuntimeAuth(options = {}) {
  const env = options.env ?? process.env;
  const host = readNonEmptyEnv(options.host) ?? DEFAULT_HOST;
  const scope = resolveDevWorkspaceScope(env);
  const assertedProjectIds = Array.isArray(options.assertedProjectIds)
    ? resolveAssertedProjectIds(scope, options.assertedProjectIds, false)
    : Array.isArray(options.additionalProjectIds)
      ? resolveAssertedProjectIds(scope, options.additionalProjectIds)
      : [];
  const tokenScopes = ['dvt:runtime', ...LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS].join(' ');
  const principalId = readNonEmptyEnv(env.DVT_DEV_PRINCIPAL_ID) ?? DEFAULT_DEV_PRINCIPAL_ID;
  const issuer = readNonEmptyEnv(env.DVT_DEV_PROTECTED_RUNTIME_ISSUER) ?? DEFAULT_DEV_ISSUER;
  const audience = readNonEmptyEnv(env.DVT_DEV_PROTECTED_RUNTIME_AUDIENCE) ?? DEFAULT_DEV_AUDIENCE;
  const bearerTokenTtlSeconds = resolveDevBearerTokenTtlSeconds(env);
  const { SignJWT, exportJWK, generateKeyPair } = await loadJoseModule();
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const exportedJwk = await exportJWK(publicKey);
  const jwksPayload = JSON.stringify({
    keys: [
      {
        ...exportedJwk,
        use: 'sig',
        alg: 'RS256',
        kid: DEFAULT_JWK_KID,
      },
    ],
  });

  async function issueBearerToken() {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = nowSeconds + bearerTokenTtlSeconds;
    const bearerToken = await new SignJWT({
      scope: tokenScopes,
      tenant_ids: [scope.tenantId],
      project_ids: assertedProjectIds,
    })
      .setProtectedHeader({ alg: 'RS256', kid: DEFAULT_JWK_KID })
      .setSubject(principalId)
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt(nowSeconds)
      .setExpirationTime(expiresAtSeconds)
      .sign(privateKey);

    return {
      bearerToken,
      expiresAtSeconds,
    };
  }

  const server = createServer((request, response) => {
    void handleLocalProtectedRuntimeAuthRequest({
      request,
      response,
      jwksPayload,
      issueBearerToken,
    }).catch((error) => {
      response.statusCode = 500;
      response.end(error instanceof Error ? error.message : 'local auth failure');
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, () => resolve());
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Unable to resolve local protected-runtime JWKS address');
  }

  const issuedToken = await issueBearerToken();
  const tokenRefreshUrl = `http://${host}:${address.port}${LOCAL_TOKEN_REFRESH_PATH}`;

  return {
    principalId,
    workspaceScope: scope,
    oidcEnv: {
      OIDC_JWKS_URI: `http://${host}:${address.port}/.well-known/jwks.json`,
      OIDC_ISSUER: issuer,
      OIDC_AUDIENCE: audience,
      OIDC_ALGORITHMS: 'RS256',
    },
    webEnv: {
      VITE_API_BEARER_TOKEN: issuedToken.bearerToken,
      VITE_API_BEARER_TOKEN_REFRESH_URL: tokenRefreshUrl,
    },
    close: async () => {
      await closeServer(server);
    },
  };
}

async function seedLocalProtectedRuntimeGrant(
  args,
  deps = { createClient: (options) => new Client(options) }
) {
  const schema = readNonEmptyEnv(args.schema) ?? 'dvt';
  const tenantAccess = JSON.stringify([
    {
      tenantId: args.workspaceScope.tenantId,
      allowedActions: [...args.tenantActions],
      projectAccess: [
        {
          projectId: args.workspaceScope.projectId,
          allowedActions: [],
          environmentAccess: [
            {
              environmentId: args.workspaceScope.environmentId,
              allowedActions: [],
            },
          ],
        },
      ],
    },
  ]);
  const client = deps.createClient({ connectionString: args.databaseUrl });

  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO ${quoteIdentifier(schema)}.projects
         (tenant_id, project_id, name, created_by_id, created_by_type)
       VALUES ($1, $2, $3, $4, 'user')
       ON CONFLICT (tenant_id, project_id) DO NOTHING`,
      [
        args.workspaceScope.tenantId,
        args.workspaceScope.projectId,
        args.workspaceScope.projectId,
        args.principalId,
      ]
    );
    await client.query(
      `INSERT INTO ${quoteIdentifier(schema)}.principal_grants
         (principal_id, principal_type, suspended, tenant_access)
       VALUES ($1, 'user', FALSE, $2::jsonb)
       ON CONFLICT (principal_id, principal_type)
       DO UPDATE SET tenant_access = EXCLUDED.tenant_access,
                     suspended = FALSE,
                     updated_at = NOW()`,
      [args.principalId, tenantAccess]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }

  return {
    principalId: args.principalId,
    schema,
    tenantActions: [...args.tenantActions],
    workspaceScope: args.workspaceScope,
  };
}

module.exports = {
  DEFAULT_DEV_AUDIENCE,
  DEFAULT_DEV_ISSUER,
  LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
  resolveDevWorkspaceScope,
  shouldBootstrapLocalProtectedRuntimeAuth,
  startLocalProtectedRuntimeAuth,
  seedLocalProtectedRuntimeGrant,
};
