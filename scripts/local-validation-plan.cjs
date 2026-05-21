/** Owned concern: shared local validation plan definitions and execution helpers. */
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { classifyRepositoryChangedScope } = require('../tools/ci/repository-change-scope.mjs');

const repoRoot = path.resolve(__dirname, '..');
const PLANNING_WORKFLOW_SCRIPT_TESTS = Object.freeze({
  'scripts/generate-planning-lanes.cjs': 'scripts/generate-planning-lanes.test.cjs',
  'scripts/generate-workboard.cjs': 'scripts/generate-workboard.test.cjs',
  'scripts/governance-db-check.cjs': 'scripts/governance-db-check.test.cjs',
  'scripts/governance-db-export.cjs': 'scripts/governance-db-export.test.cjs',
  'scripts/governance-db-import.cjs': 'scripts/governance-db-import.test.cjs',
  'scripts/governance-refresh.cjs': 'scripts/governance-refresh.test.cjs',
  'scripts/planning-db-check.cjs': 'scripts/planning-db-check.test.cjs',
  'scripts/planning-db-export.cjs': 'scripts/planning-db-export.test.cjs',
  'scripts/planning-db-import.cjs': 'scripts/planning-db-import.test.cjs',
  'scripts/planning-db-migrate.cjs': 'scripts/planning-db-migrate.test.cjs',
  'scripts/planning-db-operate.cjs': 'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-query.cjs': 'scripts/planning-db-query.test.cjs',
  'scripts/planning-db-run.cjs': 'scripts/planning-db-run.test.cjs',
  'scripts/planning-db-surface-inventory-check.cjs':
    'scripts/planning-db-surface-inventory-check.test.cjs',
});

function step(id, command, ...args) {
  return Object.freeze({ id, command, args });
}

const MECHANICAL_PREPUSH_STEPS = Object.freeze([step('verify-changed', 'pnpm', 'verify:changed')]);

const VERIFY_CHANGED_BASE_STEPS = Object.freeze([
  step('docs-workboard-check-changed', 'node', 'scripts/docs-workboard-check-changed.cjs'),
  step('docs-gov-locations-changed', 'pnpm', 'docs:gov:locations', '--', '--changed-only'),
  step('docs-gov-filenames-changed', 'pnpm', 'docs:gov:filenames:changed'),
  step('docs-gov-frontmatter-changed', 'pnpm', 'docs:gov:frontmatter:changed'),
  step('arc-evidence-changed', 'pnpm', 'docs:arc:evidence:check', '--', '--changed-only'),
  step('qa-artifact-check', 'pnpm', 'qa:artifact:check'),
  step('lint-md-changed', 'pnpm', 'lint:md:changed'),
  step('feature-mechanization-implementation', 'pnpm', 'docs:feature-mechanization:implementation'),
  step('check-changed', 'node', 'scripts/check-changed.cjs'),
  step('forbidden-tracked-files', 'node', 'scripts/check-forbidden-tracked-files.cjs'),
]);

