const assert = require('node:assert/strict');
const { EventEmitter, once } = require('node:events');
const test = require('node:test');
const { Client } = require('pg');

const {
  allocateDisposablePostgresDatabase,
  installDisposablePostgresInterruptCleanup,
} = require('./disposable-postgres-database.cjs');

test('allocates an exact disposable database and disposes it once', async () => {
  const queries = [];
  const factory = () => ({
    connect: async () => {},
    query: async (sql) => {
      queries.push(sql);
    },
    end: async () => {},
  });
  const lease = await allocateDisposablePostgresDatabase(
    'postgresql://admin:secret@localhost:5432/dvt',
    'source_import',
    { clientFactory: factory }
  );

  assert.match(lease.name, /^dvt_proof_source_import_[a-f0-9]{16}$/);
  assert.equal(new URL(lease.url).pathname, `/${lease.name}`);
  assert.match(queries[0], /^CREATE DATABASE "dvt_proof_source_import_[a-f0-9]{16}"$/);

  await Promise.all([lease.dispose(), lease.dispose()]);
  assert.equal(queries.length, 2);
  assert.equal(queries[1], `DROP DATABASE IF EXISTS "${lease.name}" WITH (FORCE)`);
});

test('rejects unbounded database names and incomplete admin URLs', async () => {
  await assert.rejects(
    allocateDisposablePostgresDatabase('postgresql://localhost/dvt', '../dvt'),
    /label/
  );
  await assert.rejects(
    allocateDisposablePostgresDatabase('postgresql://localhost/', 'preview'),
    /database name/
  );
  await assert.rejects(
    allocateDisposablePostgresDatabase('postgresql://admin:secret@remote.example/dvt', 'preview'),
    /loopback/
  );
});

test('signal cleanup stops the runner before dropping its database', async () => {
  const emitter = new EventEmitter();
  const calls = [];
  emitter.exit = (code) => calls.push(`exit:${code}`);
  const lease = { dispose: async () => calls.push('drop') };
  const remove = installDisposablePostgresInterruptCleanup(
    lease,
    async () => calls.push('shutdown'),
    emitter
  );

  emitter.emit('SIGINT');
  await once(emitter, 'disposable-cleanup-complete');
  assert.deepEqual(calls, ['shutdown', 'drop', 'exit:130']);
  remove();
  assert.equal(emitter.listenerCount('SIGINT'), 0);
});

test(
  'real PostgreSQL allocation and cleanup leaves the persistent database untouched',
  {
    skip: !process.env.DVT_TEST_DISPOSABLE_PG_URL,
  },
  async () => {
    const adminUrl = process.env.DVT_TEST_DISPOSABLE_PG_URL;
    const lease = await allocateDisposablePostgresDatabase(adminUrl, 'integration');
    try {
      const proof = new Client({ connectionString: lease.url });
      await proof.connect();
      try {
        const result = await proof.query('SELECT current_database() AS database');
        assert.equal(result.rows[0].database, lease.name);
      } finally {
        await proof.end();
      }
    } finally {
      await lease.dispose();
    }
    const admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    try {
      const result = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
        lease.name,
      ]);
      assert.equal(result.rowCount, 0);
    } finally {
      await admin.end();
    }
  }
);
