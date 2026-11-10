#!/usr/bin/env node
/** Owned concern: run AI-local autofix before governed pre-push validation. */
{
  const { executeCommandPlan } = require('./lib/local-validation-executor.cjs');
  const { commandLabel, step } = require('./lib/local-validation-plan-values.cjs');

  function parseArgs(argv = process.argv.slice(2)) {
    const parsed = {
      dryRun: false,
      full: false,
    };

    for (const current of argv) {
      if (current === '--dry-run' || current === '--plan') {
        parsed.dryRun = true;
        continue;
      }
      if (current === '--full') {
        parsed.full = true;
        continue;
      }
      throw new Error(`Unknown argument: ${current}`);
    }

    return parsed;
  }

  function buildAgentPreflightPlan(options = {}) {
    const verifyArgs =
      options.full === true ? ['verify:prepush', '--', '--full'] : ['verify:prepush'];

    return [
      step('fix-changed', 'pnpm', 'fix:changed'),
      step('verify-prepush', 'pnpm', ...verifyArgs),
    ];
  }

  function printAgentPreflightPlan(plan) {
    console.log('[ai:preflight] planned steps:');
    for (const nextStep of plan) {
      console.log(`- ${nextStep.id}: ${commandLabel(nextStep)}`);
    }
  }

  function executeAgentPreflightPlan(plan, options = {}) {
    return executeCommandPlan(plan, {
      ...options,
      label: 'ai:preflight',
      throwOnError: options.throwOnError ?? true,
    });
  }

  async function main(argv = process.argv.slice(2)) {
    const args = parseArgs(argv);
    const plan = buildAgentPreflightPlan({ full: args.full });

    printAgentPreflightPlan(plan);
    if (!args.dryRun) {
      await executeAgentPreflightPlan(plan);
    }
  }

  if (require.main === module) {
    main().catch((error) => {
      console.error(`[ai:preflight] ${error.message}`);
      process.exitCode =
        Number.isInteger(error.exitCode) && error.exitCode > 0 && error.exitCode <= 255
          ? error.exitCode
          : 1;
    });
  }

  module.exports = {
    buildAgentPreflightPlan,
    executeAgentPreflightPlan,
    main,
    parseArgs,
    printAgentPreflightPlan,
  };
}
