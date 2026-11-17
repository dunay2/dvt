/** Owned concern: prove fixed CHECK option and canonical source guards without PostgreSQL. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sha256HexUtf8 } = require('@dvt/crypto');
const { readCurrentPlanningDbSchema } = require('./current-schema.cjs');
const schema = require('../planning-db-schema.cjs');
const table = 'planning_query_store.feature_mechanization_local_rails';
const constraint = 'feature_mechanization_local_rails_mechanization_status_check';
const after =
  "CHECK ((mechanization_status = ANY (ARRAY['closed'::text, 'implemented'::text, 'declared'::text])))";
const sourcePath = path.resolve(
  __dirname,
  '../../tools/planning-db/schema/mechanization/rails/tables.sql'
);

test('fixed CHECK mode rejects caller SQL, unknown options and stale schema before connecting', async () => {
  assert.equal(typeof schema.reviseMechanizationStatusConstraint, 'function');
  const client = {
    query() {
      throw new Error('Must not connect');
    },
  };
  for (const extra of [{ sql: 'select 1' }, { table }, { path: sourcePath }]) {
    await assert.rejects(
      schema.reviseMechanizationStatusConstraint({ client, ...extra }),
      /Unsupported/
    );
  }
  await assert.rejects(
    schema.reviseMechanizationStatusConstraint({
      client,
      expectedSchemaSha256: 'a'.repeat(64),
      expectedConstraintSha256: 'b'.repeat(64),
    }),
    /schema digest/
  );
});

test('fixed CHECK source rejects comments, duplicate declarations and unrelated expressions', async (t) => {
  assert.equal(typeof schema.reviseMechanizationStatusConstraint, 'function');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const originalRead = fs.readFileSync;
  const declaration = `CONSTRAINT ${constraint} ${after}`;
  assert.ok(source.includes(declaration));
  const replacements = [
    `/* ${declaration} */`,
    `-- ${declaration}`,
    declaration + ',\n    ' + declaration,
    declaration.replace("'declared'::text", "'fake'::text"),
    declaration.replace('mechanization_status =', 'rail_status ='),
  ];
  for (const replacement of replacements) {
    const reader = t.mock.method(fs, 'readFileSync', (name, ...args) => {
      const value = originalRead(name, ...args);
      return name === sourcePath ? value.replace(declaration, replacement) : value;
    });
    try {
      const digest = sha256HexUtf8(readCurrentPlanningDbSchema());
      await assert.rejects(
        schema.reviseMechanizationStatusConstraint({
          client: {
            query() {
              throw new Error('Must not connect');
            },
          },
          expectedSchemaSha256: digest,
          expectedConstraintSha256: 'a'.repeat(64),
        }),
        /canonical|declaration/
      );
    } finally {
      reader.mock.restore();
    }
  }
});
