/** Owned concern: prove the local pre-push validation router scope semantics. */
{
  const fs = require('node:fs');
  const path = require('node:path');
  const os = require('node:os');
  const { execFileSync } = require('node:child_process');
  const { createGitRepositoryEnvironment } = require('./lib/git-repository-environment.cjs');

  const test = require('node:test');
  const assert = require('node:assert/strict');

  const {
    buildPrepushPlan,
    buildPrepushStamp,
    classifyPrepushScope,
    commandLabel,
    isPrepushStampValid,
    main,
    parseArgs,
    validationLevelSatisfies,
  } = require('./verify-prepush.cjs');

  function stepIds(plan) {
    return plan.map((step) => step.id);
  }

  function assertIncludes(ids, expectedId) {
    assert.ok(ids.includes(expectedId), `Expected ${expectedId} in ${ids.join(', ')}`);
  }

  function assertExcludes(ids, unexpectedId) {
    assert.ok(!ids.includes(unexpectedId), `Did not expect ${unexpectedId} in ${ids.join(', ')}`);
  }

  test('web source change keeps default prepush on mechanical changed-file checks', () => {
    const plan = buildPrepushPlan(['apps/web/src/app/AppProviders.tsx']);
    const ids = stepIds(plan);

    assert.deepEqual(ids, ['verify-changed']);
    assertExcludes(ids, 'test-closeout-changed');
    assertExcludes(ids, 'test-verify-prepush');
    assertExcludes(ids, 'test-generated-docs-policy');
    assertExcludes(ids, 'test-pr-closeout');
    assertExcludes(ids, 'arch-deps');
    assertExcludes(ids, 'type-check-prepush');
    assertExcludes(ids, 'planning-db-inventory-check');
    assertExcludes(ids, 'docs-governance-document-unit-map');
    assertExcludes(ids, 'docs-governance-file-component-index');
    assertExcludes(ids, 'traceability-adr0');
  });

  test('accepted ADR change stays on changed-file docs gates by default', () => {
    const plan = buildPrepushPlan(['docs/adr/ADR-0056-web-ui-authority-is-server-projected.md']);
    const ids = stepIds(plan);

    assert.deepEqual(ids, ['verify-changed']);
    assertExcludes(ids, 'docs-governance-document-unit-map');
    assertExcludes(ids, 'docs-governance-file-component-index');
    assertExcludes(ids, 'docs-governance-changed-files');
    assertExcludes(ids, 'traceability-adr0');
    assertExcludes(ids, 'arch-deps');
    assertExcludes(ids, 'type-check-prepush');
  });

  test('governed runtime source change does not run traceability or code checks by default', () => {
    const plan = buildPrepushPlan(['packages/@dvt/engine/src/WorkflowEngine.ts']);
    const ids = stepIds(plan);

    assert.deepEqual(ids, ['verify-changed']);
    assertExcludes(ids, 'traceability-adr0');
    assertExcludes(ids, 'arch-deps');
    assertExcludes(ids, 'type-check-prepush');
    assertExcludes(ids, 'docs-governance-document-unit-map');
  });

  test('planning database script change includes only scoped mechanical planning checks', () => {
    const plan = buildPrepushPlan(['scripts/planning-db-query.cjs']);
    const ids = stepIds(plan);

    assert.deepEqual(ids, ['verify-changed']);
    assertExcludes(ids, 'docs-governance-document-unit-map');
    assertExcludes(ids, 'docs-governance-remediation-queue');
    assertExcludes(ids, 'arch-deps');
    assertExcludes(ids, 'type-check-prepush');
  });

  test('architecture dependency config change does not run dependency validation by default', () => {
    const plan = buildPrepushPlan(['.dependency-cruiser.cjs']);
    const ids = stepIds(plan);

    assert.deepEqual(ids, ['verify-changed']);
    assertExcludes(ids, 'arch-deps');
    assertExcludes(ids, 'type-check-prepush');
    assertExcludes(ids, 'docs-governance-document-unit-map');
    assertExcludes(ids, 'traceability-adr0');
  });

  test('full mode preserves all conditional validation groups', () => {
    const plan = buildPrepushPlan(['apps/web/src/main.tsx'], { full: true });
    const ids = stepIds(plan);

    assertIncludes(ids, 'verify-changed');
    assertExcludes(ids, 'governance-db-import');
    assertIncludes(ids, 'planning-db-inventory-check');
    assertIncludes(ids, 'test-closeout-changed');
    assertIncludes(ids, 'test-verify-prepush');
    assertIncludes(ids, 'test-generated-docs-policy');
    assertIncludes(ids, 'test-pr-closeout');
    assertIncludes(ids, 'docs-governance-document-unit-map');
    assertIncludes(ids, 'traceability-adr0');
    assertIncludes(ids, 'arch-deps');
    assertIncludes(ids, 'type-check-prepush');
  });

  test('full prepush runs changed-slice verification before expensive validation groups', () => {
    const plan = buildPrepushPlan(['packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts'], {
      full: true,
    });
    const ids = stepIds(plan);
    const verifyChangedIndex = ids.indexOf('verify-changed');

    assert.ok(verifyChangedIndex >= 0, 'Expected verify-changed in prepush plan');
    assert.ok(
      verifyChangedIndex < ids.indexOf('test-verify-prepush'),
      `Expected verify-changed before test-verify-prepush in ${ids.join(', ')}`
    );
    assert.ok(
      verifyChangedIndex < ids.indexOf('arch-deps'),
      `Expected verify-changed before arch-deps in ${ids.join(', ')}`
    );
  });

  test('clean default prepush has no local changed-slice work', () => {
    assert.deepEqual(buildPrepushPlan([]), []);
  });

  test('default prepush delegates changed-file routing to verify changed once', () => {
    const labels = buildPrepushPlan(['apps/web/src/app/AppProviders.tsx']).map(commandLabel);

    assert.deepEqual(labels, ['pnpm verify:changed']);
  });

  test('prepush hook arguments are parsed without changing normal preflight flags', () => {
    assert.deepEqual(parseArgs(['--hook']), { dryRun: false, full: false, hook: true });
    assert.deepEqual(parseArgs(['--full', '--hook']), { dryRun: false, full: true, hook: true });
  });

  test('prepush validation stamp skips only equivalent or stronger validation', () => {
    const changedFiles = ['apps/web/src/app/AppProviders.tsx'];
    const defaultStamp = buildPrepushStamp(changedFiles, {
      full: false,
      stateFingerprint: 'same-tree',
    });
    const fullStamp = buildPrepushStamp(changedFiles, {
      full: true,
      stateFingerprint: 'same-tree',
    });
    const expectedDefault = buildPrepushStamp(changedFiles, {
      full: false,
      stateFingerprint: 'same-tree',
    });
    const expectedFull = buildPrepushStamp(changedFiles, {
      full: true,
      stateFingerprint: 'same-tree',
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
        const { buildPrepushStamp, listPrepushChangedFiles } = require(${JSON.stringify(__filename.replace('.test.cjs', '.cjs'))});
        const options = { repoRootPath: process.cwd() };
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
    return { git, write, commit, base, head, inspect };
  }

  test('real Git identities reuse equivalent aliases without hiding changed inputs or modes', (t) => {
    const { git, write, commit, base, head, inspect } = prepushRepository(t);
    const local = inspect(); // First push has no upstream: the validation is still usable.
    assert.deepEqual(inspect(base), local, 'base alias and SHA identify the same validation');

    const snapshot = inspect(base, 'HEAD');
    assert.deepEqual(inspect('origin/main', head), snapshot);
    assert.equal(
      isPrepushStampValid(snapshot, local),
      false,
      'snapshot is not worktree validation'
    );
    assert.equal(
      isPrepushStampValid(inspect(base, base), snapshot),
      false,
      'selected head changed'
    );

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

  test('manual prepush reuses a matching validation stamp before rerunning changed checks', () => {
    const changedFiles = ['apps/web/src/app/AppProviders.tsx'];
    const stamp = buildPrepushStamp(changedFiles, {
      full: false,
      stateFingerprint: 'same-tree',
    });
    const calls = [];

    const status = main([], {
      changedFiles,
      stateFingerprint: 'same-tree',
      readPrepushStamp: () => stamp,
      removePrepushStamp: () => calls.push('remove'),
      executePrepushPlan: () => calls.push('execute'),
      writePrepushStamp: () => calls.push('write'),
      printPrepushPlan: () => {},
    });

    assert.equal(status, 0);
    assert.deepEqual(calls, []);
  });

  test('manual full prepush does not reuse a default changed validation stamp', () => {
    const changedFiles = ['apps/web/src/app/AppProviders.tsx'];
    const defaultStamp = buildPrepushStamp(changedFiles, {
      full: false,
      stateFingerprint: 'same-tree',
    });
    const calls = [];

    const status = main(['--full'], {
      changedFiles,
      stateFingerprint: 'same-tree',
      readPrepushStamp: () => defaultStamp,
      removePrepushStamp: () => calls.push('remove'),
      executePrepushPlan: () => calls.push('execute'),
      writePrepushStamp: () => calls.push('write'),
      printPrepushPlan: () => {},
    });

    assert.equal(status, 0);
    assert.deepEqual(calls, ['remove', 'execute', 'write']);
  });

  test('scope classification exposes reasons for skipped conditional groups', () => {
    const scope = classifyPrepushScope(['README.md']);

    assert.deepEqual(scope, {
      hasChangedFiles: true,
      needsPlanningDbInventory: false,
      needsGovernanceGlobal: false,
      needsFeatureMechanization: false,
      needsTraceabilityAdr0: false,
      needsCodeValidation: false,
    });
  });

  test('scope classification treats code validation as full-mode closeout work', () => {
    assert.deepEqual(classifyPrepushScope(['apps/web/src/main.tsx']), {
      hasChangedFiles: true,
      needsPlanningDbInventory: false,
      needsGovernanceGlobal: false,
      needsFeatureMechanization: true,
      needsTraceabilityAdr0: false,
      needsCodeValidation: false,
    });

    assert.deepEqual(classifyPrepushScope(['apps/web/src/main.tsx'], { full: true }), {
      hasChangedFiles: true,
      needsPlanningDbInventory: true,
      needsGovernanceGlobal: true,
      needsFeatureMechanization: true,
      needsTraceabilityAdr0: true,
      needsCodeValidation: true,
    });
  });

  test('command labels match the package commands operators see', () => {
    const plan = buildPrepushPlan(['traceability.config.json'], { full: true });
    const traceabilityStep = plan.find((step) => step.id === 'traceability-adr0');

    assert.equal(commandLabel(traceabilityStep), 'pnpm traceability:adr0');
  });

  test('package scripts route verify prepush through the owned script', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8')
    );

    assert.equal(packageJson.scripts['verify:prepush'], 'node scripts/verify-prepush.cjs');
    assert.equal(
      packageJson.scripts['test:verify-prepush'],
      'node --test scripts/verify-prepush.test.cjs'
    );
    assert.equal(packageJson.scripts['pr:closeout'], 'node scripts/pr-closeout.cjs');
    assert.equal(
      packageJson.scripts['test:pr-closeout'],
      'node --test scripts/pr-closeout.test.cjs'
    );
  });

  test('pre-push hook routes through verify prepush so the validation stamp can avoid duplication', () => {
    const hookSource = fs.readFileSync(path.resolve(__dirname, '..', '.husky', 'pre-push'), 'utf8');

    assert.match(hookSource, /pnpm -s verify:prepush -- --hook/);
    assert.match(hookSource, /pnpm -s verify:prepush -- --full --hook/);
    assert.doesNotMatch(hookSource, /pnpm -s verify:changed/);
  });

  test('api package exposes an owned lint command for local package validation', () => {
    const apiPackageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', 'apps', 'api', 'package.json'), 'utf8')
    );

    assert.equal(
      apiPackageJson.scripts.lint,
      'eslint "src/**/*.ts" "test/**/*.ts" "*.config.ts" --max-warnings 0'
    );
  });

  test('generated docs policy regression tests are wired into full prepush gate', () => {
    const plan = buildPrepushPlan(['docs/generated-docs-policy.json'], { full: true });
    const step = plan.find((candidate) => candidate.id === 'test-generated-docs-policy');

    assert.ok(step);
    assert.equal(commandLabel(step), 'node --test scripts/check-generated-docs-policy.test.cjs');
  });

  test('prepush router delegates repository path semantics to shared CI scope query', () => {
    const source = fs.readFileSync(path.resolve(__dirname, 'local-validation-plan.cjs'), 'utf8');
    const wrapperSource = fs.readFileSync(path.resolve(__dirname, 'verify-prepush.cjs'), 'utf8');

    assert.match(source, /repository-change-scope\.mjs/u);
    assert.match(wrapperSource, /local-validation-plan\.cjs/u);
    assert.doesNotMatch(source, /function isPlanningDbRelevant/u);
    assert.doesNotMatch(source, /function isGovernanceGlobalRelevant/u);
    assert.doesNotMatch(source, /function isFeatureMechanizationRelevant/u);
    assert.doesNotMatch(source, /function isCodeValidationRelevant/u);
  });
}
