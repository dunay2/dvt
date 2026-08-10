const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  architectureStateTableNames,
  assertArchitectureState,
  assertCurrentRailDecisionState,
  assertCurrentStateValue,
  readArchitectureState,
  restoreArchitectureState,
} = require('./planning-db-architecture-state.cjs');

function emptyArchitectureState() {
  return Object.fromEntries(architectureStateTableNames.map((tableName) => [tableName, []]));
}

test('architecture state requires every governed table and rejects parallel state', () => {
  assert.doesNotThrow(() => assertArchitectureState(emptyArchitectureState()));
  assert.throws(() => assertArchitectureState({}), /must contain component rows/iu);
  assert.throws(
    () => assertArchitectureState({ ...emptyArchitectureState(), legacy: [] }),
    /unknown table legacy/iu
  );
});

test('current-state export rejects Planning DB history instead of translating it', () => {
  const state = emptyArchitectureState();
  state.component = [{ component_id: 'SYS-LEGACY', repo_path: 'tools/planning-db/migrations' }];

  assert.throws(() => assertArchitectureState(state), /forbidden history semantics/iu);
  assert.throws(
    () => assertCurrentStateValue({ migrationState: 'legacy' }),
    /forbidden field migrationState/iu
  );
  assert.throws(
    () => assertCurrentStateValue({ railName: 'PreserveLocalFeatureMechanizationRails' }),
    /forbidden history semantics/iu
  );
  assert.throws(
    () => assertCurrentStateValue({ railName: 'ApplyPlanningDbMigrations' }),
    /forbidden history semantics/iu
  );
  assert.throws(
    () => assertCurrentStateValue({ railName: 'PreparePlanningDbForCiGate' }),
    /forbidden history semantics/iu
  );
  assert.throws(
    () => assertCurrentStateValue({ rationale: 'Retain Planning DB migration ordinal history.' }),
    /forbidden history semantics/iu
  );
  assert.doesNotThrow(() =>
    assertCurrentStateValue({ railId: 'current#rail-decision#query#current-schema' })
  );
  const date = new Date('2026-08-08T00:00:00.000Z');
  assert.equal(assertCurrentStateValue(date), date);
});

test('current rail decisions reject duplicate identities and operation history', () => {
  const decision = {
    railId: 'current#rail-decision#query#readcomponent',
    railType: 'query',
    normalizedRailName: 'readcomponent',
  };

  assert.doesNotThrow(() => assertCurrentRailDecisionState([decision], []));
  assert.throws(
    () =>
      assertCurrentRailDecisionState(
        [decision],
        [{ railId: decision.railId, operationId: 'history' }]
      ),
    /cannot retain operations/iu
  );
  assert.throws(
    () =>
      assertCurrentRailDecisionState(
        [decision, { ...decision, railId: `${decision.railId}-duplicate` }],
        []
      ),
    /duplicate query:readcomponent/iu
  );
});

test('architecture state export reads every table deterministically', async () => {
  const queries = [];
  const state = await readArchitectureState({
    query: async (sql) => {
      queries.push(String(sql));
      return { rows: [{ row: { component_id: 'SYS-EXAMPLE' } }] };
    },
  });

  assert.equal(queries.length, architectureStateTableNames.length);
  assert.match(queries[0], /order by row_to_json\(current_row\)::text/iu);
  assert.deepEqual(state.component, [{ component_id: 'SYS-EXAMPLE' }]);
});

test('architecture state restore uses the current snapshot without reading prior rows', async () => {
  const queries = [];
  const state = emptyArchitectureState();
  state.component = [
    { component_id: 'SYS-ROOT', parent_component_id: null },
    { component_id: 'SYS-CHILD', parent_component_id: 'SYS-ROOT' },
  ];

  await restoreArchitectureState(
    {
      query: async (sql, params = []) => queries.push({ sql: String(sql), params }),
    },
    state
  );

  assert.equal(queries[0].sql, 'set constraints all deferred');
  assert.match(queries[1].sql, /insert into architecture\."component"/iu);
  assert.deepEqual(queries[1].params, ['SYS-ROOT', null, 'SYS-CHILD', 'SYS-ROOT']);
  assert.equal(queries.length, 2);
});

test('canonical generator storage writes use on-demand artifact paths', () => {
  const canonicalState = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '..', 'tools', 'planning-db', 'state', 'canonical-state.json'),
      'utf8'
    )
  );
  const storageRows = new Map(
    canonicalState.architectureState.component_storage_io.map((row) => [row.storage_io_id, row])
  );
  const expectedOutputs = new Map([
    [
      'STORAGE-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DB-SURFACE-WRITE-1',
      '.generated-docs/planning/status/db-surface-inventory.md',
    ],
    [
      'STORAGE-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-KNOWLEDGE-INTAKE-WRITE-1',
      '.generated-docs/planning/status/generated-knowledge-intake-literature.md',
    ],
    [
      'STORAGE-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-STATUS-REPORTS-WRITE-1',
      '.generated-docs/planning/status/generated-code-state.md',
    ],
  ]);

  for (const [storageIoId, expectedOutput] of expectedOutputs) {
    const row = storageRows.get(storageIoId);
    assert.ok(row, `missing canonical storage I/O ${storageIoId}`);
    assert.equal(row.direction, 'writes');
    assert.equal(row.access_pattern, 'projection');
    assert.equal(row.storage_object, expectedOutput);
  }
});
