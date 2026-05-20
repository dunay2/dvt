#!/usr/bin/env node
/** Owned concern: run the fast changed-slice verification gate. */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { listLocalChangedFiles } = require('./git-local-changes.cjs');

const repoRoot = path.resolve(__dirname, '..');

const BASE_STEPS = Object.freeze([
  {
    id: 'docs-workboard-check-changed',
    command: 'node',
    args: ['scripts/docs-workboard-check-changed.cjs'],
  },
  {
    id: 'docs-gov-locations-changed',
    command: 'pnpm',
    args: ['docs:gov:locations', '--', '--changed-only'],
  },
  {
    id: 'docs-gov-filenames-changed',
    command: 'pnpm',
    args: ['docs:gov:filenames:changed'],
  },
  {
    id: 'docs-gov-frontmatter-changed',
    command: 'pnpm',
    args: ['docs:gov:frontmatter:changed'],
  },
  {
    id: 'arc-evidence-changed',
    command: 'pnpm',
    args: ['docs:arc:evidence:check', '--', '--changed-only'],
  },
  {
    id: 'qa-artifact-check',
    command: 'pnpm',
    args: ['qa:artifact:check'],
  },
  {
    id: 'lint-md-changed',
    command: 'pnpm',
    args: ['lint:md:changed'],
  },
  {
    id: 'feature-mechanization-implementation',
    command: 'pnpm',
    args: ['docs:feature-mechanization:implementation'],
  },
  {
    id: 'check-changed',
    command: 'node',
    args: ['scripts/check-changed.cjs'],
  },
  {
    id: 'forbidden-tracked-files',
    command: 'node',
    args: ['scripts/check-forbidden-tracked-files.cjs'],
  },
]);

const PLANNING_DB_STEPS = Object.freeze([
  {
    id: 'planning-db-inventory-check',
    command: 'pnpm',
    args: ['planning:db:inventory:check'],
  },
  {
    id: 'test-planning-db',
    command: 'pnpm',
    args: ['test:planning:db'],
  },
]);

const DEVELOPER_WORKFLOW_SELF_TEST_STEPS = Object.freeze([
  {
    id: 'test-verify-changed',
    command: 'node',
    args: ['--test', 'scripts/verify-changed.test.cjs'],
  },
]);

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
  return changedFiles.some((filePath) =>
    matchesAny(filePath, [
      'infra/planning-db/',
      'tools/planning-db/',
      'tools/governance-db/',
      'docs/planning/status/db-surface-inventory.md',
      /^scripts\/(?:planning-db-|governance-db-|governance-refresh|generate-workboard|generate-planning-lanes)/u,
    ])
  );
}

function hasDeveloperWorkflowVerifierChange(changedFiles) {
  return changedFiles.some((filePath) =>
    ['scripts/verify-changed.cjs', 'scripts/verify-changed.test.cjs'].includes(filePath)
  );
}

function pushStepOnce(plan, step) {
  if (!plan.some((existing) => existing.id === step.id)) {
    plan.push({ ...step });
  }
}

function buildVerifyChangedPlan(files) {
  const changedFiles = normalizeChangedFiles(files);
  if (changedFiles.length === 0) {
    return [];
  }

  const plan = [];
  for (const step of BASE_STEPS.slice(0, 1)) {
    pushStepOnce(plan, step);
  }

  if (hasPlanningDbChange(changedFiles)) {
    pushStepOnce(plan, PLANNING_DB_STEPS[0]);
  }

  for (const step of BASE_STEPS.slice(1, 8)) {
    pushStepOnce(plan, step);
  }

  if (hasPlanningDbChange(changedFiles)) {
    pushStepOnce(plan, PLANNING_DB_STEPS[1]);
  }

  if (hasDeveloperWorkflowVerifierChange(changedFiles)) {
    for (const step of DEVELOPER_WORKFLOW_SELF_TEST_STEPS) {
      pushStepOnce(plan, step);
    }
  }

  for (const step of BASE_STEPS.slice(8)) {
    pushStepOnce(plan, step);
  }

  return plan;
}

function commandLabel(step) {
  return [step.command, ...(step.args || [])].join(' ');
}

function executeVerifyChangedPlan(plan, options = {}) {
  const spawn = options.spawn || spawnSync;

  for (const step of plan) {
    console.log(`[verify:changed] ${commandLabel(step)}`);
    const result = spawn(step.command, step.args || [], {
      cwd: options.repoRootPath || repoRoot,
      shell: true,
      stdio: 'inherit',
    });

    if (result.error) {
      console.error(result.error.message);
      return 1;
    }

    if (result.status !== 0) {
      return result.status || 1;
    }
  }

  return 0;
}

function parseArgs(argv) {
  const args = { dryRun: false };
  for (const arg of argv) {
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printPlan(changedFiles, plan) {
  if (changedFiles.length === 0) {
    console.log('[verify:changed] No changed files detected. Skipping changed-slice verification.');
    return;
  }

  console.log('[verify:changed] Changed files:');
  for (const filePath of changedFiles) {
    console.log(filePath);
  }

  console.log('[verify:changed] Planned checks:');
  for (const step of plan) {
    console.log(commandLabel(step));
  }
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const changedFiles = normalizeChangedFiles(listLocalChangedFiles({ repoRootPath: repoRoot }));
  const plan = buildVerifyChangedPlan(changedFiles);

  if (args.dryRun || plan.length === 0) {
    printPlan(changedFiles, plan);
    return 0;
  }

  return executeVerifyChangedPlan(plan, { repoRootPath: repoRoot });
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  buildVerifyChangedPlan,
  commandLabel,
  executeVerifyChangedPlan,
  hasDeveloperWorkflowVerifierChange,
  hasPlanningDbChange,
  main,
  normalizeChangedFiles,
  parseArgs,
};
