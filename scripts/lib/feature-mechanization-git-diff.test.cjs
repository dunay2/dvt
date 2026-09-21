/** Owned concern: prove candidate evidence with real Git, including failure paths. */
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { FeatureMechanizationGitDiffReader } = require('../check-feature-mechanization.cjs');

function repository(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-git-evidence-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Fixture',
        GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
        GIT_COMMITTER_NAME: 'Fixture',
        GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
      },
    }).trim();
  git('init', '--quiet', '--initial-branch=main');
  const write = (name, value) => fs.writeFileSync(path.join(root, name), value);
  const commit = (parent) => {
    git('add', '--all');
    const tree = git('write-tree');
    const sha = git('commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', 'Fixture');
    git('update-ref', 'HEAD', sha);
    return sha;
  };
  write('model.ts', 'export const model = 1;\n');
  write('retired.ts', 'export const retired = true;\n');
  const base = commit();
  const reader = (options = {}) =>
    new FeatureMechanizationGitDiffReader({
      repoRootPath: root,
      baseRef: base,
      headRef: 'HEAD',
      includeWorktree: !options.headRef,
      ...options,
    });
  return { root, git, write, commit, base, reader };
}

test('an actual empty comparison succeeds', (t) => {
  const repo = repository(t);
  assert.deepEqual(repo.reader().read().changedFiles, []);
});

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
