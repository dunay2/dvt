/** Owned concern: prove current Git files resolve against existing DB ownership authority. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { repository } = require('../lib/feature-mechanization-git-fixture.cjs');
const { readGovernanceFileRows } = require('../planning-db-query.cjs');
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

function readModel(repo, options = {}) {
  return createCurrentComponentFilesReadModelComponent({ gitReader: repo.reader(options) });
}

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
  assert.equal(client.calls.length, 1);
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
