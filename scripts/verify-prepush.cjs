#!/usr/bin/env node
/** Owned concern: build and execute the local pre-push validation command plan. */
{
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');

  const { classifyRepositoryChangedScope } = require('../tools/ci/repository-change-scope.mjs');
  const { listLocalChangedFiles } = require('./git-local-changes.cjs');

  const repoRoot = path.resolve(__dirname, '..');

  const UNIVERSAL_STEPS = [
    {
      id: 'docs-workboard-check-changed',
      command: 'node',
      args: ['scripts/docs-workboard-check-changed.cjs'],
    },
    {
      id: 'check-changed',
      command: 'node',
      args: ['scripts/check-changed.cjs'],
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
      id: 'test-closeout-changed',
      command: 'pnpm',
      args: ['test:closeout-changed'],
    },
    {
      id: 'test-verify-prepush',
      command: 'pnpm',
      args: ['test:verify-prepush'],
    },
    {
      id: 'test-pr-closeout',
      command: 'pnpm',
      args: ['test:pr-closeout'],
    },
    {
      id: 'docs-arc-evidence-changed',
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
      id: 'check-forbidden-tracked-files',
      command: 'node',
      args: ['scripts/check-forbidden-tracked-files.cjs'],
    },
  ];

  const PLANNING_DB_STEPS = [
    {
      id: 'planning-db-inventory-check',
      command: 'pnpm',
      args: ['planning:db:inventory:check'],
    },
  ];

  const GOVERNANCE_GLOBAL_STEPS = [
    {
      id: 'docs-gov-generated-policy',
      command: 'pnpm',
      args: ['docs:gov:generated-policy'],
    },
    {
      id: 'docs-governance-unit-coverage',
      command: 'pnpm',
      args: ['docs:governance:unit-coverage'],
    },
    {
      id: 'docs-governance-document-unit-map',
      command: 'pnpm',
      args: ['docs:governance:document-unit-map:check'],
    },
    {
      id: 'docs-governance-file-component-index',
      command: 'pnpm',
      args: ['docs:governance:file-component-index:check'],
    },
    {
      id: 'docs-governance-file-fingerprint-baseline',
      command: 'pnpm',
      args: ['docs:governance:file-fingerprint-baseline:check'],
    },
    {
      id: 'docs-governance-file-fingerprint-impact',
      command: 'pnpm',
      args: ['docs:governance:file-fingerprint-impact:check'],
    },
    {
      id: 'docs-governance-coverage-report',
      command: 'pnpm',
      args: ['docs:governance:coverage-report:check'],
    },
    {
      id: 'docs-governance-remediation-queue',
      command: 'pnpm',
      args: ['docs:governance:remediation-queue:check'],
    },
    {
      id: 'docs-governance-changed-files',
      command: 'pnpm',
      args: ['docs:governance:changed-files:check'],
    },
  ];

  const FEATURE_MECHANIZATION_STEPS = [
    {
      id: 'docs-feature-mechanization',
      command: 'pnpm',
      args: ['docs:feature-mechanization'],
    },
    {
      id: 'docs-feature-mechanization-implementation',
      command: 'pnpm',
      args: ['docs:feature-mechanization:implementation'],
    },
  ];

  const TRACEABILITY_STEPS = [
    {
      id: 'traceability-adr0',
      command: 'pnpm',
      args: ['traceability:adr0'],
    },
  ];

  const CODE_VALIDATION_STEPS = [
    {
      id: 'arch-deps',
      command: 'pnpm',
      args: ['arch:deps'],
    },
    {
      id: 'type-check-prepush',
      command: 'node',
      args: ['scripts/type-check-prepush.cjs'],
    },
  ];

  function classifyPrepushScope(changedFiles, options = {}) {
    const full = options.full === true;
    const scope = classifyRepositoryChangedScope(changedFiles, {
      repoRootPath: options.repoRootPath || repoRoot,
    });

    return {
      hasChangedFiles: scope.hasChangedFiles,
      needsPlanningDbInventory: full || scope.needsPlanningDbInventory,
      needsGovernanceGlobal: full || scope.needsGovernanceGlobal,
      needsFeatureMechanization: full || scope.needsFeatureMechanization,
      needsTraceabilityAdr0: full || scope.needsTraceabilityAdr0,
      needsCodeValidation: full || scope.needsCodeValidation,
    };
  }

  function pushSteps(steps, nextSteps) {
    for (const step of nextSteps) {
      if (!steps.some((candidate) => candidate.id === step.id)) {
        steps.push(step);
      }
    }
  }

  function buildPrepushPlan(changedFiles, options = {}) {
    const scope = classifyPrepushScope(changedFiles, options);
    const steps = [];

    pushSteps(steps, UNIVERSAL_STEPS);

    if (scope.needsPlanningDbInventory) {
      pushSteps(steps, PLANNING_DB_STEPS);
    }
    if (scope.needsGovernanceGlobal) {
      pushSteps(steps, GOVERNANCE_GLOBAL_STEPS);
    }
    if (scope.needsFeatureMechanization) {
      pushSteps(steps, FEATURE_MECHANIZATION_STEPS);
    }
    if (scope.needsTraceabilityAdr0) {
      pushSteps(steps, TRACEABILITY_STEPS);
    }
    if (scope.needsCodeValidation) {
      pushSteps(steps, CODE_VALIDATION_STEPS);
    }

    return steps;
  }

  function commandLabel(step) {
    return [step.command, ...step.args].join(' ');
  }

  function listPrepushChangedFiles(options = {}) {
    return listLocalChangedFiles({
      ...options,
      repoRootPath: options.repoRootPath || repoRoot,
      diffFilter: 'ACMRD',
    });
  }

  function runStep(step, options = {}) {
    const result = spawnSync(step.command, step.args, {
      cwd: options.repoRootPath || repoRoot,
      shell: true,
      stdio: 'inherit',
    });
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(`${commandLabel(step)} failed with exit code ${result.status || 1}`);
    }
  }

  function executePrepushPlan(plan, options = {}) {
    for (const step of plan) {
      console.log(`[verify:prepush] ${commandLabel(step)}`);
      runStep(step, options);
    }
  }

  function parseArgs(argv) {
    return {
      dryRun: argv.includes('--dry-run') || argv.includes('--plan'),
      full: argv.includes('--full'),
    };
  }

  function main(argv = process.argv.slice(2)) {
    const args = parseArgs(argv);
    const changedFiles = listPrepushChangedFiles({ repoRootPath: repoRoot });
    const scope = classifyPrepushScope(changedFiles, { full: args.full });
    const plan = buildPrepushPlan(changedFiles, { full: args.full });

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

    if (args.dryRun) {
      return;
    }

    executePrepushPlan(plan, { repoRootPath: repoRoot });
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
