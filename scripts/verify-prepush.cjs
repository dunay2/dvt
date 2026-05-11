#!/usr/bin/env node
/** Owned concern: build and execute the local pre-push validation command plan. */
{
  const fs = require('node:fs');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');

  const { listLocalChangedFiles, toPosix } = require('./git-local-changes.cjs');

  const repoRoot = path.resolve(__dirname, '..');
  const traceabilityConfigPath = path.join(repoRoot, 'traceability.config.json');

  const UNIVERSAL_STEPS = [
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
      id: 'check-changed',
      command: 'node',
      args: ['scripts/check-changed.cjs'],
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

  function normalizeChangedFiles(changedFiles) {
    return Array.from(new Set((changedFiles || []).map(toPosix).filter(Boolean))).sort();
  }

  function escapeRegexCharacter(character) {
    return /[|\\{}()[\]^$+?.]/.test(character) ? `\\${character}` : character;
  }

  function globToRegExp(pattern) {
    let source = '^';
    for (let index = 0; index < pattern.length; index += 1) {
      const current = pattern[index];
      const next = pattern[index + 1];

      if (current === '*' && next === '*') {
        if (pattern[index + 2] === '/') {
          source += '(?:.*/)?';
          index += 2;
          continue;
        }
        source += '.*';
        index += 1;
        continue;
      }
      if (current === '*') {
        source += '[^/]*';
        continue;
      }
      source += escapeRegexCharacter(current);
    }

    return new RegExp(`${source}$`, 'u');
  }

  function matchesGlob(filePath, pattern) {
    return globToRegExp(toPosix(pattern).replace(/^\.\//u, '')).test(filePath);
  }

  function matchesAnyGlob(filePath, patterns) {
    return patterns.some((pattern) => matchesGlob(filePath, pattern));
  }

  function readTraceabilityGovernedPaths() {
    try {
      const config = JSON.parse(fs.readFileSync(traceabilityConfigPath, 'utf8'));
      return {
        governed: (config.governedPaths || []).filter((pattern) => !pattern.startsWith('!')),
        exempt: [
          ...(config.exemptPaths || []),
          ...(config.governedPaths || [])
            .filter((pattern) => pattern.startsWith('!'))
            .map((pattern) => pattern.slice(1)),
        ],
      };
    } catch {
      return {
        governed: [
          'packages/@dvt/traceability-service/src/**/*.ts',
          'packages/@dvt/engine/src/**/*.ts',
          'packages/@dvt/contracts/src/**/*.ts',
          'packages/@dvt/adapter-temporal/src/**/*.ts',
          'packages/@dvt/adapter-temporal/test/**/*.ts',
          'packages/@dvt/adapter-postgres/src/**/*.ts',
          'scripts/planning-db-query.cjs',
        ],
        exempt: ['apps/web/**', 'packages/frontend/**', '**/*.stories.tsx'],
      };
    }
  }

  function isTraceabilityGovernedFile(filePath) {
    const { governed, exempt } = readTraceabilityGovernedPaths();

    return matchesAnyGlob(filePath, governed) && !matchesAnyGlob(filePath, exempt);
  }

  function isPlanningDbRelevant(filePath) {
    return (
      /^scripts\/(?:planning-db|governance-db|governance-refresh|generate-workboard|generate-planning-lanes)[\w.-]*\.cjs$/u.test(
        filePath
      ) ||
      filePath.startsWith('tools/planning-db/') ||
      filePath === 'docs/planning/status/db-surface-inventory.md' ||
      filePath ===
        'docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md'
    );
  }

  function isGovernanceGlobalRelevant(filePath) {
    return (
      filePath.startsWith('docs/') ||
      filePath === 'docs/.manifest.json' ||
      filePath === 'docs/generated-docs-policy.json' ||
      filePath.startsWith('tools/docs/') ||
      filePath.startsWith('tools/planning-db/') ||
      /^scripts\/(?:check-(?:feature-mechanization|generated-docs-policy|governance|markdown-locations)|generate-(?:governance|code-status|capability-coverage|planning-lanes|workboard)|sync-docs|docs-|planning-db|governance-db|governance-refresh|lint-markdown-changed|validate-arc-evidence-frontmatter|qa-artifact-check)[\w.-]*\.(?:cjs|js)$/u.test(
        filePath
      ) ||
      filePath === 'package.json'
    );
  }

  function isFeatureMechanizationRelevant(filePath) {
    return (
      filePath.startsWith('apps/') ||
      filePath.startsWith('packages/') ||
      filePath.startsWith('scripts/') ||
      filePath.startsWith('tools/ci/') ||
      filePath.startsWith('tools/docs/') ||
      filePath.startsWith('docs/planning/proposals/mandatory/')
    );
  }

  function isTraceabilityRelevant(filePath) {
    return (
      filePath === 'traceability.config.json' ||
      filePath === 'traceability.manifest.json' ||
      filePath === 'traceability.issue-baseline.json' ||
      /^docs\/adr\/ADR-[^/]+\.md$/u.test(filePath) ||
      isTraceabilityGovernedFile(filePath)
    );
  }

  function isCodeValidationRelevant(filePath) {
    return (
      filePath.startsWith('apps/') ||
      filePath.startsWith('packages/') ||
      filePath.startsWith('scripts/') ||
      filePath.startsWith('tools/ci/') ||
      filePath.startsWith('.github/workflows/') ||
      filePath.startsWith('.github/scripts/') ||
      [
        'package.json',
        '.dependency-cruiser.cjs',
        'pnpm-lock.yaml',
        'pnpm-workspace.yaml',
        'turbo.json',
        'vitest.config.ts',
      ].includes(filePath) ||
      /^tsconfig[^/]*\.json$/u.test(filePath)
    );
  }

  function classifyPrepushScope(changedFiles, options = {}) {
    const normalizedChangedFiles = normalizeChangedFiles(changedFiles);
    const full = options.full === true;

    return {
      hasChangedFiles: normalizedChangedFiles.length > 0,
      needsPlanningDbInventory:
        full || normalizedChangedFiles.some((filePath) => isPlanningDbRelevant(filePath)),
      needsGovernanceGlobal:
        full || normalizedChangedFiles.some((filePath) => isGovernanceGlobalRelevant(filePath)),
      needsFeatureMechanization:
        full || normalizedChangedFiles.some((filePath) => isFeatureMechanizationRelevant(filePath)),
      needsTraceabilityAdr0:
        full || normalizedChangedFiles.some((filePath) => isTraceabilityRelevant(filePath)),
      needsCodeValidation:
        full || normalizedChangedFiles.some((filePath) => isCodeValidationRelevant(filePath)),
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
