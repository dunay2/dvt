/** Owned concern: the one documentary kind CHECK cannot accept arbitrary schema changes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { sha256HexUtf8 } = require('@dvt/crypto');
const { readCurrentPlanningDbSchema } = require('./current-schema.cjs');
const { reviseComponentKindConstraint } = require('./current-component-kind-constraint.cjs');
const sourcePath = path.resolve(
  __dirname,
  '../../tools/planning-db/schema/architecture/tables.sql'
);
const declaration =
  "CONSTRAINT architecture_component_kind_check CHECK ((kind = ANY (ARRAY['package'::text, 'module'::text, 'port'::text, 'adapter'::text, 'service'::text, 'ui-view'::text, 'workflow'::text, 'dbt-model'::text, 'api'::text, 'documentary-collection'::text])))";
const disconnected = {
  query() {
    throw new Error('Must not connect');
  },
};

test('fixed kind CLI rejects injected grammar and stale source before connecting', () => {
  for (const extra of [[], ['--sql', 'select 1'], ['--expected-schema-sha256', 'c'.repeat(64)]]) {
    const result = spawnSync(
      process.execPath,
      [
        path.resolve(__dirname, '../planning-db-schema.cjs'),
        '--revise-component-kind-constraint',
        '--expected-schema-sha256',
        'a'.repeat(64),
        '--expected-constraint-sha256',
        'b'.repeat(64),
        ...extra,
      ],
      {
        encoding: 'utf8',
        env: { ...process.env, DVT_PLANNING_DB_URL: 'postgresql://invalid:1/never_connect' },
      }
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, extra.length ? /exactly two reviewed digests/ : /schema digest/);
    assert.doesNotMatch(result.stderr, /ECONN|ENOTFOUND|replaced=true/);
  }
});

test('kind CHECK rejects caller SQL/identity, unsupported options and stale schema before connecting', async () => {
  for (const extra of [
    { sql: 'select 1' },
    { table: 'architecture.component' },
    { path: sourcePath },
    { unknown: true },
  ]) {
    await assert.rejects(
      reviseComponentKindConstraint({ client: disconnected, ...extra }),
      /Unsupported/
    );
  }
  await assert.rejects(
    reviseComponentKindConstraint({
      client: disconnected,
      expectedSchemaSha256: 'a'.repeat(64),
      expectedConstraintSha256: 'b'.repeat(64),
    }),
    /schema digest/
  );
});

test('kind CHECK admits only the unique active exact current declaration', async (t) => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  assert.ok(source.includes(declaration));
  const originalRead = fs.readFileSync;
  for (const replacement of [
    '-- ' + declaration,
    '/* ' + declaration + ' */',
    declaration + ',\n    ' + declaration,
    declaration.replace("'documentary-collection'::text", "'fake'::text"),
    declaration.replace('kind =', 'status ='),
  ]) {
    const reader = t.mock.method(fs, 'readFileSync', (name, ...args) => {
      const value = originalRead(name, ...args);
      return name === sourcePath ? value.replace(declaration, replacement) : value;
    });
    try {
      await assert.rejects(
        reviseComponentKindConstraint({
          client: disconnected,
          expectedSchemaSha256: sha256HexUtf8(readCurrentPlanningDbSchema()),
          expectedConstraintSha256: 'a'.repeat(64),
        }),
        /canonical|declaration/
      );
    } finally {
      reader.mock.restore();
    }
  }
});
