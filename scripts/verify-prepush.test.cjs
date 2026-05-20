/** Owned concern: prove the local pre-push validation router scope semantics. */
{
  const fs = require('node:fs');
  const path = require('node:path');

  const test = require('node:test');
  const assert = require('node:assert/strict');

  const { buildPrepushPlan, classifyPrepushScope, commandLabel } = require('./verify-prepush.cjs');

  function stepIds(plan) {
    return plan.map((step) => step.id);
  }

  function assertIncludes(ids, expectedId) {
    assert.ok(ids.includes(expectedId), `Expected ${expectedId} in ${ids.join(', ')}`);
  }

  function assertExcludes(ids, unexpectedId) {
    assert.ok(!ids.includes(unexpectedId), `Did not expect ${unexpectedId} in ${ids.join(', ')}`);
  }

  test('web source change excludes global governance maps but keeps code checks', () => {
    const plan = buildPrepushPlan(['apps/web/src/app/AppProviders.tsx']);
    const ids = stepIds(plan);

    assertIncludes(ids, 'docs-workboard-check-changed');
    assertIncludes(ids, 'docs-arc-evidence-changed');
    assertIncludes(ids, 'test-verify-prepush');
    assertIncludes(ids, 'test-generated-docs-policy');
    assertIncludes(ids, 'arch-deps');
    assertIncludes(ids, 'type-check-prepush');
    assertExcludes(ids, 'planning-db-inventory-check');
    assertExcludes(ids, 'docs-governance-document-unit-map');
    assertExcludes(ids, 'docs-governance-file-component-index');
    assertExcludes(ids, 'traceability-adr0');
  });

  test('accepted ADR change includes governance global checks and ADR0 traceability', () => {
    const plan = buildPrepushPlan(['docs/adr/ADR-0056-web-ui-authority-is-server-projected.md']);
    const ids = stepIds(plan);

    assertIncludes(ids, 'docs-governance-document-unit-map');
    assertIncludes(ids, 'docs-governance-file-component-index');
    assertIncludes(ids, 'docs-governance-changed-files');
    assertIncludes(ids, 'traceability-adr0');
    assertExcludes(ids, 'arch-deps');
    assertExcludes(ids, 'type-check-prepush');
  });

  test('governed runtime source change includes ADR0 traceability and code checks', () => {
    const plan = buildPrepushPlan(['packages/@dvt/engine/src/WorkflowEngine.ts']);
    const ids = stepIds(plan);

    assertIncludes(ids, 'traceability-adr0');
    assertIncludes(ids, 'arch-deps');
    assertIncludes(ids, 'type-check-prepush');
    assertExcludes(ids, 'docs-governance-document-unit-map');
  });

  test('planning database script change includes planning and governance checks', () => {
    const plan = buildPrepushPlan(['scripts/planning-db-query.cjs']);
    const ids = stepIds(plan);

    assertIncludes(ids, 'planning-db-inventory-check');
    assertIncludes(ids, 'docs-governance-document-unit-map');
    assertIncludes(ids, 'docs-governance-remediation-queue');
    assertIncludes(ids, 'arch-deps');
    assertIncludes(ids, 'type-check-prepush');
  });

  test('architecture dependency config change keeps dependency architecture validation', () => {
    const plan = buildPrepushPlan(['.dependency-cruiser.cjs']);
    const ids = stepIds(plan);

    assertIncludes(ids, 'arch-deps');
    assertIncludes(ids, 'type-check-prepush');
    assertExcludes(ids, 'docs-governance-document-unit-map');
    assertExcludes(ids, 'traceability-adr0');
  });

  test('full mode preserves all conditional validation groups', () => {
    const plan = buildPrepushPlan(['apps/web/src/main.tsx'], { full: true });
    const ids = stepIds(plan);

    assertIncludes(ids, 'planning-db-inventory-check');
    assertIncludes(ids, 'docs-governance-document-unit-map');
    assertIncludes(ids, 'traceability-adr0');
    assertIncludes(ids, 'arch-deps');
    assertIncludes(ids, 'type-check-prepush');
  });

  test('changed-file lint and format gate runs before expensive validation groups', () => {
    const plan = buildPrepushPlan(['packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts']);
    const ids = stepIds(plan);
    const checkChangedIndex = ids.indexOf('check-changed');

    assert.ok(checkChangedIndex >= 0, 'Expected check-changed in prepush plan');
    assert.ok(
      checkChangedIndex < ids.indexOf('test-verify-prepush'),
      `Expected check-changed before test-verify-prepush in ${ids.join(', ')}`
    );
    assert.ok(
      checkChangedIndex < ids.indexOf('docs-arc-evidence-changed'),
      `Expected check-changed before docs-arc-evidence-changed in ${ids.join(', ')}`
    );
    assert.ok(
      checkChangedIndex < ids.indexOf('arch-deps'),
      `Expected check-changed before arch-deps in ${ids.join(', ')}`
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

  test('command labels match the package commands operators see', () => {
    const plan = buildPrepushPlan(['traceability.config.json']);
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

  test('web package exposes an owned lint command for local package validation', () => {
    const webPackageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', 'apps', 'web', 'package.json'), 'utf8')
    );

    assert.equal(
      webPackageJson.scripts.lint,
      'eslint "src/**/*.{ts,tsx}" "cypress/**/*.{ts,tsx}" "*.config.ts" "*.config.mjs" "scripts/**/*.{ts,mjs,js,cjs}" --max-warnings 0'
    );
  });

  test('generated docs policy regression tests are wired into prepush gate', () => {
    const plan = buildPrepushPlan(['docs/generated-docs-policy.json']);
    const step = plan.find((candidate) => candidate.id === 'test-generated-docs-policy');

    assert.ok(step);
    assert.equal(commandLabel(step), 'node --test scripts/check-generated-docs-policy.test.cjs');
  });

  test('prepush router delegates repository path semantics to shared CI scope query', () => {
    const source = fs.readFileSync(path.resolve(__dirname, 'verify-prepush.cjs'), 'utf8');

    assert.match(source, /repository-change-scope\.mjs/u);
    assert.doesNotMatch(source, /function isPlanningDbRelevant/u);
    assert.doesNotMatch(source, /function isGovernanceGlobalRelevant/u);
    assert.doesNotMatch(source, /function isFeatureMechanizationRelevant/u);
    assert.doesNotMatch(source, /function isCodeValidationRelevant/u);
  });
}
