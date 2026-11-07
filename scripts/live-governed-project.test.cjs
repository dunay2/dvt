const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildInitialTenantAccess,
  createGovernedProject,
  seedInitialTenantGrant,
} = require('./live-governed-project.cjs');

test('bootstrap authorizes CreateProject without inventing project grants', () => {
  assert.deepEqual(buildInitialTenantAccess(' tenant-a ', ['project:create']), [
    { tenantId: 'tenant-a', allowedActions: ['project:create'], projectAccess: [] },
  ]);
  assert.throws(() => buildInitialTenantAccess('', ['project:create']), /tenant id/);
});

const grantArgs = {
  databaseUrl: 'postgres://proof-only',
  schema: 'proof"schema',
  principalId: "principal-'quoted'",
  tenantId: ' tenant-a ',
  tenantActions: ['project:create'],
};

test('initial grant is tenant-only, parameterized and closes its client', async () => {
  const calls = [];
  const client = {
    connect: async () => calls.push('connect'),
    query: async (sql, values) => calls.push({ sql, values }),
    end: async () => calls.push('end'),
  };
  const before = structuredClone(grantArgs);
  await seedInitialTenantGrant(grantArgs, {
    createClient: (options) => {
      assert.deepEqual(options, { connectionString: grantArgs.databaseUrl });
      return client;
    },
  });
  assert.equal(calls.length, 3);
  assert.equal(calls[0], 'connect');
  assert.equal(calls[2], 'end');
  assert.match(calls[1].sql, /INSERT INTO "proof""schema"\.principal_grants/u);
  assert.match(calls[1].sql, /ON CONFLICT \(principal_id, principal_type\)/u);
  assert.match(calls[1].sql, /suspended = FALSE/u);
  assert.match(calls[1].sql, /updated_at = NOW\(\)/u);
  assert.equal(calls[1].sql.includes(grantArgs.principalId), false);
  assert.equal(calls[1].values[0], grantArgs.principalId);
  assert.deepEqual(JSON.parse(calls[1].values[1]), [
    { tenantId: 'tenant-a', allowedActions: ['project:create'], projectAccess: [] },
  ]);
  assert.deepEqual(grantArgs, before);
});

test('an invalid bootstrap tenant fails before allocating a database client', async () => {
  await assert.rejects(
    seedInitialTenantGrant(
      { ...grantArgs, tenantId: ' ' },
      {
        createClient: () => assert.fail('must not allocate a client for invalid access'),
      }
    ),
    /tenant id/u
  );
});

for (const failureAt of ['connect', 'query']) {
  test(`failed grant ${failureAt} preserves the error and closes its client`, async () => {
    const expected = new Error(`grant ${failureAt} failed`);
    const calls = [];
    const client = {
      connect: async () => {
        calls.push('connect');
        if (failureAt === 'connect') throw expected;
      },
      query: async () => {
        calls.push('query');
        throw expected;
      },
      end: async () => calls.push('end'),
    };
    await assert.rejects(
      seedInitialTenantGrant(grantArgs, { createClient: () => client }),
      (error) => error === expected
    );
    assert.deepEqual(
      calls,
      failureAt === 'connect' ? ['connect', 'end'] : ['connect', 'query', 'end']
    );
  });
}

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
