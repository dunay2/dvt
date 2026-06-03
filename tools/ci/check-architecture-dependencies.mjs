/**
 * @file tools/ci/check-architecture-dependencies.mjs
 * @ownedConcern Repository architecture dependency and semantic ownership guard.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cruise } from 'dependency-cruiser';

export const ARCHITECTURE_DEPENDENCY_TARGETS = ['apps', 'packages'];
export const ADAPTER_CANONICAL_CONTRACT_RULE_NAME = 'no-adapters-own-canonical-contracts';
export const ADAPTER_SOURCE_FILE_PATTERN = /\.(?:cjs|js|mjs|ts|tsx)$/;
export const SKIPPED_DIRECTORY_NAMES = new Set([
  '.generated-docs',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
]);
export const VERSIONED_CANONICAL_CONTRACT_FILE_PATTERN =
  /^packages\/@dvt\/adapter-[^/]+\/src\/.*\.v\d+\.(?:cjs|js|mjs|ts|tsx)$/;
export const ADAPTER_CONTRACT_FOLDER_PATTERN =
  /^packages\/@dvt\/adapter-[^/]+\/src\/contracts(?:\/|$)/;
export const VERSIONED_CANONICAL_EXPORT_PATTERN =
  /^\s*export\s+(?:interface|type|const|class|enum)\s+\w+(?:Contract|Schema|Dto|DTO|Envelope)V\d+\b/m;

export function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

export function readArchitectureDependencyConfig(baseDir = process.cwd()) {
  return createRequire(import.meta.url)(resolve(baseDir, '.dependency-cruiser.cjs'));
}

export function listFilesRecursive(rootDir) {
  if (!existsSync(rootDir)) {
    return [];
  }

  return readdirSync(rootDir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED_DIRECTORY_NAMES.has(entry.name)) {
      return [];
    }

    const absolutePath = join(rootDir, entry.name);

    if (entry.isDirectory()) {
      return listFilesRecursive(absolutePath);
    }

    return entry.isFile() ? [absolutePath] : [];
  });
}

export function getAdapterCanonicalContractReason(relativePath, contents) {
  if (ADAPTER_CONTRACT_FOLDER_PATTERN.test(relativePath)) {
    return 'adapter source owns a contracts folder';
  }

  if (VERSIONED_CANONICAL_CONTRACT_FILE_PATTERN.test(relativePath)) {
    return 'adapter source owns a versioned canonical contract file';
  }

  if (VERSIONED_CANONICAL_EXPORT_PATTERN.test(contents)) {
    return 'adapter source exports a versioned canonical contract symbol';
  }

  return null;
}

export function collectAdapterCanonicalContractFindings(baseDir = process.cwd()) {
  const adapterRoot = join(baseDir, 'packages', '@dvt');

  return listFilesRecursive(adapterRoot)
    .map((absolutePath) => ({
      absolutePath,
      relativePath: normalizePath(relative(baseDir, absolutePath)),
    }))
    .filter(({ relativePath }) => /^packages\/@dvt\/adapter-[^/]+\/src\//.test(relativePath))
    .filter(({ relativePath }) => ADAPTER_SOURCE_FILE_PATTERN.test(relativePath))
    .flatMap(({ absolutePath, relativePath }) => {
      const reason = getAdapterCanonicalContractReason(
        relativePath,
        readFileSync(absolutePath, 'utf8')
      );

      return reason === null
        ? []
        : [
            {
              ruleName: ADAPTER_CANONICAL_CONTRACT_RULE_NAME,
              filePath: relativePath,
              reason,
            },
          ];
    });
}

export async function runDependencyCruise(baseDir = process.cwd()) {
  const config = readArchitectureDependencyConfig(baseDir);
  const report = await cruise(ARCHITECTURE_DEPENDENCY_TARGETS, {
    validate: true,
    ruleSet: { forbidden: config.forbidden ?? [] },
    baseDir,
    doNotFollow: config.options?.doNotFollow,
    exclude: config.options?.exclude,
    tsConfig: config.options?.tsConfig,
    outputType: 'json',
  });
  const cruiseResult =
    typeof report.output === 'string' ? JSON.parse(report.output) : report.output;

  return cruiseResult.summary.violations ?? [];
}

export function formatCruiseViolations(violations) {
  return violations.map(
    (violation) =>
      `${violation.rule.name}: ${violation.from}${violation.to ? ` -> ${violation.to}` : ''}`
  );
}

export function formatAdapterCanonicalContractFindings(findings) {
  return findings.map((finding) => `${finding.ruleName}: ${finding.filePath} (${finding.reason})`);
}

export async function runArchitectureDependencyGuard(baseDir = process.cwd()) {
  const dependencyViolations = await runDependencyCruise(baseDir);
  const adapterContractFindings = collectAdapterCanonicalContractFindings(baseDir);

  return {
    dependencyViolations,
    adapterContractFindings,
  };
}

export async function main() {
  const result = await runArchitectureDependencyGuard();
  const dependencyMessages = formatCruiseViolations(result.dependencyViolations);
  const adapterContractMessages = formatAdapterCanonicalContractFindings(
    result.adapterContractFindings
  );
  const messages = [...dependencyMessages, ...adapterContractMessages];

  if (messages.length > 0) {
    console.error('[architecture-dependencies] FAILED');
    for (const message of messages) {
      console.error(`- ${message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[architecture-dependencies] OK');
}

if ((process.argv[1] ? resolve(process.argv[1]) : '') === fileURLToPath(import.meta.url)) {
  await main();
}
