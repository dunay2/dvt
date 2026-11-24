/** Owned concern: the one documentary kind CHECK cannot accept arbitrary schema changes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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
