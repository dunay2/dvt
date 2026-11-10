/**
 * Owned concern: prove candidate evidence with real Git, including failure paths.
 * Why: fewer processes must still acquire the complete selected content and framing.
 * Corner: dirty worktrees, byte limits and malformed batch responses retain strict rejection.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const { FeatureMechanizationGitDiffReader } = require('../check-feature-mechanization.cjs');

const { repository } = require('./feature-mechanization-git-fixture.cjs');

test('committed source acquisition batches real blobs and retains the existing decoded content', (t) => {
  const repo = repository(t);
  const names = Array.from({ length: 16 }, (_, index) => `source ${index} caf\u00e9.ts`);
  for (const name of names) repo.write(name, `export const value = ${names.indexOf(name)};\n`);
  repo.write('bytes.bin', Buffer.from([0x61, 0, 0xff, 0x62, 10]));
  names.push('bytes.bin');
  const head = repo.commit(repo.base);
  const started = performance.now();
  const expected = Object.fromEntries(
    names.map((name) => [
      name,
      execFileSync('git', ['show', `${head}:${name}`], { cwd: repo.root, encoding: 'utf8' }),
    ])
  );
  const legacyMs = performance.now() - started;
  const reader = repo.reader({ headRef: head });
  const calls = [];
  const runGit = reader.runGit.bind(reader);
  reader.runGit = (args, options) => {
    calls.push(args);
    return runGit(args, options);
  };
  const batchStarted = performance.now();
  const diff = reader.read();
  const batchMs = performance.now() - batchStarted;
  assert.deepEqual(diff.fileContentsByPath, expected);
  assert.equal(calls.filter(([command]) => command === 'show').length, 0);
  assert.equal(calls.filter(([command]) => command === 'cat-file').length, 1);
  const before = calls.length;
  for (const name of names) assert.equal(reader.readSource(name), expected[name]);
  assert.equal(calls.length, before, 'the invocation retains already acquired source');
  t.diagnostic(
    JSON.stringify({
      sources: names.length,
      legacyProcesses: names.length,
      blobProcesses: 1,
      legacyMs: Number(legacyMs.toFixed(3)),
      completeReaderMs: Number(batchMs.toFixed(3)),
    })
  );
});

test('source membership does not repeatedly copy the full inventory', (t) => {
  const repo = repository(t);
  const reader = repo.reader({ headRef: repo.base });
  const readCurrentFiles = reader.readCurrentFiles.bind(reader);
  let inventories = 0;
  reader.readCurrentFiles = () => {
    inventories += 1;
    return readCurrentFiles();
  };
  for (let index = 0; index < 20; index += 1) reader.readSource('model.ts');
  assert.equal(inventories, 1);
  const exposed = reader.readCurrentFiles();
  exposed.push('not-selected.ts');
  assert.throws(() => reader.readSource('not-selected.ts'), /Missing selected Git path/);
});

test('bounded batches split large valid source sets without truncating a blob', (t) => {
  const repo = repository(t);
  const source = 'a'.repeat(3 * 1024 * 1024);
  repo.write('large-a.txt', source);
  repo.write('large-b.txt', source + 'b');
  const reader = repo.reader({ headRef: repo.commit(repo.base) });
  const runGit = reader.runGit.bind(reader);
  let batches = 0;
  reader.runGit = (args, options) => {
    if (args[0] === 'cat-file') batches += 1;
    return runGit(args, options);
  };
  const diff = reader.read();
  assert.equal(diff.fileContentsByPath['large-a.txt'], source);
  assert.equal(diff.fileContentsByPath['large-b.txt'], source + 'b');
  assert.equal(batches, 2);
});

test('small blob batches also bound object count independently of byte size', (t) => {
  const repo = repository(t);
  const names = Array.from({ length: 129 }, (_, index) => `small-${index}.ts`);
  for (const name of names) repo.write(name, 'export const small = true;\n');
  const reader = repo.reader({ headRef: repo.commit(repo.base) });
  const runGit = reader.runGit.bind(reader);
  const sizes = [];
  reader.runGit = (args, options) => {
    if (args[0] === 'cat-file') sizes.push(options.input.trim().split('\n').length);
    return runGit(args, options);
  };
  reader.readSources(names);
  assert.deepEqual(sizes, [128, 1]);
  for (const name of names) assert.equal(reader.readSource(name), 'export const small = true;\n');
});

for (const corruption of ['missing', 'nonblob', 'identity', 'size', 'truncated', 'extra']) {
  test(`a ${corruption} blob response rejects without publishing partial source`, (t) => {
    const repo = repository(t);
    repo.write('model.ts', 'export const model = 2;\n');
    const reader = repo.reader({ headRef: repo.commit(repo.base) });
    const runGit = reader.runGit.bind(reader);
    reader.runGit = (args, options) => {
      const output = runGit(args, options);
      if (args[0] !== 'cat-file') return output;
      const end = output.indexOf(10);
      const header = output.subarray(0, end).toString('utf8');
      if (corruption === 'missing') return Buffer.from(header.split(' ')[0] + ' missing\n');
      if (corruption === 'truncated') return output.subarray(0, -1);
      if (corruption === 'extra') return Buffer.concat([output, Buffer.from('unexpected')]);
      const changed =
        corruption === 'nonblob'
          ? header.replace(' blob ', ' tree ')
          : corruption === 'identity'
            ? header.replace(/^[a-f0-9]+/, '0'.repeat(40))
            : header.replace(/\d+$/, '1');
      return Buffer.concat([Buffer.from(changed + '\n'), output.subarray(end + 1)]);
    };
    assert.throws(() => reader.read(), /Git (?:blob|evidence)/);
    assert.equal(reader.sourceContents.size, 0);
  });
}

test('an over-budget selected blob rejects before acquisition', (t) => {
  const repo = repository(t);
  const reader = repo.reader({ headRef: repo.base });
  const runGit = reader.runGit.bind(reader);
  reader.runGit = (args, options) => {
    const output = runGit(args, options);
    return args[0] === 'ls-tree' ? output.replace(/(blob [a-f0-9]+) +\d+/g, '$1 33554433') : output;
  };
  assert.throws(() => reader.readSource('model.ts'), /Git (?:blob|evidence)/);
});

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
