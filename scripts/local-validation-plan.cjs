/** Owned concern: shared local validation plan definitions and execution helpers. */
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const { classifyRepositoryChangedScope } = require('../tools/ci/repository-change-scope.mjs');

const repoRoot = path.resolve(__dirname, '..');
const PLANNING_WORKFLOW_SCRIPT_TESTS = Object.freeze({
  'scripts/ai-preflight.cjs': 'scripts/ai-preflight.test.cjs',
  'scripts/ai-preflight.test.cjs': 'scripts/ai-preflight.test.cjs',
  'scripts/closeout-changed.cjs': 'scripts/closeout-changed.test.cjs',
  'scripts/closeout-changed.test.cjs': 'scripts/closeout-changed.test.cjs',
  'scripts/check-governance-unit-coverage.cjs': 'scripts/check-governance-unit-coverage.test.cjs',
  'scripts/check-governance-unit-coverage.test.cjs':
    'scripts/check-governance-unit-coverage.test.cjs',
  'scripts/generate-governance-coverage-report.cjs':
    'scripts/generate-governance-coverage-report.test.cjs',
  'scripts/generate-governance-coverage-report.test.cjs':
    'scripts/generate-governance-coverage-report.test.cjs',
  'scripts/generate-governance-document-unit-map.cjs':
    'scripts/generate-governance-document-unit-map.test.cjs',
  'scripts/generate-governance-document-unit-map.test.cjs':
    'scripts/generate-governance-document-unit-map.test.cjs',
  'scripts/generate-governance-file-component-index.cjs':
    'scripts/generate-governance-file-component-index.test.cjs',
  'scripts/generate-governance-file-component-index.test.cjs':
    'scripts/generate-governance-file-component-index.test.cjs',
  'scripts/generate-governance-remediation-queue.cjs':
    'scripts/generate-governance-remediation-queue.test.cjs',
  'scripts/generate-governance-remediation-queue.test.cjs':
    'scripts/generate-governance-remediation-queue.test.cjs',
  'scripts/governance-db-check.cjs': 'scripts/governance-db-check.test.cjs',
  'scripts/governance-db-check.test.cjs': 'scripts/governance-db-check.test.cjs',
  'scripts/governance-db-export.cjs': 'scripts/governance-db-export.test.cjs',
  'scripts/governance-db-export.test.cjs': 'scripts/governance-db-export.test.cjs',
  'scripts/governance-db-import.cjs': 'scripts/governance-db-import.test.cjs',
  'scripts/governance-db-import.test.cjs': 'scripts/governance-db-import.test.cjs',
  'scripts/governance-generated-paths.test.cjs': 'scripts/governance-generated-paths.test.cjs',
  'scripts/governance-refresh.cjs': 'scripts/governance-refresh.test.cjs',
  'scripts/governance-refresh.test.cjs': 'scripts/governance-refresh.test.cjs',
  'scripts/git-local-changes.cjs': 'scripts/git-local-changes.test.cjs',
  'scripts/git-local-changes.test.cjs': 'scripts/git-local-changes.test.cjs',
  'scripts/planning-db-integrity-check.cjs': 'scripts/planning-db-integrity-check.test.cjs',
  'scripts/planning-db-integrity-check.test.cjs': 'scripts/planning-db-integrity-check.test.cjs',
  'scripts/planning-db-export.cjs': 'scripts/planning-db-export.test.cjs',
  'scripts/planning-db-export.test.cjs': 'scripts/planning-db-export.test.cjs',
  'scripts/planning-db/frontend-component-inventory.cjs':
    'scripts/planning-db-frontend-component-inventory.test.cjs',
  'scripts/planning-db-frontend-component-inventory.test.cjs':
    'scripts/planning-db-frontend-component-inventory.test.cjs',
  'scripts/planning-db/frontend-mechanical-truth-inventory.cjs':
    'scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs',
  'scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs':
    'scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs',
  'scripts/planning-db/knowledge-intake-retirement-guard.cjs':
    'scripts/planning-db-knowledge-intake-retirement-guard.test.cjs',
  'scripts/planning-db-knowledge-intake-retirement-guard.test.cjs':
    'scripts/planning-db-knowledge-intake-retirement-guard.test.cjs',
  'scripts/planning-db-import.cjs': 'scripts/planning-db-import.test.cjs',
  'scripts/planning-db-import.test.cjs': 'scripts/planning-db-import.test.cjs',
  'scripts/planning-db-schema.cjs': 'scripts/planning-db-schema.test.cjs',
  'scripts/planning-db-schema.test.cjs': 'scripts/planning-db-schema.test.cjs',
  'scripts/planning-db-current-schema-policy.cjs':
    'scripts/planning-db-current-schema-policy.test.cjs',
  'scripts/planning-db-current-schema-policy.test.cjs':
    'scripts/planning-db-current-schema-policy.test.cjs',
  'scripts/planning-db-operate.cjs': 'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-operate.test.cjs': 'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-operate-tests/architecture-parse.test.cjs':
    'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-operate-tests/architecture-plan.test.cjs':
    'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-operate-tests/cli.test.cjs': 'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-operate-tests/component-create.test.cjs':
    'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-operate-tests/db-surface.test.cjs': 'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-operate-tests/docs-resolution.test.cjs':
    'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-operate-tests/feature-mechanization.test.cjs':
    'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-operate-tests/helpers.cjs': 'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-operate-tests/task-idempotency.test.cjs':
    'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-operate-tests/task-parse.test.cjs': 'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-operate-tests/task-plan.test.cjs': 'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-query.cjs': 'scripts/planning-db-query.test.cjs',
  'scripts/planning-db-query.test.cjs': 'scripts/planning-db-query.test.cjs',
  'scripts/planning-db-query-tests/feature-mechanization.test.cjs':
    'scripts/planning-db-query.test.cjs',
  'scripts/planning-db-query-tests/fowler-analysis.test.cjs': 'scripts/planning-db-query.test.cjs',
  'scripts/planning-db-query-tests/governance-refresh.test.cjs':
    'scripts/planning-db-query.test.cjs',
  'scripts/planning-db-query-tests/helpers.cjs': 'scripts/planning-db-query.test.cjs',
  'scripts/planning-db/queries/component-integrity-query.cjs': 'scripts/planning-db-query.test.cjs',
  'scripts/planning-db/queries/rail-vocabulary-query.cjs': 'scripts/planning-db-query.test.cjs',
  'scripts/planning-db-run.cjs': 'scripts/planning-db-run.test.cjs',
  'scripts/planning-db-run.test.cjs': 'scripts/planning-db-run.test.cjs',
  'scripts/planning-db-surface-inventory-check.cjs':
    'scripts/planning-db-surface-inventory-check.test.cjs',
  'scripts/planning-db-surface-inventory-check.test.cjs':
    'scripts/planning-db-surface-inventory-check.test.cjs',
  'scripts/generate-db-surface-inventory.cjs': 'scripts/generate-db-surface-inventory.test.cjs',
  'scripts/generate-db-surface-inventory.test.cjs':
    'scripts/generate-db-surface-inventory.test.cjs',
});

