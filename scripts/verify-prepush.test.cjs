/** Owned concern: prove the local pre-push validation router scope semantics. */
{
  const fs = require('node:fs');
  const path = require('node:path');

  const test = require('node:test');
  const assert = require('node:assert/strict');

  const {
    buildPrepushPlan,
    buildPrepushStamp,
    classifyPrepushScope,
    commandLabel,
    isPrepushStampValid,
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

    assert.deepEqual(ids, ['verify-changed', 'planning-db-inventory-check']);
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

  test('web package exposes an owned lint command for local package validation', () => {
    const webPackageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', 'apps', 'web', 'package.json'), 'utf8')
    );

    assert.equal(
      webPackageJson.scripts.lint,
      'eslint "src/**/*.{ts,tsx}" "cypress/**/*.{ts,tsx}" "*.config.ts" "*.config.mjs" "scripts/**/*.{ts,mjs,js,cjs}" --max-warnings 0'
    );
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
