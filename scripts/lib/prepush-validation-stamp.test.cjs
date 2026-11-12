/**
 * Owned concern: real-Git input identity, receipt matching and persistence regressions.
 * @baseline ADR-0053: only equivalent validated inputs may reuse a successful receipt.
 * @decision Test real commits, large deletion patches, worktree changes and persisted failures.
 * @consequence Missing Git evidence fails closed, including changes beyond former buffer limits.
 * @version 1.0.0
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { createGitRepositoryEnvironment } = require('./git-repository-environment.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPrepushStamp,
  isPrepushStampValid,
  readPrepushStamp,
  validationLevelSatisfies,
} = require('./prepush-validation-stamp.cjs');
const { main } = require('../verify-prepush.cjs');

test('prepush validation stamp skips only equivalent or stronger validation', () => {
  const changedFiles = ['apps/web/src/app/AppProviders.tsx'];
  const defaultStamp = buildPrepushStamp(changedFiles, {
    full: false,
    stateFingerprint: 'same-tree',
    validationFingerprint: 'same-validation-inputs',
  });
  const fullStamp = buildPrepushStamp(changedFiles, {
    full: true,
    stateFingerprint: 'same-tree',
    validationFingerprint: 'same-validation-inputs',
  });
  const expectedDefault = buildPrepushStamp(changedFiles, {
    full: false,
    stateFingerprint: 'same-tree',
    validationFingerprint: 'same-validation-inputs',
  });
  const expectedFull = buildPrepushStamp(changedFiles, {
    full: true,
    stateFingerprint: 'same-tree',
    validationFingerprint: 'same-validation-inputs',
  });

  assert.equal(validationLevelSatisfies('full', 'default'), true);
  assert.equal(validationLevelSatisfies('default', 'full'), false);
  assert.equal(isPrepushStampValid(defaultStamp, expectedDefault), true);
  assert.equal(isPrepushStampValid(defaultStamp, expectedFull), false);
  assert.equal(isPrepushStampValid(fullStamp, expectedDefault), true);
  assert.equal(
    isPrepushStampValid(
      { ...fullStamp, changedFiles: ['apps/web/src/app/Other.tsx'] },
      expectedDefault
    ),
    false
  );
});

test('prepush validation stamp can survive branch upstream changes for the same content', () => {
  const changedFiles = ['scripts/planning-db-schema.test.cjs'];
  const stamp = buildPrepushStamp(changedFiles, {
    full: false,
    stateFingerprint: 'manual-main-upstream-state',
    validationFingerprint: 'same-head-and-diff',
  });
  const expectedAfterBranchPush = buildPrepushStamp(changedFiles, {
    full: false,
    stateFingerprint: 'new-branch-upstream-state',
    validationFingerprint: 'same-head-and-diff',
  });
  const expectedDifferentContent = buildPrepushStamp(changedFiles, {
    full: false,
    stateFingerprint: 'new-branch-upstream-state',
    validationFingerprint: 'different-head-or-diff',
  });

  assert.equal(isPrepushStampValid(stamp, expectedAfterBranchPush), true);
  assert.equal(isPrepushStampValid(stamp, expectedDifferentContent), false);
});

test('only the current local-readiness receipt purpose can satisfy a prepush gate', () => {
  const expected = buildPrepushStamp(['apps/web/src/app/views/CodeView.tsx'], {
    stateFingerprint: 'tree',
    validationFingerprint: 'inputs',
  });
  assert.equal(expected.version, 2);
  assert.equal(expected.purpose, 'local-push-readiness');
  assert.equal(expected.platform, process.platform);
  for (const candidate of [
    { ...expected, version: 1 },
    { ...expected, purpose: undefined },
    { ...expected, purpose: 'hosted-browser-accepted' },
  ])
    assert.equal(isPrepushStampValid(candidate, expected), false);
});

test('a shared checkout cannot reuse Linux readiness to omit the native Windows obligation', () => {
  const options = { stateFingerprint: 'same-tree', validationFingerprint: 'same-inputs' };
  const linux = buildPrepushStamp(['apps/web/src/app/views/CodeView.tsx'], {
    ...options,
    platform: 'linux',
  });
  const windows = buildPrepushStamp(linux.changedFiles, { ...options, platform: 'win32' });
  assert.equal(isPrepushStampValid(linux, windows), false);
  assert.equal(isPrepushStampValid(windows, linux), false);
  assert.equal(isPrepushStampValid({ ...windows, platform: undefined }, windows), false);
  assert.equal(isPrepushStampValid(windows, { ...windows }), true);
});

test('successful inner verification followed by failed traceability cannot publish partial readiness', async (t) => {
  const root = prepushRepository(t);
  const changedFiles = [
    'docs/adr/ADR-0069-component-family-cohesion-and-architectural-boundaries.md',
  ];
  const { main: changedMain } = require('../verify-changed.cjs');
  const events = [];
  await assert.rejects(
    main([], {
      repoRootPath: root,
      changedFiles,
      stateFingerprint: 'tree',
      validationFingerprint: 'inputs',
      printPrepushPlan: () => {},
      executePrepushPlan: async (plan) => {
        for (const step of plan) {
          events.push(step.id);
          if (step.id === 'verify-changed') {
            assert.equal(
              await changedMain(['--push-readiness'], {
                repoRootPath: root,
                changedFiles,
                printPlan: () => {},
                executeVerifyChangedPlan: async () => 0,
              }),
              0
            );
            assert.equal(readPrepushStamp({ repoRootPath: root }), null);
          } else if (step.id === 'traceability-adr0') {
            throw Object.assign(new Error('Missing accepted ADR implementation'), { exitCode: 1 });
          }
        }
      },
    }),
    /Missing accepted ADR/
  );
  assert.deepEqual(events, ['verify-changed', 'traceability-adr0']);
  assert.equal(readPrepushStamp({ repoRootPath: root }), null);
});

test('successful inner CLI modes do not write reusable prepush receipts', async (t) => {
  const root = prepushRepository(t);
  const changedFiles = ['sample.txt'];
  const { main: changedMain } = require('../verify-changed.cjs');
  for (const mode of [[], ['--push-readiness'], ['--committed-tests']]) {
    assert.equal(
      await changedMain(mode, {
        repoRootPath: root,
        changedFiles,
        printPlan: () => {},
        executeVerifyChangedPlan: async () => 0,
        executeFocusedChangedTestPlan: async () => 0,
      }),
      0
    );
    assert.equal(readPrepushStamp({ repoRootPath: root }), null);
  }
});

function prepushRepository(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-prepush-identity-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const env = {
    ...createGitRepositoryEnvironment(),
    GIT_AUTHOR_NAME: 'Prepush fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
    GIT_COMMITTER_NAME: 'Prepush fixture',
    GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  };
  delete env.GIT_BASE;
  delete env.GIT_HEAD;
  const git = (...args) => execFileSync('git', args, { cwd: root, env, encoding: 'utf8' }).trim();
  const write = (name, content) => fs.writeFileSync(path.join(root, name), content);
  const commit = (parent) => {
    git('add', '--all');
    const head = git(
      'commit-tree',
      git('write-tree'),
      ...(parent ? ['-p', parent] : []),
      '-m',
      'Fixture'
    );
    git('update-ref', 'HEAD', head);
    return head;
  };
  git('init', '--quiet', '--initial-branch=fixture');
  write('sample.txt', 'before\n');
  const base = commit();
  git('update-ref', 'refs/remotes/origin/main', base);
  write('sample.txt', 'after\n');
  const head = commit(base);
  const inspect = (baseRef = 'origin/main', headRef, failure) => {
    const script = `
      const { buildPrepushStamp } = require(${JSON.stringify(__filename.replace('.test.cjs', '.cjs'))});
      const { listLocalChangedFiles: listPrepushChangedFiles } = require(${JSON.stringify(path.resolve(__dirname, '../git-local-changes.cjs'))});
      const options = { repoRootPath: process.cwd(), diffFilter: 'ACMRD' };
      if (${JSON.stringify(failure)} !== undefined) options.runGitText = (args) => {
        if (args[0] === ${JSON.stringify(failure)}) throw new Error('Required Git query failed');
        return require('node:child_process').execFileSync('git', args, { encoding: 'utf8' });
      };
      console.log(JSON.stringify(buildPrepushStamp(listPrepushChangedFiles(options), options)));
    `;
    return JSON.parse(
      execFileSync(process.execPath, ['-e', script], {
        cwd: root,
        env: { ...env, GIT_BASE: baseRef, ...(headRef ? { GIT_HEAD: headRef } : {}) },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    );
  };
  return { root, git, write, commit, base, head, inspect };
}

test('real Git identities reuse equivalent aliases without hiding changed inputs or modes', (t) => {
  const { git, write, commit, base, head, inspect } = prepushRepository(t);
  const local = inspect(); // First push has no upstream: the validation is still usable.
  assert.deepEqual(inspect(base), local, 'base alias and SHA identify the same validation');

  const snapshot = inspect(base, 'HEAD');
  assert.deepEqual(inspect('origin/main', head), snapshot);
  assert.equal(isPrepushStampValid(snapshot, local), false, 'snapshot is not worktree validation');
  assert.equal(isPrepushStampValid(inspect(base, base), snapshot), false, 'selected head changed');

  git('update-ref', 'refs/heads/tracking', base);
  git('branch', '--set-upstream-to=tracking');
  const tracked = inspect();
  assert.notEqual(tracked.stateFingerprint, local.stateFingerprint);
  assert.equal(tracked.validationFingerprint, local.validationFingerprint);
  assert.equal(isPrepushStampValid(tracked, local), true);

  git('update-ref', 'refs/remotes/origin/main', head);
  assert.equal(isPrepushStampValid(inspect(), local), false, 'base ref moved');
  git('update-ref', 'refs/remotes/origin/main', base);
  commit(head);
  assert.equal(
    isPrepushStampValid(inspect(), local),
    false,
    'HEAD changed even with identical tree'
  );
  git('update-ref', 'HEAD', head);

  write('sample.txt', 'staged\n');
  git('add', 'sample.txt');
  const staged = inspect();
  assert.equal(isPrepushStampValid(staged, local), false);
  write('sample.txt', 'unstaged\n');
  const unstaged = inspect();
  assert.equal(isPrepushStampValid(unstaged, staged), false);
  write('extra.txt', 'one\n');
  const untracked = inspect();
  write('extra.txt', 'two\n');
  assert.equal(isPrepushStampValid(inspect(), untracked), false, 'untracked bytes changed');

  assert.throws(() => inspect('missing-base'), 'unresolved base must fail closed');
  assert.throws(() => inspect(base, 'missing-head'), 'unresolved selected head must fail closed');
  assert.throws(() => inspect(base, undefined, 'diff'), 'failed diff is not empty evidence');
  assert.throws(
    () => inspect(base, undefined, 'ls-files'),
    'failed inventory is not empty evidence'
  );
});

test('real Git retirement evidence stays complete beyond 1 MiB and invalidates tail changes', (t) => {
  const { root, git, write, commit, head, inspect } = prepushRepository(t);
  git('config', 'core.autocrlf', 'false');
  const retired = Array.from({ length: 77 }, (_, index) => `retired-${index}.md`);
  const content = `${'Governed retirement evidence '.repeat(3)}µ\n`.repeat(256);
  for (const filename of retired) write(filename, content);
  write('zz-tail.txt', 'before\n');
  const base = commit(head);
  git('update-ref', 'refs/remotes/origin/main', base);
  git('rm', '--', ...retired);
  write('zz-tail.txt', 'tail-one\n');
  git('add', 'zz-tail.txt');

  const environment = { ...createGitRepositoryEnvironment(), GIT_BASE: base };
  delete environment.GIT_HEAD;
  const diff = execFileSync('git', ['diff', '--cached', '--binary', '--diff-filter=ACMRD'], {
    cwd: root,
    env: environment,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  assert.ok(Buffer.byteLength(diff) > 1024 * 1024, 'real deletion patch exceeds old budget');
  assert.ok(diff.includes('deleted file mode 100644'));
  assert.ok(diff.includes(`--- a/${retired[0]}`));
  assert.ok(diff.includes(`--- a/${retired.at(-1)}`));
  assert.ok(
    Buffer.byteLength(diff.slice(0, diff.lastIndexOf('+tail-one'))) > 1024 * 1024,
    'changed tail bytes are beyond the old budget in the same native Git patch'
  );
  const oracleScript = `
    const { buildPrepushStamp } = require(${JSON.stringify(__filename.replace('.test.cjs', '.cjs'))});
      const { listLocalChangedFiles: listPrepushChangedFiles } = require(${JSON.stringify(path.resolve(__dirname, '../git-local-changes.cjs'))});
    const options = {
      repoRootPath: process.cwd(),
      diffFilter: 'ACMRD',
      runGitText: (args) => require('node:child_process').execFileSync('git', args, {
        encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
      })
    };
    console.log(JSON.stringify(buildPrepushStamp(listPrepushChangedFiles(options), options)));
  `;
  const oracle = JSON.parse(
    execFileSync(process.execPath, ['-e', oracleScript], {
      cwd: root,
      env: environment,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  );
  const actual = inspect(base);
  assert.deepEqual(actual, oracle, 'default acquisition hashes the same complete real Git bytes');
  assert.equal(actual.changedFiles.length, retired.length + 1);
  assert.deepEqual(inspect(base), actual, 'identical complete bytes preserve the stamp');

  write('zz-tail.txt', 'tail-two\n');
  git('add', 'zz-tail.txt');
  const mutated = inspect(base);
  assert.deepEqual(mutated.changedFiles, actual.changedFiles);
  assert.notEqual(mutated.validationFingerprint, actual.validationFingerprint);
  assert.notEqual(mutated.stateFingerprint, actual.stateFingerprint);
  assert.equal(isPrepushStampValid(actual, mutated), false, 'tail mutation cannot reuse success');
});

test('failed changed input preserves a receipt only reusable for its exact validated state', async (t) => {
  const { root, write, base } = prepushRepository(t);
  const comparisonRefs = ['GIT_BASE', 'GIT_HEAD'].map((key) => [key, process.env[key]]);
  t.after(() => {
    for (const [key, value] of comparisonRefs) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  process.env.GIT_BASE = base;
  delete process.env.GIT_HEAD;
  let executions = 0;
  let fail = true;
  const options = {
    repoRootPath: root,
    printPrepushPlan: () => {},
    executePrepushPlan: () => {
      executions += 1;
      if (fail) throw new Error('Validation failed');
    },
  };
  await assert.rejects(main([], options), /Validation failed/);
  assert.equal(readPrepushStamp(options), null, 'failure cannot fabricate evidence');
  fail = false;
  await main([], options);
  const successful = readPrepushStamp(options);
  assert.ok(successful);

  write('sample.txt', 'broken\n');
  fail = true;
  await main(['--plan'], options);
  assert.equal(executions, 2, 'planning does not execute validation');
  await assert.rejects(main([], options), /Validation failed/);
  assert.deepEqual(readPrepushStamp(options), successful);
  write('sample.txt', 'after\n');
  await main(['--hook'], options);
  assert.equal(executions, 3, 'restoring exact validated inputs avoids another run');

  fail = false;
  write('sample.txt', 'fixed differently\n');
  await main([], options);
  assert.equal(executions, 4, 'different content must execute validation');
  assert.notDeepEqual(readPrepushStamp(options), successful);
});
