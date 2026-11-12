#!/usr/bin/env node
/**
 * Owned concern: parse pre-push invocation, await validation and authorize success receipts.
 * @baseline ADR-0053: validation evidence must retain complete input identity.
 * @decision Delegate plan construction, bounded execution and receipt identity to their owners.
 * @consequence Only completed validation can write reusable success evidence.
 * @version 1.0.0
 */
{
  const path = require('node:path');

  const { buildPrepushPlan, classifyPrepushScope } = require('./local-validation-plan.cjs');
  const { listLocalChangedFiles } = require('./git-local-changes.cjs');
  const { executeCommandPlan } = require('./lib/local-validation-executor.cjs');
  const { commandLabel } = require('./lib/local-validation-plan-values.cjs');
  const {
    buildPrepushStamp,
    isPrepushStampValid,
    readPrepushStamp,
    writePrepushStamp,
  } = require('./lib/prepush-validation-stamp.cjs');

  const repoRoot = path.resolve(__dirname, '..');

  function listPrepushChangedFiles(options = {}) {
    return listLocalChangedFiles({
      ...options,
      repoRootPath: options.repoRootPath || repoRoot,
      diffFilter: 'ACMRD',
    });
  }

  function executePrepushPlan(plan, options = {}) {
    return executeCommandPlan(plan, {
      ...options,
      label: 'verify:prepush',
      throwOnError: true,
    });
  }

  function parseArgs(argv) {
    return {
      dryRun: argv.includes('--dry-run') || argv.includes('--plan'),
      full: argv.includes('--full'),
      hook: argv.includes('--hook'),
    };
  }

  function printPrepushPlan(changedFiles, scope, plan) {
    console.log('[verify:prepush] Local push readiness; hosted merge acceptance remains required.');
    console.log('[verify:prepush] changed files:');
    if (changedFiles.length === 0) {
      console.log('- none');
    } else {
      for (const filePath of changedFiles) {
        console.log(`- ${filePath}`);
      }
    }

    console.log('[verify:prepush] scope:');
    for (const [key, value] of Object.entries(scope)) {
      console.log(`- ${key}: ${value}`);
    }

    console.log('[verify:prepush] planned steps:');
    for (const step of plan) {
      console.log(`- ${step.id}: ${commandLabel(step)}`);
    }
  }

  async function main(argv = process.argv.slice(2), options = {}) {
    const args = parseArgs(argv);
    const root = options.repoRootPath || repoRoot;
    const changedFiles =
      options.changedFiles || listPrepushChangedFiles({ ...options, repoRootPath: root });
    const scope = classifyPrepushScope(changedFiles, { full: args.full });
    const plan = buildPrepushPlan(changedFiles, { full: args.full });
    const expectedStamp = buildPrepushStamp(changedFiles, {
      full: args.full,
      repoRootPath: root,
      stateFingerprint: options.stateFingerprint,
      validationFingerprint: options.validationFingerprint,
    });
    const readStamp = options.readPrepushStamp || readPrepushStamp;
    const writeStamp = options.writePrepushStamp || writePrepushStamp;
    const executePlan = options.executePrepushPlan || executePrepushPlan;
    const printPlan = options.printPrepushPlan || printPrepushPlan;

    printPlan(changedFiles, scope, plan);
    if (isPrepushStampValid(readStamp({ repoRootPath: root }), expectedStamp)) {
      const source = args.hook ? 'pre-push validation' : 'validation';
      console.log(
        `[verify:prepush] matching successful ${source} stamp found; skipping duplicate run.`
      );
      return 0;
    }
    if (!args.dryRun) {
      await executePlan(plan, { repoRootPath: root });
      writeStamp(expectedStamp, { repoRootPath: root });
    }
    return 0;
  }

  if (require.main === module) {
    main().catch((error) => {
      console.error(`[verify:prepush] ${error.message}`);
      process.exitCode =
        Number.isInteger(error.exitCode) && error.exitCode > 0 && error.exitCode <= 255
          ? error.exitCode
          : 1;
    });
  }

  module.exports = {
    executePrepushPlan,
    listPrepushChangedFiles,
    main,
    parseArgs,
  };
}
