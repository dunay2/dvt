#!/usr/bin/env node
/** Owned concern: run the fast changed-slice verification gate. */
const path = require('node:path');

const {
  buildVerifyChangedPlan,
  commandLabel,
  executeCommandPlan,
  hasDeveloperWorkflowVerifierChange,
  hasPlanningDbChange,
  normalizeChangedFiles,
} = require('./local-validation-plan.cjs');
const { listLocalChangedFiles } = require('./git-local-changes.cjs');

const repoRoot = path.resolve(__dirname, '..');

function executeVerifyChangedPlan(plan, options = {}) {
  return executeCommandPlan(plan, {
    ...options,
    label: 'verify:changed',
  });
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
