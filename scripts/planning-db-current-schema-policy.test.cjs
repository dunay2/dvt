const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertNoPlanningDbMigrationArtifacts,
  findPlanningDbMigrationArtifacts,
} = require('./planning-db-current-schema-policy.cjs');

test('current-schema policy rejects Planning DB migration paths and executable semantics', () => {
  const contents = new Map([
    ['package.json', '{"scripts":{"planning:db:migrate":"node old.cjs"}}'],
    ['scripts/example.cjs', "const { runMigrations } = require('./planning-db-migrate.cjs');"],
    [
      'tools/planning-db/state/legacy-migration-state.json',
      '{"policy":"Planning DB applied_migration_identity compatibility"}',
    ],
    ['docs/archive/old.md', 'schema_migrations and planning:db:migrate are historical here'],
    ['infra/db/migrations/runtime.sql', 'create table runtime_migration_state(id text);'],
    [
      'packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts',
      'export const runMigrations = true;',
    ],
    [
      'docs/planning/proposals/mandatory/governance-and-docs/example.md',
      'Active operator guidance must not retain tools/planning-db/migrations/123_old.sql.',
    ],
  ]);
  const filePaths = [
    'tools/planning-db/migrations/001_old.sql',
    'tools/planning-db/legacy-bootstrap.sql',
    'scripts/planning-db-migrate.cjs',
    ...contents.keys(),
  ];

  const artifacts = findPlanningDbMigrationArtifacts({
    filePaths,
    readFile: (filePath) => contents.get(filePath) || '',
  });

  assert.deepEqual(
    artifacts.map(({ path, reason }) => [path, reason]),
    [
      [
        'docs/planning/proposals/mandatory/governance-and-docs/example.md',
        'Planning DB migration source reference',
      ],
      ['package.json', 'planning:db:migrate command'],
      ['scripts/example.cjs', 'Planning DB migration executable semantics'],
      ['scripts/planning-db-migrate.cjs', 'Planning DB migration runner'],
      ['tools/planning-db/legacy-bootstrap.sql', 'Parallel Planning DB SQL owner'],
      ['tools/planning-db/migrations/001_old.sql', 'Planning DB migration directory'],
      [
        'tools/planning-db/state/legacy-migration-state.json',
        'Planning DB migration-state semantics',
      ],
    ]
  );
});

test('current-schema policy fails closed with actionable diagnostics', () => {
  assert.throws(
    () =>
      assertNoPlanningDbMigrationArtifacts({
        filePaths: ['scripts/planning-db-migrate.test.cjs'],
        readFile: () => '',
      }),
    /scripts\/planning-db-migrate\.test\.cjs: Planning DB migration runner test/iu
  );
});

test('repository contains no Planning DB migration or migration-state artifact', () => {
  assert.deepEqual(findPlanningDbMigrationArtifacts(), []);
});
