const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseArgs,
  resolveDatabaseUrl,
  shouldBootstrapLocalPostgres,
  buildApiEnv,
} = require('./run-dev-stack.cjs');
const { defaultPgUrl } = require('./run-temporal-postgres-proof.cjs');

test('parseArgs enables skip-postgres explicitly', () => {
  const options = parseArgs(['--host', '0.0.0.0', '--skip-postgres', '--test-only']);

  assert.equal(options.host, '0.0.0.0');
  assert.equal(options.skipPostgres, true);
  assert.equal(options.testOnly, true);
});

test('resolveDatabaseUrl prefers explicit environment configuration', () => {
  const databaseUrl = resolveDatabaseUrl(
    { skipPostgres: false },
    { DATABASE_URL: 'postgresql://custom-user:custom-pass@db.example.com:5432/dvt' }
  );

  assert.equal(databaseUrl, 'postgresql://custom-user:custom-pass@db.example.com:5432/dvt');
});

test('resolveDatabaseUrl falls back to canonical local postgres when not configured', () => {
  const databaseUrl = resolveDatabaseUrl({ skipPostgres: false }, {});

  assert.equal(databaseUrl, defaultPgUrl);
});

test('shouldBootstrapLocalPostgres only triggers when DATABASE_URL is absent and bootstrap is enabled', () => {
  assert.equal(shouldBootstrapLocalPostgres({ skipPostgres: false }, {}), true);
  assert.equal(
    shouldBootstrapLocalPostgres(
      { skipPostgres: false },
      { DATABASE_URL: 'postgresql://configured.example/dvt' }
    ),
    false
  );
  assert.equal(shouldBootstrapLocalPostgres({ skipPostgres: true }, {}), false);
});

test('buildApiEnv injects readiness flags and local postgres defaults for the coordinated stack', () => {
  const apiEnv = buildApiEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: false,
    },
    {}
  );

  assert.equal(apiEnv.HOST, '127.0.0.1');
  assert.equal(apiEnv.PORT, '3000');
  assert.equal(apiEnv.DVT_READYZ_ENABLED, 'true');
  assert.equal(apiEnv.DVT_DB_READY_ENABLED, 'true');
  assert.equal(apiEnv.DATABASE_URL, defaultPgUrl);
});

test('buildApiEnv leaves database unset when postgres bootstrap is explicitly skipped', () => {
  const apiEnv = buildApiEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: true,
    },
    {}
  );

  assert.equal(apiEnv.HOST, '127.0.0.1');
  assert.equal(apiEnv.PORT, '3000');
  assert.equal(apiEnv.DVT_READYZ_ENABLED, 'true');
  assert.equal(apiEnv.DVT_DB_READY_ENABLED, undefined);
  assert.equal(apiEnv.DATABASE_URL, undefined);
});
