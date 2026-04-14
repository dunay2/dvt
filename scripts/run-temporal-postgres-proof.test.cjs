const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');

const {
  defaultPgUrl,
  getProofPgUrl,
  buildPgEnv,
  composeDown,
  resetComposeCommandCache,
  proofBaselineSchemas,
  isTransientProofSchema,
  listTransientProofSchemas,
} = require('./run-temporal-postgres-proof.cjs');

test('baseline schemas are never classified as transient proof state', () => {
  for (const schema of proofBaselineSchemas) {
    assert.equal(isTransientProofSchema(schema), false);
  }
});

test('transient proof schema policy matches the runtime and adapter integration lanes', () => {
  assert.equal(isTransientProofSchema('it_runtime_run_it_postgres_relational_runtime'), true);
  assert.equal(isTransientProofSchema('dvt_transform_it_1713131313_2'), true);
});

test('cleanup policy ignores non-proof schemas and returns a sorted transient list', () => {
  assert.deepEqual(
    listTransientProofSchemas([
      'analytics',
      'it_runtime_run_it_postgres_relational_runtime',
      'public',
      'dvt_transform_it_1713131313_2',
      'core',
    ]),
    ['dvt_transform_it_1713131313_2', 'it_runtime_run_it_postgres_relational_runtime']
  );
});

test('proof wrapper always uses the canonical Docker DSN', (t) => {
  const originalDvtPgUrl = process.env.DVT_PG_URL;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  t.after(() => {
    if (originalDvtPgUrl === undefined) {
      delete process.env.DVT_PG_URL;
    } else {
      process.env.DVT_PG_URL = originalDvtPgUrl;
    }

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  process.env.DVT_PG_URL = 'postgresql://external/proof';
  process.env.DATABASE_URL = 'postgresql://external/database';

  assert.equal(getProofPgUrl(), defaultPgUrl);

  const env = buildPgEnv();
  assert.equal(env.DVT_PG_URL, defaultPgUrl);
  assert.equal(env.DATABASE_URL, defaultPgUrl);
  assert.equal(env.DVT_PG_INTEGRATION, '1');
});

test('composeDown propagates teardown failures', (t) => {
  resetComposeCommandCache();
  t.after(() => {
    resetComposeCommandCache();
  });

  let callCount = 0;
  t.mock.method(childProcess, 'spawnSync', (command, args) => {
    callCount += 1;

    if (callCount === 1) {
      assert.equal(command, 'docker');
      assert.deepEqual(args, ['compose', 'version']);
      return { status: 0 };
    }

    assert.equal(command, 'docker');
    assert.equal(args.at(-2), 'down');
    assert.equal(args.at(-1), '-v');
    return { status: 1 };
  });

  assert.throws(() => composeDown(), /failed with exit code 1/);
});
