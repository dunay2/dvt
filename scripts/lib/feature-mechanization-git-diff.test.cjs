/** Owned concern: prove candidate evidence with real Git, including failure paths. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');
const { FeatureMechanizationGitDiffReader } = require('../check-feature-mechanization.cjs');

const { repository } = require('./feature-mechanization-git-fixture.cjs');

test('an actual empty comparison succeeds', (t) => {
  const repo = repository(t);
  assert.deepEqual(repo.reader().read().changedFiles, []);
});

for (const committed of [true, false]) {
  test(`large additions preserve every line of ${committed ? 'committed' : 'local'} evidence`, (t) => {
    const repo = repository(t);
    const lines = Array.from({ length: 45000 }, (_, i) => `export const field${i} = ${i};`);
    const source = `${lines.join('\n')}\n`;
    assert.ok(Buffer.byteLength(source) > 1024 * 1024);
    repo.write('added.ts', source);
    repo.write('model.ts', source);
    if (!committed) repo.git('add', 'added.ts');
    const options = committed ? { headRef: repo.commit(repo.base) } : {};
    const diff = repo.reader(options).read();
    assert.deepEqual(diff.changedFiles, ['added.ts', 'model.ts']);
    for (const name of diff.changedFiles) {
      assert.equal(diff.fileContentsByPath[name], source);
      assert.deepEqual(diff.addedLinesByPath[name], lines);
    }
  });
}

for (const option of ['baseRef', 'headRef']) {
  test(`an unavailable ${option} rejects instead of becoming empty evidence`, (t) => {
    const repo = repository(t);
    assert.throws(() => repo.reader({ [option]: 'refs/heads/absent' }).read(), /Git evidence/);
  });
}

test('a non-repository target rejects', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-no-git-evidence-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(
    () =>
      new FeatureMechanizationGitDiffReader({
        repoRootPath: root,
        baseRef: 'HEAD',
      }).read(),
    /Git evidence/
  );
});

test('unrelated histories reject instead of becoming empty evidence', (t) => {
  const repo = repository(t);
  repo.write('model.ts', 'export const model = 2;\n');
  const orphan = repo.commit();
  assert.throws(() => repo.reader({ headRef: orphan }).read(), /Git evidence/);
});

test('branch drift on the base is not part of the candidate diff', (t) => {
  const repo = repository(t);
  repo.git('branch', 'candidate');
  repo.write('unrelated.ts', 'export const unrelated = true;\n');
  const advancedBase = repo.commit(repo.base);
  repo.git('switch', '--quiet', 'candidate');
  repo.write('model.ts', 'export const model = 2;\n');
  const head = repo.commit(repo.base);
  const diff = repo.reader({ baseRef: advancedBase, headRef: head }).read();
  assert.deepEqual(diff.changedFiles, ['model.ts']);
  assert.deepEqual(diff.addedLinesByPath['model.ts'], ['export const model = 2;']);
});

test('explicit committed head excludes local edits and reads that exact tree', (t) => {
  const repo = repository(t);
  repo.write('model.ts', 'export const model = 2;\n');
  repo.git('rm', '--quiet', 'retired.ts');
  const head = repo.commit(repo.base);
  repo.write('model.ts', 'export const model = 99;\n');
  repo.write('local-only.ts', 'export const localOnly = true;\n');
  const diff = repo.reader({ headRef: head }).read();
  assert.deepEqual(diff.changedFiles, ['model.ts', 'retired.ts']);
  assert.deepEqual(diff.currentFiles, ['model.ts']);
  assert.deepEqual(diff.deletedFiles, ['retired.ts']);
  assert.equal(diff.fileContentsByPath['model.ts'], 'export const model = 2;\n');
});

test('local validation includes committed, staged, unstaged, untracked and deleted files', (t) => {
  const repo = repository(t);
  repo.write('committed.ts', 'export const committed = true;\n');
  repo.commit(repo.base);
  repo.write('staged.ts', 'export const staged = true;\n');
  repo.git('add', 'staged.ts');
  repo.write('model.ts', 'export const model = 2;\n');
  repo.write('untracked.ts', 'export const untracked = true;\n');
  repo.git('rm', '--quiet', 'retired.ts');
  const diff = repo.reader().read();
  assert.deepEqual(diff.changedFiles, [
    'committed.ts',
    'model.ts',
    'retired.ts',
    'staged.ts',
    'untracked.ts',
  ]);
  assert.deepEqual(diff.deletedFiles, ['retired.ts']);
  assert.equal(diff.currentFiles.includes('retired.ts'), false);
  for (const name of ['committed', 'staged', 'untracked']) {
    assert.ok(diff.addedLinesByPath[`${name}.ts`].includes(`export const ${name} = true;`));
  }
});

test('explicit head does not drift when checkout has advanced', (t) => {
  const repo = repository(t);
  repo.write('model.ts', 'export const model = 2;\n');
  const candidate = repo.commit(repo.base);
  repo.write('later.ts', 'export const later = true;\n');
  repo.commit(candidate);
  const diff = repo.reader({ headRef: candidate }).read();
  assert.deepEqual(diff.changedFiles, ['model.ts']);
  assert.equal(diff.currentFiles.includes('later.ts'), false);
});

test('the real depth-two PR merge checkout contains enough comparison ancestry', (t) => {
  const repo = repository(t);
  repo.write('model.ts', 'export const model = 2;\n');
  const candidate = repo.commit(repo.base);
  const merge = repo.git(
    'commit-tree',
    repo.git('write-tree'),
    '-p',
    repo.base,
    '-p',
    candidate,
    '-m',
    'Merge fixture'
  );
  repo.git('update-ref', 'HEAD', merge);
  const checkout = path.join(repo.root, 'shallow');
  repo.git('clone', '--quiet', '--depth=2', pathToFileURL(repo.root).href, checkout);
  const reader = new FeatureMechanizationGitDiffReader({
    repoRootPath: checkout,
    baseRef: repo.base,
    headRef: merge,
  });
  assert.deepEqual(reader.read().changedFiles, ['model.ts']);
});

for (const name of ['name with spaces.ts', 'caf\u00e9.ts']) {
  test(`added symbols retain exact path identity: ${name}`, (t) => {
    const repo = repository(t);
    repo.write(name, 'export const added = true;\n');
    const head = repo.commit(repo.base);
    const diff = repo.reader({ headRef: head }).read();
    assert.deepEqual(diff.changedFiles, [name]);
    assert.deepEqual(diff.addedLinesByPath[name], ['export const added = true;']);
  });
}

for (const committed of [true, false]) {
  test(`large historical deletions retain complete ${committed ? 'committed' : 'local'} evidence`, (t) => {
    const repo = repository(t);
    const historical = 'Historical record with no newly added semantics.\n'.repeat(40000);
    assert.ok(Buffer.byteLength(historical) > 1024 * 1024);
    repo.write('history.md', historical);
    const base = repo.commit(repo.base);
    repo.git('rm', '--quiet', 'history.md');
    repo.write('model.ts', 'export const model = 2;\n');
    const options = committed ? { baseRef: base, headRef: repo.commit(base) } : { baseRef: base };
    const diff = repo.reader(options).read();
    assert.deepEqual(diff.changedFiles, ['history.md', 'model.ts']);
    assert.deepEqual(diff.deletedFiles, ['history.md']);
    assert.deepEqual(diff.currentFiles, ['model.ts', 'retired.ts']);
    assert.deepEqual(diff.addedLinesByPath, {
      'model.ts': ['export const model = 2;'],
      'history.md': [],
    });
    assert.deepEqual(diff.fileContentsByPath, { 'model.ts': 'export const model = 2;\n' });
  });
}
