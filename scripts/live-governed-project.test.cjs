const test = require('node:test');
const assert = require('node:assert/strict');

const { buildInitialTenantAccess, createGovernedProject } = require('./live-governed-project.cjs');

test('bootstrap authorizes CreateProject without inventing project grants', () => {
  assert.deepEqual(buildInitialTenantAccess(' tenant-a ', ['project:create']), [
    { tenantId: 'tenant-a', allowedActions: ['project:create'], projectAccess: [] },
  ]);
  assert.throws(() => buildInitialTenantAccess('', ['project:create']), /tenant id/);
});

test('live proof uses the governed CreateProject response as workspace authority', async () => {
  const workspace = {
    tenantId: 'tenant-a',
    projectId: 'created-project',
    projectName: 'Proof project',
    environmentId: 'dev',
  };
  const args = {
    apiBaseUrl: 'http://127.0.0.1:3300',
    bearerToken: 'proof-token',
    tenantId: 'tenant-a',
    name: 'Proof project',
    idempotencyKey: 'proof-create-1',
  };
  const calls = [];
  const created = await createGovernedProject(args, async (url, options) => {
    calls.push({ url, options });
    return { status: 201, json: async () => ({ defaultWorkspace: workspace }) };
  });
  assert.deepEqual(created, workspace);
  assert.equal(calls[0].url, 'http://127.0.0.1:3300/projects');
  assert.equal(calls[0].options.headers['Idempotency-Key'], 'proof-create-1');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    tenantId: 'tenant-a',
    name: 'Proof project',
  });
});

test('project command rejection and malformed workspace fail closed', async () => {
  const args = {
    apiBaseUrl: 'http://127.0.0.1:3300',
    bearerToken: 'proof-token',
    tenantId: 'tenant-a',
    name: 'Proof project',
    idempotencyKey: 'proof-create-2',
  };
  await assert.rejects(
    createGovernedProject(args, async () => ({ status: 403, json: async () => ({}) })),
    /failed with 403/
  );
  await assert.rejects(
    createGovernedProject(args, async () => ({ status: 201, json: async () => ({}) })),
    /invalid default workspace/
  );
});
