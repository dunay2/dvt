/** Owned concern: native component writes consume effective DB parents and retain rollback behavior. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs } = require('./helpers.cjs');
const {
  applyComponentCreateOperation,
  applyComponentReparentOperation,
} = require('../planning-db/operate/component-operations.cjs');

const provenance = [
  '--source-ref',
  'https://github.com/dunay2/dvt/issues/3747',
  '--source-content-sha256',
  'a'.repeat(64),
  '--actor',
  'test',
];
function createCommand(parent = 'SYS-CURRENT-PARENT') {
  return parseArgs([
    'component',
    'create',
    '--component',
    'SYS-CHILD',
    '--parent',
    parent,
    '--name',
    'Child',
    '--owned-concern',
    'Own child projection.',
    '--ddd-owner',
    'Projection',
    '--cq-rails',
    'PreviewPlan',
    '--owns',
    'packages/child/**',
    ...provenance,
  ]);
}

function database({ cycle = false, auditFailure = false, shadowedImport = false } = {}) {
  const calls = [];
  const parent = {
    unit_id: 'SYS-CURRENT-PARENT',
    name: 'Current parent',
    level: 'component',
    parent_id: 'SYS-ROOT',
    root_unit: 'SYS-ROOT',
    domain_unit: 'SYS-ROOT',
    status: 'review',
  };
  const child = {
    source_kind: 'local',
    component_id: 'SYS-CHILD',
    name: 'Child',
    level: 'component',
    parent_id: 'SYS-OLD-PARENT',
    root_unit: 'SYS-ROOT',
    domain_unit: 'SYS-ROOT',
    revision: 3,
  };
  return {
    calls,
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes('has_query_store'))
        return {
          rows: [
            {
              has_query_store: true,
              has_component_engineering: true,
              has_architecture: true,
              has_no_migration_ledger: true,
              has_no_migration_state: true,
            },
          ],
        };
      if (sql.includes('component_tree_query'))
        return {
          rows: values[0] === 'SYS-STALE-PARENT' ? [{ ...parent, unit_id: values[0] }] : [],
        };
      if (sql.includes('governance_unit_query'))
        return {
          rows: sql.includes('with recursive')
            ? [
                { unit_id: 'SYS-ROOT' },
                ...(cycle ? [{ unit_id: child.component_id }] : []),
                { unit_id: parent.unit_id },
              ]
            : values[0] === parent.unit_id
              ? [parent]
              : [],
        };
      if (
        sql.includes('governance_component_definition_query') ||
        (sql.includes('governance_component_local_operations') &&
          sql.trimStart().startsWith('select'))
      )
        return { rows: [] };
      if (sql.includes('from planning_query_store.governance_components'))
        return { rows: shadowedImport ? [{ ...child, source_kind: 'imported', revision: 0 }] : [] };
      if (sql.includes('from planning_query_store.governance_component_local_definitions'))
        return { rows: [child] };
      if (
        auditFailure &&
        sql.includes('insert into planning_query_store.governance_component_local_operations')
      )
        throw new Error('injected audit write failure');
      if (/^\s*(begin|commit|rollback|insert|update|delete)\b/u.test(sql))
        return { rows: [], rowCount: 1 };
      throw new Error('Unexpected database protocol: ' + sql);
    },
  };
}

test('create admits a current DB parent absent from the imported component tree', async () => {
  const client = database();
  const result = await applyComponentCreateOperation(createCommand(), { client });
  assert.equal(result.definition.parentComponentId, 'SYS-CURRENT-PARENT');
  assert.equal(client.calls.at(-1).sql, 'commit');
});

test('create refuses a stale imported parent absent from current authority before writes', async () => {
  const client = database();
  await assert.rejects(
    applyComponentCreateOperation(createCommand('SYS-STALE-PARENT'), { client }),
    /Parent/u
  );
  assert.equal(client.calls.at(-1).sql, 'rollback');
  assert.equal(
    client.calls.some(({ sql }) => /^\s*insert\b/u.test(sql)),
    false
  );
});

for (const cycle of [false, true]) {
  test(
    'reparent uses current ancestry and ' + (cycle ? 'rejects a cycle' : 'retains its full path'),
    async () => {
      const client = database({ cycle });
      const command = parseArgs([
        'component',
        'reparent',
        '--component',
        'SYS-CHILD',
        '--parent',
        'SYS-CURRENT-PARENT',
        '--expected-revision',
        '3',
        ...provenance,
      ]);
      if (cycle) {
        await assert.rejects(
          applyComponentReparentOperation(command, { client }),
          /descendant|cycle/u
        );
        assert.equal(client.calls.at(-1).sql, 'rollback');
      } else {
        const result = await applyComponentReparentOperation(command, { client });
        assert.deepEqual(result.definition.unitPath, [
          'SYS-ROOT',
          'SYS-CURRENT-PARENT',
          'SYS-CHILD',
        ]);
        assert.equal(result.definition.revision, 4);
        assert.equal(client.calls.at(-1).sql, 'commit');
      }
    }
  );
}

test('a failed audit rolls back the native parent write rather than reporting success', async () => {
  const client = database({ auditFailure: true });
  await assert.rejects(
    applyComponentCreateOperation(createCommand(), { client }),
    /injected audit/u
  );
  assert.equal(client.calls.at(-1).sql, 'rollback');
  assert.equal(
    client.calls.some(({ sql }) => sql === 'commit'),
    false
  );
});

test('reparent preserves a current local classification and revision over the imported target', async () => {
  const client = database({ shadowedImport: true });
  const command = parseArgs([
    'component',
    'reparent',
    '--component',
    'SYS-CHILD',
    '--parent',
    'SYS-CURRENT-PARENT',
    '--expected-revision',
    '3',
    ...provenance,
  ]);
  const result = await applyComponentReparentOperation(command, { client });
  assert.equal(result.definition.sourceKind, 'local');
  assert.equal(result.definition.revision, 4);
  assert.equal(client.calls.at(-1).sql, 'commit');
});
