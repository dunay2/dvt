#!/usr/bin/env node
/**
 * Owned concern: run the fast changed-slice verification gate.
 * Command/query rails: `RunChangedSliceVerification`, `ValidateChangedFiles`.
 */
const path = require('node:path');

const { buildVerifyChangedPlan } = require('./local-validation-plan.cjs');
const {
  buildFocusedChangedTestPlan,
  explainCiToolSelection,
} = require('./lib/changed-test-selection.cjs');
const {
  listCommittedChangedFiles,
  listLocalChangedFiles,
  resolveIterationComparison,
} = require('./git-local-changes.cjs');
const { createGitRepositoryEnvironment } = require('./lib/git-repository-environment.cjs');
const { executeCommandPlan } = require('./lib/local-validation-executor.cjs');
const { commandLabel, normalizeChangedFiles } = require('./lib/local-validation-plan-values.cjs');

const repoRoot = path.resolve(__dirname, '..');

function executeVerifyChangedPlan(plan, options = {}) {
  return executeCommandPlan(plan, {
    ...options,
    label: 'verify:changed',
  });
}

function parseArgs(argv) {
  const args = { dryRun: false, committedTests: false };
  for (const arg of argv) {
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (arg === '--committed-tests') {
      args.committedTests = true;
      continue;
    }
    if (arg === '--push-readiness' && !args.pushReadiness) {
      args.pushReadiness = true;
      continue;
    }
    if (arg.startsWith('--iteration-base=')) {
      const baseRef = arg.slice('--iteration-base='.length);
      if (!baseRef.trim() || args.iterationBase !== undefined) {
        throw new Error('Exactly one nonempty --iteration-base is required for iteration');
      }
      args.iterationBase = baseRef;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.iterationBase !== undefined && args.committedTests) {
    throw new Error('iteration and committed-tests cannot be combined');
  }
  if (args.pushReadiness && (args.iterationBase !== undefined || args.committedTests)) {
    throw new Error('push-readiness cannot be combined with partial iteration or committed-tests');
  }
  return args;
}

function printPlan(changedFiles, plan, context = {}) {
  console.log(`[verify:changed] scope ${JSON.stringify(context)}`);
  if (context.mode === 'iteration-partial') {
    console.log(
      '[verify:changed] Partial iteration feedback: no native browser, no global Planning DB validation, not acceptance; no success stamp will be written.'
    );
  }
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

async function main(argv = process.argv.slice(2), options = {}) {
  const args = parseArgs(argv);
  const root = options.repoRootPath || repoRoot;
  const iteration = args.iterationBase !== undefined;
  const comparison = iteration
    ? (options.resolveIterationComparison || resolveIterationComparison)({
        baseRef: args.iterationBase,
        repoRootPath: root,
      })
    : undefined;
  const changedFiles = iteration
    ? normalizeChangedFiles(
        (options.listLocalChangedFiles || listLocalChangedFiles)({
          strict: true,
          baseRef: comparison.baseSha,
          headRef: comparison.headSha,
          repoRootPath: root,
        })
      )
    : options.changedFiles ||
      normalizeChangedFiles(
        args.committedTests
          ? (options.listCommittedChangedFiles || listCommittedChangedFiles)({
              repoRootPath: root,
            })
          : listLocalChangedFiles({ repoRootPath: root })
      );
  const plan = args.committedTests
    ? buildFocusedChangedTestPlan(changedFiles)
    : buildVerifyChangedPlan(changedFiles, { iteration, pushReadiness: args.pushReadiness });
  const print = options.printPlan || printPlan;
  const executePlan = args.committedTests
    ? options.executeFocusedChangedTestPlan || executeVerifyChangedPlan
    : options.executeVerifyChangedPlan || executeVerifyChangedPlan;

  print(changedFiles, plan, {
    mode: iteration
      ? 'iteration-partial'
      : args.committedTests
        ? 'committed-tests'
        : args.pushReadiness
          ? 'push-readiness'
          : 'changed-slice',
    ...comparison,
    ...(iteration ? { acceptance: false, browser: false, globalPlanningDbValidation: false } : {}),
    ciTools: explainCiToolSelection(changedFiles),
  });
  if (args.dryRun || plan.length === 0) {
    return 0;
  }

  const status = await executePlan(plan, {
    repoRootPath: root,
    ...(iteration
      ? { env: { ...createGitRepositoryEnvironment(), GIT_BASE: comparison.baseSha, GIT_HEAD: '' } }
      : {}),
  });
  return status;
}

if (require.main === module) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode =
        Number.isInteger(error.exitCode) && error.exitCode > 0 && error.exitCode <= 255
          ? error.exitCode
          : 1;
    });
}

module.exports = {
  executeVerifyChangedPlan,
  main,
  parseArgs,
};