const PREPUSH_GROUPS = Object.freeze({
  fullOnly: Object.freeze([
    step('test-closeout-changed', 'pnpm', 'test:closeout-changed'),
    step('test-verify-prepush', 'pnpm', 'test:verify-prepush'),
    step(
      'test-generated-docs-policy',
      'node',
      '--test',
      'scripts/check-generated-docs-policy.test.cjs'
    ),
    step('test-pr-closeout', 'pnpm', 'test:pr-closeout'),
  ]),
  planningDb: Object.freeze([
    step('planning-db-inventory-check', 'pnpm', 'planning:db:inventory:check'),
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
  featureMechanizationChanged: Object.freeze([
    step(
      'docs-feature-mechanization-implementation',
      'pnpm',
      'docs:feature-mechanization:implementation'
    ),
  ]),
  traceability: Object.freeze([step('traceability-adr0', 'pnpm', 'traceability:adr0')]),
  codeValidation: Object.freeze([
    step('arch-deps', 'pnpm', 'arch:deps'),
    step('type-check-prepush', 'node', 'scripts/type-check-prepush.cjs'),
  ]),
});

const VERIFY_CHANGED_GROUPS = Object.freeze({
  web: Object.freeze([step('test-web-changed', 'pnpm', 'test:web:changed')]),
  planningDb: Object.freeze([
    step('planning-db-inventory-check', 'pnpm', 'planning:db:inventory:check'),
    step('test-planning-db', 'pnpm', 'test:planning:db'),
  ]),
  developerWorkflowSelfTest: Object.freeze([
    step('test-verify-changed', 'node', '--test', 'scripts/verify-changed.test.cjs'),
    step('test-verify-prepush', 'node', '--test', 'scripts/verify-prepush.test.cjs'),
  ]),
});

function normalizeChangedFiles(files) {
  return Array.from(new Set(files.map((filePath) => filePath.replaceAll('\\', '/')))).sort();
}

function matchesAny(filePath, patterns) {
  return patterns.some((pattern) =>
    typeof pattern === 'string'
      ? filePath === pattern || filePath.startsWith(pattern)
      : pattern.test(filePath)
  );
}

function hasPlanningDbChange(changedFiles) {
  return classifyRepositoryChangedScope(changedFiles, { repoRootPath: repoRoot })
    .needsPlanningDbInventory;
}

function hasPlanningDbFullSuiteChange(changedFiles) {
  return changedFiles.some((filePath) =>
    matchesAny(filePath, [
      'infra/planning-db/',
      'tools/planning-db/',
      'tools/governance-db/',
      /^scripts\/(?:planning-db-|governance-db-).+\.test\.cjs$/u,
      'scripts/governance-generated-paths.test.cjs',
      'scripts/generate-workboard.test.cjs',
      'scripts/generate-planning-lanes.test.cjs',
    ])
  );
}

function planningWorkflowTestSteps(changedFiles) {
  return changedFiles
    .filter((filePath) => Object.hasOwn(PLANNING_WORKFLOW_SCRIPT_TESTS, filePath))
    .map((filePath) => {
      const testPath = PLANNING_WORKFLOW_SCRIPT_TESTS[filePath];
      return step(`test-${path.basename(testPath, '.test.cjs')}`, 'node', '--test', testPath);
    });
}

function hasWebChange(changedFiles) {
  return changedFiles.some((filePath) => filePath.startsWith('apps/web/'));
}

function hasDeveloperWorkflowVerifierChange(changedFiles) {
  return changedFiles.some((filePath) =>
    [
      'scripts/local-validation-plan.cjs',
      'scripts/verify-changed.cjs',
      'scripts/verify-changed.test.cjs',
      'scripts/verify-prepush.cjs',
      'scripts/verify-prepush.test.cjs',
    ].includes(filePath)
  );
}

function pushStepOnce(plan, nextStep) {
  if (!plan.some((existing) => existing.id === nextStep.id)) {
    plan.push({ ...nextStep });
  }
}

function pushSteps(plan, nextSteps) {
  for (const nextStep of nextSteps) {
    pushStepOnce(plan, nextStep);
  }
}

function classifyPrepushScope(changedFiles, options = {}) {
  const full = options.full === true;
  const scope = classifyRepositoryChangedScope(changedFiles, {
    repoRootPath: options.repoRootPath || repoRoot,
  });

  return {
    hasChangedFiles: scope.hasChangedFiles,
    needsPlanningDbInventory: full || scope.needsPlanningDbInventory,
    needsGovernanceGlobal: full,
    needsFeatureMechanization: full || scope.needsFeatureMechanization,
    needsTraceabilityAdr0: full,
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
  if (scope.needsPlanningDbInventory && options.full === true) {
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

function buildVerifyChangedPlan(files) {
  const changedFiles = normalizeChangedFiles(files);
  if (changedFiles.length === 0) {
    return [];
  }

  const plan = [];
  pushStepOnce(plan, VERIFY_CHANGED_BASE_STEPS[0]);
  if (hasPlanningDbChange(changedFiles)) {
    pushStepOnce(plan, VERIFY_CHANGED_GROUPS.planningDb[0]);
  }
  pushSteps(plan, VERIFY_CHANGED_BASE_STEPS.slice(1, 8));
  if (hasWebChange(changedFiles)) {
    pushSteps(plan, VERIFY_CHANGED_GROUPS.web);
  }
  pushSteps(plan, planningWorkflowTestSteps(changedFiles));
  if (hasPlanningDbFullSuiteChange(changedFiles)) {
    pushStepOnce(plan, VERIFY_CHANGED_GROUPS.planningDb[1]);
  }
  if (hasDeveloperWorkflowVerifierChange(changedFiles)) {
    pushSteps(plan, VERIFY_CHANGED_GROUPS.developerWorkflowSelfTest);
  }
  pushSteps(plan, VERIFY_CHANGED_BASE_STEPS.slice(8));

  return plan;
}

function commandLabel(nextStep) {
  return [nextStep.command, ...(nextStep.args || [])].join(' ');
}

function executeCommandPlan(plan, options = {}) {
  const spawn = options.spawn || spawnSync;
  for (const nextStep of plan) {
    console.log(`[${options.label || 'validation'}] ${commandLabel(nextStep)}`);
    const result = spawn(nextStep.command, nextStep.args || [], {
      cwd: options.repoRootPath || repoRoot,
      shell: options.shell ?? true,
      stdio: 'inherit',
    });

    if (result.error) {
      if (options.throwOnError) {
        throw result.error;
      }
      console.error(result.error.message);
      return 1;
    }
    if (result.status !== 0) {
      if (options.throwOnError) {
        throw new Error(`${commandLabel(nextStep)} failed with exit code ${result.status || 1}`);
      }
      return result.status || 1;
    }
  }
  return 0;
}

module.exports = {
  buildPrepushPlan,
  buildVerifyChangedPlan,
  classifyPrepushScope,
  commandLabel,
  executeCommandPlan,
  hasDeveloperWorkflowVerifierChange,
  hasWebChange,
  hasPlanningDbChange,
  hasPlanningDbFullSuiteChange,
  normalizeChangedFiles,
  planningWorkflowTestSteps,
};