function step(id, command, ...args) {
  return Object.freeze({ id, command, args });
}

const MECHANICAL_PREPUSH_STEPS = Object.freeze([step('verify-changed', 'pnpm', 'verify:changed')]);

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
]);

const VERIFY_CHANGED_POST_TEST_STEPS = Object.freeze([
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
    step('planning-db-integrity-check', 'pnpm', 'planning:db:integrity:check'),
    step('test-planning-db-current-schema', 'pnpm', 'test:planning:db:current-schema'),
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
      'tools/planning-db/knowledge/',
      'tools/governance-db/',
    ])
  );
}

function hasPlanningDbCurrentSchemaChange(changedFiles) {
  return changedFiles.some((filePath) =>
    [
      'tools/planning-db/schema.sql',
      'scripts/planning-db-schema.cjs',
      'scripts/planning-db-schema.test.cjs',
      'scripts/planning-db-current-schema-policy.cjs',
      'scripts/planning-db-current-schema-policy.test.cjs',
    ].includes(filePath)
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

function ciToolingTestPathFor(filePath) {
  if (!filePath.startsWith('tools/ci/')) {
    return null;
  }
  if (/\.test\.mjs$/u.test(filePath)) {
    return filePath;
  }
  if (!/\.mjs$/u.test(filePath)) {
    return null;
  }

  const parsedPath = path.posix.parse(filePath);
  const adjacentTestPath = path.posix.join(parsedPath.dir, `${parsedPath.name}.test.mjs`);
  return fs.existsSync(path.join(repoRoot, adjacentTestPath)) ? adjacentTestPath : null;
}

function ciToolingTestSteps(changedFiles) {
  return changedFiles
    .map(ciToolingTestPathFor)
    .filter((testPath) => testPath !== null)
    .map((testPath) =>
      step(`test-${path.posix.basename(testPath, '.test.mjs')}`, 'node', '--test', testPath)
    );
}

function documentationPublicationTestSteps(changedFiles) {
  const relevant = changedFiles.some(
    (filePath) =>
      filePath.startsWith('.github/workflows/') ||
      filePath === 'scripts/documentation-publication.cjs' ||
      filePath === 'scripts/documentation-publication.test.cjs'
  );
  return relevant
    ? [
        step(
          'test-documentation-publication',
          'node',
          '--test',
          'scripts/documentation-publication.test.cjs'
        ),
      ]
    : [];
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
    needsPlanningDbInventory: full,
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

function buildVerifyChangedPlan(files) {
  const changedFiles = normalizeChangedFiles(files);
  if (changedFiles.length === 0) {
    return [];
  }

  const plan = [];
  pushStepOnce(plan, VERIFY_CHANGED_PRE_TEST_STEPS[0]);
  if (hasPlanningDbChange(changedFiles)) {
    pushStepOnce(plan, VERIFY_CHANGED_GROUPS.planningDb[0]);
    pushStepOnce(plan, VERIFY_CHANGED_GROUPS.planningDb[1]);
  }
  pushSteps(plan, VERIFY_CHANGED_PRE_TEST_STEPS.slice(1));
  if (hasWebChange(changedFiles)) {
    pushSteps(plan, VERIFY_CHANGED_GROUPS.web);
  }
  pushSteps(plan, buildFocusedChangedTestPlan(changedFiles));

  pushSteps(plan, VERIFY_CHANGED_POST_TEST_STEPS);

  return plan;
}

function buildFocusedChangedTestPlan(files) {
  const changedFiles = normalizeChangedFiles(files);
  const plan = [];
  const directPlanningWorkflowTestSteps = planningWorkflowTestSteps(changedFiles);
  pushSteps(plan, directPlanningWorkflowTestSteps);
  pushSteps(plan, ciToolingTestSteps(changedFiles));
  pushSteps(plan, documentationPublicationTestSteps(changedFiles));
  const runsCurrentSchemaTestDirectly = directPlanningWorkflowTestSteps.some(
    (nextStep) => commandLabel(nextStep) === 'node --test scripts/planning-db-schema.test.cjs'
  );
  if (hasPlanningDbCurrentSchemaChange(changedFiles) && !runsCurrentSchemaTestDirectly) {
    pushStepOnce(plan, VERIFY_CHANGED_GROUPS.planningDb[2]);
  }
  if (hasPlanningDbFullSuiteChange(changedFiles)) {
    pushStepOnce(plan, VERIFY_CHANGED_GROUPS.planningDb[3]);
  }
  if (hasDeveloperWorkflowVerifierChange(changedFiles)) {
    for (const filePath of changedFiles) {
      if (filePath === 'scripts/local-validation-plan.cjs') {
        pushSteps(plan, VERIFY_CHANGED_GROUPS.developerWorkflowSelfTest);
        continue;
      }
      if (
        filePath === 'scripts/verify-changed.cjs' ||
        filePath === 'scripts/verify-changed.test.cjs'
      ) {
        pushStepOnce(plan, VERIFY_CHANGED_GROUPS.developerWorkflowSelfTest[0]);
        continue;
      }
      if (
        filePath === 'scripts/verify-prepush.cjs' ||
        filePath === 'scripts/verify-prepush.test.cjs'
      ) {
        pushStepOnce(plan, VERIFY_CHANGED_GROUPS.developerWorkflowSelfTest[1]);
      }
    }
  }

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
  buildFocusedChangedTestPlan,
  buildPrepushPlan,
  buildVerifyChangedPlan,
  classifyPrepushScope,
  commandLabel,
  ciToolingTestPathFor,
  ciToolingTestSteps,
  executeCommandPlan,
  hasDeveloperWorkflowVerifierChange,
  hasWebChange,
  hasPlanningDbChange,
  hasPlanningDbFullSuiteChange,
  hasPlanningDbCurrentSchemaChange,
  normalizeChangedFiles,
  planningWorkflowTestSteps,
};
