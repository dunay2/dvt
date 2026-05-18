const test = require('node:test');
const assert = require('node:assert/strict');

const {
  LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
  resolveDevWorkspaceScope,
  shouldBootstrapLocalProtectedRuntimeAuth,
  startLocalProtectedRuntimeAuth,
} = require('./run-dev-stack.auth.cjs');

function decodeJwtPayload(token) {
  const parts = token.split('.');
  assert.equal(parts.length, 3, 'expected a signed JWT with three segments');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}

test('resolveDevWorkspaceScope falls back to the canonical api-mode workspace defaults', () => {
  assert.deepEqual(resolveDevWorkspaceScope({}), {
    tenantId: 'tenant',
    projectId: 'project',
    environmentId: 'dev',
  });
});

test('resolveDevWorkspaceScope prefers explicit frontend workspace defaults when provided', () => {
  assert.deepEqual(
    resolveDevWorkspaceScope({
      VITE_DEFAULT_TENANT_ID: 'tenant-local',
      VITE_DEFAULT_PROJECT_ID: 'project-local',
      VITE_DEFAULT_ENVIRONMENT_ID: 'stage',
    }),
    {
      tenantId: 'tenant-local',
      projectId: 'project-local',
      environmentId: 'stage',
    }
  );
});

test('shouldBootstrapLocalProtectedRuntimeAuth only when the protected-runtime OIDC posture is absent', () => {
  assert.equal(shouldBootstrapLocalProtectedRuntimeAuth({}), true);
  assert.equal(
    shouldBootstrapLocalProtectedRuntimeAuth({
      OIDC_JWKS_URI: 'http://127.0.0.1:4010/.well-known/jwks.json',
      OIDC_ISSUER: 'https://issuer.example/',
      OIDC_AUDIENCE: 'dvt-api',
    }),
    false
  );
});

test('local protected-runtime tenant actions include workspace graph draft and file reads', () => {
  assert.ok(LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS.includes('workspace:graph-draft:view'));
  assert.ok(LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS.includes('workspace:graph-draft:save'));
  assert.ok(LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS.includes('workspace:files:view'));
});

test('startLocalProtectedRuntimeAuth provides OIDC env and a bearer token for the coordinated dev stack', async () => {
  const bootstrap = await startLocalProtectedRuntimeAuth({
    env: {
      DVT_DEV_PRINCIPAL_ID: 'principal-dev-test',
      VITE_DEFAULT_TENANT_ID: 'tenant-dev-test',
      VITE_DEFAULT_PROJECT_ID: 'project-dev-test',
      VITE_DEFAULT_ENVIRONMENT_ID: 'dev-test',
    },
  });

  try {
    assert.match(
      bootstrap.oidcEnv.OIDC_JWKS_URI,
      /^http:\/\/127\.0\.0\.1:\d+\/\.well-known\/jwks\.json$/
    );
    assert.equal(bootstrap.oidcEnv.OIDC_ISSUER, 'https://issuer.local.dvt/');
    assert.equal(bootstrap.oidcEnv.OIDC_AUDIENCE, 'dvt-api');
    assert.equal(bootstrap.oidcEnv.OIDC_ALGORITHMS, 'RS256');
    assert.equal(bootstrap.webEnv.VITE_API_BEARER_TOKEN.split('.').length, 3);
    assert.equal(bootstrap.principalId, 'principal-dev-test');
    assert.deepEqual(bootstrap.workspaceScope, {
      tenantId: 'tenant-dev-test',
      projectId: 'project-dev-test',
      environmentId: 'dev-test',
    });
  } finally {
    await bootstrap.close();
  }
});

test('startLocalProtectedRuntimeAuth issues a bounded local dev bearer token by default', async () => {
  const bootstrap = await startLocalProtectedRuntimeAuth();

  try {
    const payload = decodeJwtPayload(bootstrap.webEnv.VITE_API_BEARER_TOKEN);
    assert.equal(typeof payload.iat, 'number');
    assert.equal(typeof payload.exp, 'number');
    assert.equal(payload.exp - payload.iat, 24 * 60 * 60);
  } finally {
    await bootstrap.close();
  }
});

test('startLocalProtectedRuntimeAuth publishes tenant actions for frontend permissions', async () => {
  const bootstrap = await startLocalProtectedRuntimeAuth();

  try {
    const payload = decodeJwtPayload(bootstrap.webEnv.VITE_API_BEARER_TOKEN);
    const scopes = typeof payload.scope === 'string' ? payload.scope.split(' ') : [];

    assert.ok(scopes.includes('dvt:runtime'));
    assert.ok(scopes.includes('run:start'));
    assert.ok(scopes.includes('workspace:graph-draft:view'));
    assert.ok(scopes.includes('workspace:graph-draft:save'));
  } finally {
    await bootstrap.close();
  }
});

test('startLocalProtectedRuntimeAuth can assert additional live-proof project ids', async () => {
  const bootstrap = await startLocalProtectedRuntimeAuth({
    env: {
      VITE_DEFAULT_PROJECT_ID: 'project-dev-test',
    },
    additionalProjectIds: ['project-dev-test-dynamic-a', 'project-dev-test-dynamic-b'],
  });

  try {
    const payload = decodeJwtPayload(bootstrap.webEnv.VITE_API_BEARER_TOKEN);
    assert.deepEqual(payload.project_ids, [
      'project-dev-test',
      'project-dev-test-dynamic-a',
      'project-dev-test-dynamic-b',
    ]);
  } finally {
    await bootstrap.close();
  }
});

test('startLocalProtectedRuntimeAuth exposes a local token refresh endpoint', async () => {
  const bootstrap = await startLocalProtectedRuntimeAuth();

  try {
    const refreshUrl = bootstrap.webEnv.VITE_API_BEARER_TOKEN_REFRESH_URL;
    assert.match(refreshUrl, /^http:\/\/127\.0\.0\.1:\d+\/__dvt\/local-protected-runtime\/token$/);

    await new Promise((resolve) => setTimeout(resolve, 1100));
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');

    const body = await response.json();
    assert.equal(typeof body.bearerToken, 'string');
    assert.notEqual(body.bearerToken, bootstrap.webEnv.VITE_API_BEARER_TOKEN);

    const payload = decodeJwtPayload(body.bearerToken);
    assert.equal(payload.exp - payload.iat, 24 * 60 * 60);
  } finally {
    await bootstrap.close();
  }
});

test('startLocalProtectedRuntimeAuth honors an explicit dev bearer-token TTL override', async () => {
  const bootstrap = await startLocalProtectedRuntimeAuth({
    env: {
      DVT_DEV_PROTECTED_RUNTIME_TOKEN_TTL_SECONDS: '7200',
    },
  });

  try {
    const payload = decodeJwtPayload(bootstrap.webEnv.VITE_API_BEARER_TOKEN);
    assert.equal(payload.exp - payload.iat, 7200);
  } finally {
    await bootstrap.close();
  }
});
