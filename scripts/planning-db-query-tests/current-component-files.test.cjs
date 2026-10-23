/** Owned concern: prove current Git files resolve against existing DB ownership authority. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { repository } = require('../lib/feature-mechanization-git-fixture.cjs');
const {
  readGovernanceFileRows,
  readComponentEngineeringComponentTreeRows,
  readComponentProfileRows,
} = require('../planning-db-query.cjs');
const {
  createCurrentComponentFilesReadModelComponent,
} = require('../planning-db/queries/current-component-files-query.cjs');

const unit = (id = 'SYS-TEST', changes = {}) => ({
  id,
  name: id,
  parent: null,
  level: 'component',
  status: 'canonical',
  owns: ['*.ts'],
  excludes: [],
  ddd_owner: 'Test authority',
  cq_rails: 'ReadTest',
  owned_concern: 'Own current test sources',
  responsibilities: ['Own test sources'],
  ...changes,
});

function authority(rows = [unit()]) {
  return {
    calls: [],
    async query(sql) {
      this.calls.push(sql);
      return { rows: sql.includes('governance_component_definition_query') ? rows : [] };
    },
  };
}

test('file and profile consumers receive canonical atomic associations and evidence from one model', async (t) => {
  const repo = repository(t);
  repo.write('model.ts', 'export class Store { read() { return 1; } }\n');
  repo.write('model.test.ts', 'export const proof = true;\n');
  const client = authority();
  const query = client.query.bind(client);
  client.query = async (sql) =>
    sql.includes('architecture.component_source_responsibility')
      ? {
          rows: [
            {
              componentId: 'SYS-TEST',
              responsibilityId: 'RESP-READ',
              path: 'model.ts',
              symbol: 'Store.read',
              role: 'implements',
              testPaths: ['model.test.ts'],
              responsibilityComponentId: 'SYS-TEST',
              description: 'Read current model',
              status: 'approved',
            },
          ],
        }
      : query(sql);
  const result = await readModel(repo).readCurrentComponentFiles(client);
  const model = result.files.find((file) => file.path === 'model.ts');
  assert.equal(model.responsibility_bindings.length, 1);
  assert.equal(model.responsibility_bindings[0].description, 'Read current model');
  assert.equal(model.responsibility_bindings[0].symbol, 'Store.read');
  const {
    buildComponentProfileRows,
    buildGovernanceFileRows,
  } = require('../planning-db-query.cjs');
  assert.ok(
    buildComponentProfileRows({ files: [model] }).some(
      (row) => row.includes('Store.read') && row.includes('RESP-READ')
    )
  );
  assert.match(JSON.stringify(buildGovernanceFileRows([model])), /Store.read/u);
  assert.deepEqual(result.errors, []);
  const rows = await readGovernanceFileRows(
    client,
    { path: 'model.ts' },
    { gitReader: repo.reader() }
  );
  assert.deepEqual(rows[0].responsibility_bindings, model.responsibility_bindings);
  repo.write('model.ts', 'export class Store { renamed() {} }\n');
  const invalid = await readModel(repo).readCurrentComponentFiles(client);
  assert.ok(invalid.errors.some((error) => /Store.read/u.test(error)));
});

for (const failure of [
  'source',
  'test',
  'owner',
  'ambiguous',
  'responsibility',
  'status',
  'duplicate',
]) {
  test('shared file model preserves negative responsibility evidence: ' + failure, async (t) => {
    const repo = repository(t);
    repo.write('model.ts', 'export function model() { return 1; }\n');
    repo.write('model.test.ts', 'export const proof = true;\n');
    const units = [unit()];
    const binding = {
      responsibilityId: 'RESP-MODEL',
      componentId: 'SYS-TEST',
      path: 'model.ts',
      symbol: 'model',
      role: 'implements',
      testPaths: ['model.test.ts'],
      description: 'Read model',
      responsibilityComponentId: 'SYS-TEST',
      status: 'approved',
    };
    const rows = [binding];
    if (failure === 'source' || failure === 'test')
      fs.unlinkSync(path.join(repo.root, failure === 'source' ? 'model.ts' : 'model.test.ts'));
    if (failure === 'owner') units[0].owns = ['retired.ts'];
    if (failure === 'ambiguous') units.push(unit('SYS-OTHER'));
    if (failure === 'responsibility') binding.description = null;
    if (failure === 'status') binding.status = 'proposed';
    if (failure === 'duplicate') rows.push({ ...binding });
    const client = {
      query: async (sql) => ({
        rows: sql.includes('component_source_responsibility') ? rows : units,
      }),
    };
    if (failure === 'duplicate')
      await assert.rejects(readModel(repo).readCurrentComponentFiles(client), /duplicate/u);
    else {
      const result = await readModel(repo).readCurrentComponentFiles(client);
      assert.ok(result.errors.length > 0);
      assert.equal(
        result.bindings.length,
        1,
        'invalid physical evidence must not erase the current semantic set'
      );
      await assert.rejects(
        readGovernanceFileRows(
          client,
          { path: 'unrelated.ts', limit: 1 },
          { gitReader: repo.reader() }
        ),
        /responsibility/iu
      );
      await assert.rejects(
        readComponentEngineeringComponentTreeRows(
          client,
          { component: 'unrelated', limit: 1 },
          { gitReader: repo.reader() }
        ),
        /responsibility/iu
      );
    }
  });
}

test('bound symbols and test references come from the selected SHA rather than the worktree', async (t) => {
  const repo = repository(t);
  repo.write('model.ts', 'export function model() { return 1; }\n');
  repo.write('model.test.ts', 'export const proof = true;\n');
  const head = repo.commit(repo.base);
  repo.write('model.ts', 'export function renamed() {}\n');
  fs.unlinkSync(path.join(repo.root, 'model.test.ts'));
  const rows = [
    {
      responsibilityId: 'RESP-MODEL',
      componentId: 'SYS-TEST',
      path: 'model.ts',
      symbol: 'model',
      role: 'implements',
      testPaths: ['model.test.ts'],
      responsibilityComponentId: 'SYS-TEST',
      description: 'Read model',
      status: 'approved',
    },
  ];
  const client = {
    query: async (sql) => ({
      rows: sql.includes('component_source_responsibility') ? rows : [unit()],
    }),
  };
  assert.deepEqual(
    (await readModel(repo, { headRef: head }).readCurrentComponentFiles(client)).errors,
    []
  );
});

function readModel(repo, options = {}) {
  return createCurrentComponentFilesReadModelComponent({ gitReader: repo.reader(options) });
}

test('tree and profile include DB-created children without imported hierarchy rows', async (t) => {
  const repo = repository(t);
  repo.write('model.test.ts', 'export const proof = true;\n');
  const client = authority([
    unit('SYS-ROOT', { level: 'system', owns: [] }),
    unit('SYS-PARENT', { parent: 'SYS-ROOT' }),
    unit('SYS-NEW', { parent: 'SYS-PARENT', owns: ['model.ts', 'model.test.ts'] }),
  ]);
  const options = { gitReader: repo.reader() };
  const tree = await readComponentEngineeringComponentTreeRows(
    client,
    { component: 'SYS-NEW' },
    options
  );
  assert.equal(tree.length, 1);
  assert.equal(tree[0].parent_component_id, 'SYS-PARENT');
  assert.equal(tree[0].direct_file_count, 2);
  assert.equal(tree[0].test_file_count, 1);
  assert.equal(tree[0].is_leaf_component, true);
  client.calls.length = 0;
  const profile = await readComponentProfileRows(
    client,
    { component: 'SYS-PARENT', limit: 1 },
    options
  );
  assert.equal(profile.component.component_id, 'SYS-PARENT');
  assert.equal(profile.component.descendant_file_count, 3);
  assert.equal(profile.component.direct_file_count, 1);
  assert.equal(profile.component.cq_rails, 'ReadTest');
  assert.equal(profile.children[0].component_id, 'SYS-NEW');
  assert.equal(profile.files.length, 1, 'paging must not truncate counts');
  assert.equal(
    client.calls.filter((sql) => sql.includes('governance_component_definition_query')).length,
    1
  );
  assert.ok(client.calls.every((sql) => !sql.includes('component_tree_query')));
});

test('tree filters effective ancestry and state before limiting', async (t) => {
  const repo = repository(t);
  const client = authority([
    unit('SYS-ROOT', { level: 'system', owns: [] }),
    unit('SYS-DOMAIN', { parent: 'SYS-ROOT', level: 'domain', owns: [] }),
    unit('SYS-A', { parent: 'SYS-DOMAIN', owns: ['model.ts'] }),
    unit('SYS-B', { parent: 'SYS-DOMAIN', status: 'review', owns: ['retired.ts'] }),
  ]);
  const rows = await readComponentEngineeringComponentTreeRows(
    client,
    {
      parentUnit: 'SYS-DOMAIN',
      rootUnit: 'SYS-ROOT',
      domainUnit: 'SYS-DOMAIN',
      governanceState: 'review',
      limit: 1,
    },
    { gitReader: repo.reader() }
  );
  assert.deepEqual(
    rows.map((row) => row.component_id),
    ['SYS-B']
  );
  repo.git('rm', '--quiet', 'retired.ts');
  const [deleted] = await readComponentEngineeringComponentTreeRows(
    client,
    { component: 'SYS-B' },
    { gitReader: repo.reader() }
  );
  assert.equal(deleted.descendant_file_count, 0);
});

test('tree counts ambiguous files once per affected ancestor without claiming direct ownership', async (t) => {
  const repo = repository(t);
  const client = authority([
    unit('SYS-ROOT', { level: 'system', owns: [] }),
    unit('SYS-A', { parent: 'SYS-ROOT' }),
    unit('SYS-B', { parent: 'SYS-ROOT' }),
  ]);
  const rows = await readComponentEngineeringComponentTreeRows(
    client,
    {},
    { gitReader: repo.reader() }
  );
  assert.equal(rows.length, 3);
  for (const row of rows) {
    assert.equal(row.descendant_file_count, 2);
    assert.equal(row.ambiguous_file_count, 2);
    assert.equal(row.direct_file_count, 0);
  }
});

test('files includes a newly tracked file absent from imported inventory', async (t) => {
  const repo = repository(t);
  repo.write('new.ts', 'export const current = true;\n');
  repo.git('add', 'new.ts');
  const client = authority();
  const rows = await readGovernanceFileRows(
    client,
    { path: 'new.ts' },
    { gitReader: repo.reader() }
  );
  assert.deepEqual(
    rows.map((row) => row.path),
    ['new.ts']
  );
});

test('current files include staged and untracked additions while excluding deleted and ignored paths', async (t) => {
  const repo = repository(t);
  repo.write('staged.ts', 'export const staged = true;\n');
  repo.git('add', 'staged.ts');
  repo.write('untracked.ts', 'export const untracked = true;\n');
  repo.write('.gitignore', 'ignored.ts\n');
  repo.write('ignored.ts', 'export const ignored = true;\n');
  repo.git('rm', '--quiet', 'retired.ts');
  const client = authority();
  const snapshot = await readModel(repo).readCurrentComponentFiles(client);
  assert.deepEqual(
    snapshot.files.map((file) => file.path),
    ['.gitignore', 'model.ts', 'staged.ts', 'untracked.ts']
  );
  assert.equal(snapshot.files.find((file) => file.path === 'staged.ts').component_unit, 'SYS-TEST');
  assert.equal(client.calls.length, 2);
  assert.match(client.calls[1], /architecture.component_source_responsibility/u);
  assert.match(client.calls[0], /governance_unit_query definition/);
  assert.match(client.calls[0], /governance_component_definition_query component/);
  assert.doesNotMatch(
    client.calls[0],
    /governance_files|file_ownership_projection|insert|update|refresh/i
  );
});

test('an explicit Git head keeps its files despite later worktree additions and deletions', async (t) => {
  const repo = repository(t);
  repo.git('rm', '--quiet', 'retired.ts');
  repo.write('later.ts', 'export const later = true;\n');
  const snapshot = await readModel(repo, { headRef: repo.base }).readCurrentComponentFiles(
    authority()
  );
  assert.deepEqual(
    snapshot.files.map((file) => file.path),
    ['model.ts', 'retired.ts']
  );
});

test('effective DB exclusions and canonical glob semantics leave unmatched current files visible', async (t) => {
  const repo = repository(t);
  fs.mkdirSync(path.join(repo.root, 'nested'));
  repo.write('nested/deep.ts', 'export const deep = true;\n');
  const client = authority([unit('SYS-TEST', { excludes: ['retired.ts'] })]);
  const snapshot = await readModel(repo).readCurrentComponentFiles(client);
  assert.deepEqual(
    snapshot.files.filter((file) => file.component_unit === 'UNOWNED').map((file) => file.path),
    ['nested/deep.ts', 'retired.ts']
  );
  assert.equal(snapshot.files.find((file) => file.path === 'model.ts').component_unit, 'SYS-TEST');
});

test('a matching descendant owns the file and exposes its complete DB authority path', async (t) => {
  const repo = repository(t);
  const client = authority([
    unit('SYS-ROOT', { level: 'system', owns: [] }),
    unit('SYS-PARENT', { parent: 'SYS-ROOT' }),
    unit('SYS-CHILD', { parent: 'SYS-PARENT', owns: ['model.ts'] }),
  ]);
  const snapshot = await readModel(repo).readCurrentComponentFiles(client);
  const model = snapshot.files.find((file) => file.path === 'model.ts');
  assert.equal(model.component_unit, 'SYS-CHILD');
  assert.equal(model.owning_unit, 'SYS-CHILD');
  assert.deepEqual(model.unit_path, ['SYS-ROOT', 'SYS-PARENT', 'SYS-CHILD']);
  assert.equal(model.root_unit, 'SYS-ROOT');
  assert.equal(model.owned_concern, 'Own current test sources');
  assert.deepEqual(model.responsibilities, ['Own test sources']);
  assert.equal(
    snapshot.files.find((file) => file.path === 'retired.ts').component_unit,
    'SYS-PARENT'
  );
});

test('source units keep their direct ownership and nearest containing component', async (t) => {
  const repo = repository(t);
  const client = authority([
    unit('SYS-PARENT'),
    unit('SRC-MODEL', { parent: 'SYS-PARENT', level: 'source', owns: ['model.ts'] }),
  ]);
  const snapshot = await readModel(repo).readCurrentComponentFiles(client);
  const model = snapshot.files.find((file) => file.path === 'model.ts');
  assert.equal(model.component_unit, 'SYS-PARENT');
  assert.equal(model.owning_unit, 'SRC-MODEL');
  assert.deepEqual(model.unit_path, ['SYS-PARENT', 'SRC-MODEL']);
});

test('unrelated matching owners remain ambiguous rather than choosing the first identity', async (t) => {
  const repo = repository(t);
  const client = authority([unit('SYS-Z'), unit('SYS-A')]);
  const snapshot = await readModel(repo).readCurrentComponentFiles(client);
  const model = snapshot.files.find((file) => file.path === 'model.ts');
  assert.equal(model.component_unit, 'AMBIGUOUS');
  assert.equal(model.governance_state, 'ambiguous');
  assert.equal(model.is_drift, true);
  assert.deepEqual(model.candidate_component_ids, ['SYS-A', 'SYS-Z']);
  assert.deepEqual(model.candidate_unit_paths, [['SYS-A'], ['SYS-Z']]);
});

test('superseded ownership does not claim a current file', async (t) => {
  const repo = repository(t);
  const snapshot = await readModel(repo).readCurrentComponentFiles(
    authority([unit('SYS-OLD', { status: 'superseded' })])
  );
  assert.ok(snapshot.files.every((file) => file.component_unit === 'UNOWNED' && file.is_drift));
});

for (const [reason, rows, expected] of [
  ['empty authority', [], /no unit authority/],
  ['duplicate identities', [unit(), unit()], /Duplicate unit identity/],
  ['missing parent', [unit('SYS-TEST', { parent: 'ABSENT' })], /Missing parent ABSENT/],
  [
    'cyclic ancestry',
    [unit('SYS-A', { parent: 'SYS-B' }), unit('SYS-B', { parent: 'SYS-A' })],
    /Cyclic parent chain/,
  ],
  ['invalid ownership', [unit('SYS-TEST', { owns: '*.ts' })], /Invalid owns/],
]) {
  test(`invalid DB ${reason} rejects without an invented inventory`, async (t) => {
    const repo = repository(t);
    await assert.rejects(readModel(repo).readCurrentComponentFiles(authority(rows)), expected);
  });
}

test('a DB read failure is preserved', async (t) => {
  const repo = repository(t);
  const failure = new Error('Planning DB unavailable');
  await assert.rejects(
    readModel(repo).readCurrentComponentFiles({
      async query() {
        throw failure;
      },
    }),
    (error) => error === failure
  );
});

test('unavailable Git evidence rejects before consulting the DB', async (t) => {
  const repo = repository(t);
  const client = authority();
  await assert.rejects(
    readModel(repo, { headRef: 'refs/heads/absent' }).readCurrentComponentFiles(client),
    /Git evidence unavailable/
  );
  assert.equal(client.calls.length, 0);
});
