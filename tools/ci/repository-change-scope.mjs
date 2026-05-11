/** Owned concern: classify changed repository files for local and remote CI scope routing. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { classifyScriptFilePath, isRepositoryCommandFile } from './repository-command-catalog.mjs';

export const ROOT_BUILD_INPUTS = Object.freeze([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
]);

export const ROOT_CI_POLICY_INPUTS = Object.freeze([
  '.dependency-cruiser.cjs',
  'eslint.config.cjs',
  '.prettierrc.json',
  'commitlint.config.cjs',
  'vitest.config.ts',
]);

const PLANNING_DB_DOCUMENTS = new Set([
  'docs/planning/status/db-surface-inventory.md',
  'docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md',
]);

const TRACEABILITY_CONFIG_FILES = new Set([
  'traceability.config.json',
  'traceability.manifest.json',
  'traceability.issue-baseline.json',
]);

const GOVERNANCE_COMMAND_DOMAINS = new Set(['docs-governance', 'planning-db']);
const CODE_VALIDATION_COMMAND_DOMAINS = new Set([
  'runtime-root',
  'runtime-capability',
  'contracts',
  'planning-db',
  'ci-tooling',
  'test-tooling',
  'developer-workflow',
  'unknown',
]);

export function normalizeRepositoryPath(filePath) {
  return String(filePath || '')
    .replaceAll('\\', '/')
    .replace(/^\.\/+/u, '');
}

function escapeRegexCharacter(character) {
  return /[|\\{}()[\]^$+?.]/u.test(character) ? `\\${character}` : character;
}

export function globToRegExp(pattern) {
  let source = '^';
  const normalizedPattern = normalizeRepositoryPath(pattern);

  for (let index = 0; index < normalizedPattern.length; index += 1) {
    const current = normalizedPattern[index];
    const next = normalizedPattern[index + 1];

    if (current === '*' && next === '*') {
      if (normalizedPattern[index + 2] === '/') {
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

export function matchesRepositoryPattern(filePath, pattern) {
  return globToRegExp(pattern).test(normalizeRepositoryPath(filePath));
}

export function matchesAnyRepositoryPattern(filePath, patterns) {
  return patterns.some((pattern) => matchesRepositoryPattern(filePath, pattern));
}

function readTraceabilityGovernedPaths(options = {}) {
  const repoRoot = options.repoRootPath || process.cwd();
  const traceabilityConfigPath =
    options.traceabilityConfigPath || path.join(repoRoot, 'traceability.config.json');

  try {
    const config = JSON.parse(readFileSync(traceabilityConfigPath, 'utf8'));
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

function isTraceabilityGovernedFile(filePath, options = {}) {
  const { governed, exempt } = readTraceabilityGovernedPaths(options);

  return (
    matchesAnyRepositoryPattern(filePath, governed) &&
    !matchesAnyRepositoryPattern(filePath, exempt)
  );
}

function isRootTypeScriptGraphInput(filePath) {
  return /^tsconfig[^/]*\.json$/u.test(filePath);
}

function isRootBuildInput(filePath) {
  return ROOT_BUILD_INPUTS.includes(filePath) || isRootTypeScriptGraphInput(filePath);
}

function isRootCiPolicyInput(filePath) {
  return ROOT_CI_POLICY_INPUTS.includes(filePath);
}

function isWorkflowPolicyInput(filePath) {
  return filePath.startsWith('.github/workflows/') || filePath.startsWith('.github/scripts/');
}

function commandClassForPath(filePath) {
  return isRepositoryCommandFile(filePath) ? classifyScriptFilePath(filePath) : undefined;
}

export function classifyRepositoryFileScope(filePath, options = {}) {
  const normalizedPath = normalizeRepositoryPath(filePath);
  const commandClass = commandClassForPath(normalizedPath);
  const repositoryCommandFile = commandClass !== undefined;
  const rootBuildInput = isRootBuildInput(normalizedPath);
  const rootCiPolicyInput = isRootCiPolicyInput(normalizedPath);
  const workflowPolicyInput = isWorkflowPolicyInput(normalizedPath);
  const runtimeSource =
    normalizedPath.startsWith('apps/') || normalizedPath.startsWith('packages/');
  const planningDbInventoryRelevant =
    commandClass?.domain === 'planning-db' ||
    normalizedPath.startsWith('tools/planning-db/') ||
    PLANNING_DB_DOCUMENTS.has(normalizedPath);
  const governanceGlobalRelevant =
    normalizedPath.startsWith('docs/') ||
    normalizedPath === 'docs/.manifest.json' ||
    normalizedPath === 'docs/generated-docs-policy.json' ||
    normalizedPath.startsWith('tools/docs/') ||
    normalizedPath.startsWith('tools/planning-db/') ||
    GOVERNANCE_COMMAND_DOMAINS.has(commandClass?.domain);
  const featureMechanizationRelevant =
    runtimeSource ||
    repositoryCommandFile ||
    normalizedPath.startsWith('tools/ci/') ||
    normalizedPath.startsWith('tools/docs/') ||
    normalizedPath.startsWith('docs/planning/proposals/mandatory/');
  const traceabilityRelevant =
    TRACEABILITY_CONFIG_FILES.has(normalizedPath) ||
    /^docs\/adr\/ADR-[^/]+\.md$/u.test(normalizedPath) ||
    isTraceabilityGovernedFile(normalizedPath, options);
  const codeValidationRelevant =
    runtimeSource ||
    rootBuildInput ||
    rootCiPolicyInput ||
    workflowPolicyInput ||
    CODE_VALIDATION_COMMAND_DOMAINS.has(commandClass?.domain);
  const runtimeWorkspaceFanout =
    rootBuildInput || commandClass?.runtimeFanout === true || commandClass?.domain === 'unknown';
  const changedFileValidationRelevant =
    rootCiPolicyInput ||
    workflowPolicyInput ||
    commandClass?.changedFileValidationRelevant === true ||
    normalizedPath === 'package.json';

  return {
    path: normalizedPath,
    commandClass,
    repositoryCommandFile,
    rootBuildInput,
    rootCiPolicyInput,
    workflowPolicyInput,
    planningDbInventoryRelevant,
    governanceGlobalRelevant,
    featureMechanizationRelevant,
    traceabilityRelevant,
    codeValidationRelevant,
    runtimeWorkspaceFanout,
    changedFileValidationRelevant,
  };
}

export function classifyRepositoryChangedScope(changedFiles, options = {}) {
  const fileScopes = Array.from(
    new Map(
      (changedFiles || [])
        .map(normalizeRepositoryPath)
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right))
        .map((filePath) => [filePath, classifyRepositoryFileScope(filePath, options)])
    ).values()
  );

  return {
    hasChangedFiles: fileScopes.length > 0,
    needsPlanningDbInventory: fileScopes.some((scope) => scope.planningDbInventoryRelevant),
    needsGovernanceGlobal: fileScopes.some((scope) => scope.governanceGlobalRelevant),
    needsFeatureMechanization: fileScopes.some((scope) => scope.featureMechanizationRelevant),
    needsTraceabilityAdr0: fileScopes.some((scope) => scope.traceabilityRelevant),
    needsCodeValidation: fileScopes.some((scope) => scope.codeValidationRelevant),
    runtimeWorkspaceFanout: fileScopes.some((scope) => scope.runtimeWorkspaceFanout),
    changedFileValidationRelevant: fileScopes.some((scope) => scope.changedFileValidationRelevant),
  };
}
