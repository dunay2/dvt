/**
 * Owned concern: compose ordered local validation obligations without executing them.
 * @baseline Local Changed Files Gate: admission and static checks precede selected tests.
 * @decision Delegate selection, coverage, step identity and execution to their concrete owners.
 * @consequence Plans remain reviewable read models with unchanged acceptance obligations.
 * @version 1.0.0
 */
const path = require('node:path');
const { classifyRepositoryChangedScope } = require('../tools/ci/repository-change-scope.mjs');
const {
  step,
  testStep,
  normalizeChangedFiles,
  pushSteps,
  pushStepOnce,
} = require('./lib/local-validation-plan-values.cjs');
const { buildFocusedChangedTestPlan } = require('./lib/changed-test-selection.cjs');
const repoRoot = path.resolve(__dirname, '..');

const MECHANICAL_PREPUSH_STEPS = Object.freeze([
  step('verify-changed', 'pnpm', 'verify:changed', '--push-readiness'),
]);

const VERIFY_CHANGED_PRE_TEST_STEPS = Object.freeze([
  step(
    'knowledge-intake-retirement-check',
    'pnpm',
    'planning:db:knowledge-intake:retirement:check'
  ),
  step('docs-gov-locations-changed', 'pnpm', 'docs:gov:locations', '--', '--changed-only'),
  step('docs-gov-filenames-changed', 'pnpm', 'docs:gov:filenames:changed'),
  step('docs-gov-frontmatter-changed', 'pnpm', 'docs:gov:frontmatter:changed'),
  step('arc-evidence-changed', 'pnpm', 'docs:arc:evidence:check', '--', '--changed-only'),
  step('qa-artifact-check', 'pnpm', 'qa:artifact:check'),
  step('lint-md-changed', 'pnpm', 'lint:md:changed'),
  step('feature-mechanization-implementation', 'pnpm', 'docs:feature-mechanization:implementation'),
  step('check-changed', 'node', 'scripts/check-changed.cjs'),
]);

const VERIFY_CHANGED_POST_TEST_STEPS = Object.freeze([
  step('forbidden-tracked-files', 'node', 'scripts/check-forbidden-tracked-files.cjs'),
]);

const PREPUSH_GROUPS = Object.freeze({
  fullOnly: Object.freeze([
    testStep('test-closeout-changed', 'pnpm', 'test:closeout-changed'),
    testStep('test-verify-prepush', 'pnpm', 'test:verify-prepush'),
    testStep(
      'test-generated-docs-policy',
      'node',
      '--test',
      'scripts/check-generated-docs-policy.test.cjs'
    ),
    testStep('test-pr-closeout', 'pnpm', 'test:pr-closeout'),
  ]),
  planningDb: Object.freeze([
    step('planning-db-inventory-check', 'pnpm', 'planning:db:inventory:check'),
    step('planning-db-integrity-check', 'pnpm', 'planning:db:integrity:check'),
  ]),
  governanceGlobal: Object.freeze([
    step('docs-gov-generated-policy', 'pnpm', 'docs:gov:generated-policy'),
    step('docs-governance-unit-coverage', 'pnpm', 'docs:governance:unit-coverage'),
    step('docs-governance-document-unit-map', 'pnpm', 'docs:governance:document-unit-map:check'),
    step(
      'docs-governance-file-component-index',
      'pnpm',
      'docs:governance:file-component-index:check'
    ),
    step(
      'docs-governance-file-fingerprint-baseline',
      'pnpm',
      'docs:governance:file-fingerprint-baseline:check'
    ),
    step(
      'docs-governance-file-fingerprint-impact',
      'pnpm',
      'docs:governance:file-fingerprint-impact:check'
    ),
    step('docs-governance-coverage-report', 'pnpm', 'docs:governance:coverage-report:check'),
    step('docs-governance-remediation-queue', 'pnpm', 'docs:governance:remediation-queue:check'),
    step('docs-governance-changed-files', 'pnpm', 'docs:governance:changed-files:check'),
  ]),
  featureMechanizationFull: Object.freeze([
    step('docs-feature-mechanization', 'pnpm', 'docs:feature-mechanization'),
  ]),
  traceability: Object.freeze([step('traceability-adr0', 'pnpm', 'traceability:adr0')]),
  codeValidation: Object.freeze([
    step('arch-deps', 'pnpm', 'arch:deps'),
    step('type-check-prepush', 'node', 'scripts/type-check-prepush.cjs'),
  ]),
});

function classifyPrepushScope(changedFiles, options = {}) {
  const full = options.full === true;
  const scope = classifyRepositoryChangedScope(changedFiles, {
    repoRootPath: options.repoRootPath || repoRoot,
  });

  return {
    hasChangedFiles: scope.hasChangedFiles,
    needsPlanningDbInventory: full,
    needsGovernanceGlobal: full,
    needsFeatureMechanization: full || scope.needsFeatureMechanization,
    needsTraceabilityAdr0: full || scope.needsTraceabilityAdr0,
    needsCodeValidation: full,
  };
}

function buildPrepushPlan(changedFiles, options = {}) {
  const scope = classifyPrepushScope(changedFiles, options);
  const plan = [];

  if (scope.hasChangedFiles) {
    pushSteps(plan, MECHANICAL_PREPUSH_STEPS);
  }
  if (options.full === true) {
    pushSteps(plan, PREPUSH_GROUPS.fullOnly);
  }
  if (scope.needsPlanningDbInventory) {
    pushSteps(plan, PREPUSH_GROUPS.planningDb);
  }
  if (scope.needsGovernanceGlobal) {
    pushSteps(plan, PREPUSH_GROUPS.governanceGlobal);
  }
  if (scope.needsFeatureMechanization && options.full === true) {
    pushSteps(plan, PREPUSH_GROUPS.featureMechanizationFull);
  }
  if (scope.needsTraceabilityAdr0) {
    pushSteps(plan, PREPUSH_GROUPS.traceability);
  }
  if (scope.needsCodeValidation) {
    pushSteps(plan, PREPUSH_GROUPS.codeValidation);
  }

  return plan;
}

function buildVerifyChangedPlan(files, options = {}) {
  const changedFiles = normalizeChangedFiles(files);
  if (changedFiles.length === 0) return [];
  const plan = [];
  pushStepOnce(plan, VERIFY_CHANGED_PRE_TEST_STEPS[0]);
  if (
    !options.iteration &&
    classifyRepositoryChangedScope(changedFiles, { repoRootPath: repoRoot })
      .needsPlanningDbInventory
  ) {
    pushSteps(plan, PREPUSH_GROUPS.planningDb);
  }
  pushSteps(
    plan,
    VERIFY_CHANGED_PRE_TEST_STEPS.slice(1).filter(
      (entry) => !options.iteration || entry.id !== 'feature-mechanization-implementation'
    )
  );
  pushSteps(
    plan,
    buildFocusedChangedTestPlan(changedFiles, {
      includeWeb: true,
      iteration: options.iteration,
      pushReadiness: options.pushReadiness,
    })
  );
  pushSteps(plan, VERIFY_CHANGED_POST_TEST_STEPS);
  return plan;
}

module.exports = { buildVerifyChangedPlan, buildPrepushPlan, classifyPrepushScope };
