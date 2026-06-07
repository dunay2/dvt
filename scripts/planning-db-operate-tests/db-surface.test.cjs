const test = require('node:test');
const {
  assert,
  parseArgs,
  planDbSurfaceUpsertOperation,
  validateDbSurfaceMigrationState,
  validateDbSurfaceWriteRailKind,
  writePlannedDbSurfaceUpsertOperation,
} = require('./helpers.cjs');

test('parseArgs builds a DB surface upsert command with structured authority fields', () => {
  const command = parseArgs([
    'db-surface',
    'upsert',
    '--surface',
    'Architecture design authority',
    '--canonical-source',
    'architecture.design rows',
    '--write-rail',
    'pnpm planning:db:operate architecture-design create',
    '--write-rail-kind',
    'db_command',
    '--read-query-rail',
    'pnpm planning:db:query architecture-designs',
    '--projection',
    'DB authority rows',
    '--validation',
    'pnpm test:planning:db',
    '--migration-state',
    'DB-first',
    '--source-ref',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    '--source-content-sha256',
    'a'.repeat(64),
    '--actor',
    'codex',
    '--idempotency-key',
    'codex-db-surface-architecture-authority',
  ]);

  assert.equal(command.kind, 'db_surface_upsert');
  assert.equal(command.surfaceName, 'Architecture design authority');
  assert.equal(command.writeRailKind, 'db_command');
  assert.equal(command.migrationState, 'DB-first');
  assert.equal(command.actor, 'codex');
});

test('parseArgs rejects DB-first DB surface commands without a DB command write rail', () => {
  assert.throws(
    () =>
      parseArgs([
        'db-surface',
        'upsert',
        '--surface',
        'Knowledge intake literature',
        '--canonical-source',
        'knowledge_documents import',
        '--write-rail',
        'pnpm governance:refresh',
        '--write-rail-kind',
        'import',
        '--read-query-rail',
        'pnpm planning:db:query knowledge-intake',
        '--projection',
        '.generated-docs/planning/status/generated-knowledge-intake-literature.md',
        '--validation',
        'pnpm governance:refresh',
        '--migration-state',
        'DB-first',
        '--source-ref',
        'docs/planning/status/db-surface-inventory.md',
        '--source-content-sha256',
        'b'.repeat(64),
        '--actor',
        'codex',
      ]),
    /DB-FIRST-WRITE-RAIL-MISMATCH/
  );
});

test('DB surface validators accept only governed migration and write rail kinds', () => {
  assert.equal(validateDbSurfaceMigrationState('Hybrid indexed'), 'Hybrid indexed');
  assert.equal(validateDbSurfaceWriteRailKind('db_command'), 'db_command');
  assert.throws(
    () => validateDbSurfaceMigrationState('mostly-db-first'),
    /Invalid DB surface migration state/
  );
  assert.throws(
    () => validateDbSurfaceWriteRailKind('spreadsheet'),
    /Invalid DB surface write rail kind/
  );
});

test('DB surface upsert planner emits a DB surface row and audit row', () => {
  const now = new Date('2026-06-05T12:00:00.000Z');
  const command = parseArgs([
    'db-surface',
    'upsert',
    '--surface',
    'Architecture design authority',
    '--canonical-source',
    'architecture.design rows',
    '--write-rail',
    'pnpm planning:db:operate architecture-design create',
    '--write-rail-kind',
    'db_command',
    '--read-query-rail',
    'pnpm planning:db:query architecture-designs',
    '--projection',
    'DB authority rows',
    '--validation',
    'pnpm test:planning:db',
    '--migration-state',
    'DB-first',
    '--source-ref',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    '--source-content-sha256',
    'a'.repeat(64),
    '--actor',
    'codex',
    '--idempotency-key',
    'codex-db-surface-architecture-authority',
  ]);

  const planned = planDbSurfaceUpsertOperation({
    command,
    existingSurface: { revision: 2 },
    operationId: 'operation-db-surface-1',
    now,
  });

  assert.equal(planned.surface.surfaceName, 'Architecture design authority');
  assert.equal(planned.surface.writeRailKind, 'db_command');
  assert.equal(planned.surface.migrationState, 'DB-first');
  assert.equal(planned.surface.revision, 3);
  assert.equal(planned.audit.operationType, 'db_surface_upsert');
  assert.equal(planned.audit.previousRevision, 2);
  assert.equal(planned.audit.resultingRevision, 3);
});

test('writePlannedDbSurfaceUpsertOperation persists surface and audit rows', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [] };
    },
  };
  const planned = {
    surface: {
      surfaceName: 'Architecture design authority',
      canonicalSource: 'architecture.design rows',
      writeRail: 'pnpm planning:db:operate architecture-design create',
      writeRailKind: 'db_command',
      readQueryRail: 'pnpm planning:db:query architecture-designs',
      projection: 'DB authority rows',
      validation: 'pnpm test:planning:db',
      migrationState: 'DB-first',
      sourceRef: 'tools/planning-db/migrations/059_db_surface_inventory.sql',
      sourceContentSha256: 'a'.repeat(64),
      revision: 3,
      updatedBy: 'codex',
      updatedAt: '2026-06-05T12:00:00.000Z',
    },
    audit: {
      operationId: 'operation-db-surface-1',
      idempotencyKey: 'codex-db-surface-architecture-authority',
      operationType: 'db_surface_upsert',
      actor: 'codex',
      surfaceName: 'Architecture design authority',
      sourceRef: 'tools/planning-db/migrations/059_db_surface_inventory.sql',
      sourceContentSha256: 'a'.repeat(64),
      previousRevision: 2,
      resultingRevision: 3,
      payload: { migrationState: 'DB-first' },
      createdAt: '2026-06-05T12:00:00.000Z',
    },
  };

  await writePlannedDbSurfaceUpsertOperation(client, planned);

  assert.match(queries[0].sql, /insert into planning_query_store\.db_governance_surfaces/);
  assert.match(
    queries[1].sql,
    /insert into planning_query_store\.db_governance_surface_operations/
  );
  assert.equal(queries[0].params[0], 'Architecture design authority');
  assert.equal(queries[0].params[3], 'db_command');
  assert.equal(queries[0].params[7], 'DB-first');
  assert.equal(queries[1].params[4], 'Architecture design authority');
});
