#!/usr/bin/env node
/** Owned concern: run the local pre-push validation command plan. */
{
  const path = require('node:path');

  const {
    buildPrepushPlan,
    classifyPrepushScope,
    commandLabel,
    executeCommandPlan,
  } = require('./local-validation-plan.cjs');
  const { listLocalChangedFiles } = require('./git-local-changes.cjs');

  const repoRoot = path.resolve(__dirname, '..');

  function listPrepushChangedFiles(options = {}) {
    return listLocalChangedFiles({
      ...options,
      repoRootPath: options.repoRootPath || repoRoot,
      diffFilter: 'ACMRD',
    });
  }

  function executePrepushPlan(plan, options = {}) {
    executeCommandPlan(plan, {
      ...options,
      label: 'verify:prepush',
      throwOnError: true,
    });
  }

  function parseArgs(argv) {
    return {
      dryRun: argv.includes('--dry-run') || argv.includes('--plan'),
      full: argv.includes('--full'),
    };
  }

  function printPrepushPlan(changedFiles, scope, plan) {
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

  function main(argv = process.argv.slice(2)) {
    const args = parseArgs(argv);
    const changedFiles = listPrepushChangedFiles({ repoRootPath: repoRoot });
    const scope = classifyPrepushScope(changedFiles, { full: args.full });
    const plan = buildPrepushPlan(changedFiles, { full: args.full });

    printPrepushPlan(changedFiles, scope, plan);
    if (!args.dryRun) {
      executePrepushPlan(plan, { repoRootPath: repoRoot });
    }
  }

  if (require.main === module) {
    try {
      main();
    } catch (error) {
      console.error(`[verify:prepush] ${error.message}`);
      process.exit(1);
    }
  }

  module.exports = {
    buildPrepushPlan,
    classifyPrepushScope,
    commandLabel,
    executePrepushPlan,
    listPrepushChangedFiles,
  };
}
