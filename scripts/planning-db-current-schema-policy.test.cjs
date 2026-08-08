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
      'tools/planning-db/state/canonical-state.json',
      '{"sourcePath":"tools/planning-db/migrations/123_old_state.sql"}',
    ],
    ['docs/archive/old.md', 'schema_migrations and planning:db:migrate are historical here'],
    ['infra/db/migrations/runtime.sql', 'create table runtime_migration_state(id text);'],
    [
      'packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts',
      'export const runMigrations = true;',
    ],
    [
      'docs/planning/proposals/mandatory/governance-and-docs/example.md',
      'Run tools/planning-db/migrations before the governance query.',
    ],
  ]);
  const filePaths = [
    'tools/planning-db/migrations/001_old.sql',
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
      ['tools/planning-db/migrations/001_old.sql', 'Planning DB migration directory'],
      ['tools/planning-db/state/canonical-state.json', 'Planning DB migration source reference'],
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
