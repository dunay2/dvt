/** Owned concern: native documentary findings use the same selected Git ownership and source evidence. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { repository } = require('../lib/feature-mechanization-git-fixture.cjs');
const {
  createDocumentaryComponentReadModelComponent,
} = require('../planning-db/queries/documentary-component-query.cjs');

function client(options = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('where kind = $1'))
        return {
          rows: [
            {
              component_id: 'DOC',
              name: 'Document collection',
              kind: 'documentary-collection',
              runtime: 'none',
              status: 'review',
            },
          ],
        };
      if (sql.includes('document.value as document_path'))
        return { rows: options.links || [{ component_id: 'SEMANTIC', document_path: 'guide.md' }] };
      if (sql.includes('governance_component_definition_query'))
        return {
          rows: [
            {
              id: 'DOC',
              name: 'Document collection',
              parent: null,
              level: 'component',
              status: 'review',
              owns: options.owns || ['guide.md'],
              excludes: [],
              responsibilities: [],
              cq_rails: 'none - passive collection',
            },
          ],
        };
      if (sql.includes('jsonb_array_elements(rail.implementation_refs)'))
        return { rows: options.refs || [] };
      if (sql.includes('select component_id, source_path, role'))
        return { rows: options.bindings || [] };
      return { rows: [] };
    },
  };
}

test('documentary query qualifies a current semantic document and rejects newly introduced code', async (t) => {
  const repo = repository(t);
  repo.write('guide.md', '# Real guide\n');
  const c = client({ owns: ['guide.md', 'script.ts'] });
  const read = createDocumentaryComponentReadModelComponent({ gitReader: repo.reader() });
  assert.deepEqual(await read.readDocumentaryIntegrityRows(c), []);
  repo.write('script.ts', 'export const run = true;\n');
  const rows = await createDocumentaryComponentReadModelComponent({
    gitReader: repo.reader(),
  }).readDocumentaryIntegrityRows(c);
  assert.ok(
    rows.some(
      (row) =>
        row.path === 'script.ts' &&
        row.metadata.code === 'non_documentary_artifact' &&
        row.severity === 'error'
    )
  );
});

test('selected Git document deletion invalidates linkage even when the worktree still has a file', async (t) => {
  const repo = repository(t);
  repo.write('guide.md', '# Committed guide\n');
  const head = repo.commit(repo.base);
  const good = createDocumentaryComponentReadModelComponent({
    gitReader: repo.reader({ headRef: head }),
  });
  assert.deepEqual(await good.readDocumentaryIntegrityRows(client()), []);
  const missing = createDocumentaryComponentReadModelComponent({
    gitReader: repo.reader({ headRef: repo.base }),
  });
  const rows = await missing.readDocumentaryIntegrityRows(client());
  assert.ok(rows.some((row) => row.metadata.code === 'missing_documentary_semantic_link'));
  assert.ok(rows.some((row) => row.metadata.code === 'empty_documentary_collection'));
});

test('native implementation references and all source bindings stay errors for passive paths', async (t) => {
  const repo = repository(t);
  repo.write('guide.md', '# Guide\n');
  const read = createDocumentaryComponentReadModelComponent({ gitReader: repo.reader() });
  const rows = await read.readDocumentaryIntegrityRows(
    client({
      refs: [{ reference: 'guide.md#run' }],
      bindings: [{ component_id: 'DOC', source_path: 'guide.md', role: 'verifies' }],
    })
  );
  assert.ok(rows.some((row) => row.metadata.code === 'documentary_rail_implementation'));
  assert.ok(rows.some((row) => row.metadata.code === 'documentary_source_binding'));
});

test('an unavailable authority rejects; existing semantic findings are not a documentary exemption', async (t) => {
  const repo = repository(t);
  repo.write('guide.md', '# Guide\n');
  const read = createDocumentaryComponentReadModelComponent({ gitReader: repo.reader() });
  await assert.rejects(
    read.readDocumentaryIntegrityRows({
      async query() {
        throw new Error('DB authority unavailable');
      },
    }),
    /DB authority unavailable/
  );
  const {
    createComponentIntegrityReadModelComponent,
  } = require('../planning-db/queries/component-integrity-query.cjs');
  const c = client();
  const query = c.query.bind(c);
  const existing = {
    finding_kind: 'component_evidence_gap',
    component_id: 'EXECUTABLE',
    severity: 'warning',
  };
  c.query = async (sql, params) =>
    sql.includes('current_integrity')
      ? (c.calls.push({ sql, params }), { rows: [existing] })
      : query(sql, params);
  const rows = await createComponentIntegrityReadModelComponent({
    gitReader: repo.reader(),
  }).readComponentIntegrityRows(c, { component: 'EXECUTABLE', limit: 7 });
  assert.deepEqual(rows, [existing]);
  const final = c.calls.find((call) => call.sql.includes('current_integrity'));
  assert.match(final.sql, /jsonb_to_recordset\(\$2::jsonb\)/);
  assert.deepEqual(JSON.parse(final.params[1]), []);
  assert.deepEqual(final.params.slice(2), ['EXECUTABLE', 7]);
});
