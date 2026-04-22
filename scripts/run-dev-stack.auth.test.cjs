const test = require('node:test');
const assert = require('node:assert/strict');

const {
  LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
  resolveDevWorkspaceScope,
  shouldBootstrapLocalProtectedRuntimeAuth,
  startLocalProtectedRuntimeAuth,
} = require('./run-dev-stack.auth.cjs');

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

test('local protected-runtime tenant actions include workspace graph draft read and write', () => {
  assert.ok(LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS.includes('workspace:graph-draft:view'));
  assert.ok(LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS.includes('workspace:graph-draft:save'));
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
