const test = require('node:test');
const assert = require('node:assert/strict');

const {
  architectureStateTableNames,
  assertArchitectureState,
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
