/** @ownedConcern Run and report the repository's architecture dependency guard. */
import { runDependencyCruiseReport } from './architecture-dependency-acquisition.mjs';
import {
  collectAdapterCanonicalContractFindings,
  formatAdapterCanonicalContractFindings,
} from './architecture-dependency-guard/adapter-contract-ownership.mjs';
import { collectApiProductionReachability } from './architecture-dependency-guard/api-production-reachability.mjs';
import {
  formatApiReachabilityFindings,
  formatApiReachabilityReport,
} from './architecture-dependency-guard/api-reachability-report.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export {
  SKIPPED_DIRECTORY_NAMES,
  listFilesRecursive,
  normalizePath,
} from './architecture-dependency-guard/source-files.mjs';
export {
  ADAPTER_CANONICAL_CONTRACT_RULE_NAME,
  ADAPTER_CONTRACT_FOLDER_PATTERN,
  ADAPTER_SOURCE_FILE_PATTERN,
  VERSIONED_CANONICAL_CONTRACT_FILE_PATTERN,
  VERSIONED_CANONICAL_EXPORT_PATTERN,
  collectAdapterCanonicalContractFindings,
  formatAdapterCanonicalContractFindings,
  getAdapterCanonicalContractReason,
} from './architecture-dependency-guard/adapter-contract-ownership.mjs';
export {
  API_PRODUCTION_ROOTS,
  API_REACHABILITY_CLASSIFICATIONS,
  REQUIRED_API_DEPLOYMENT_PROFILES,
} from './architecture-dependency-guard/api-reachability-policy.mjs';
export { collectApiDeploymentProfileEvidence } from './architecture-dependency-guard/api-profile-evidence.mjs';
export { classifyApiSourceReachability } from './architecture-dependency-guard/api-source-reachability.mjs';
export { collectApiExportReachabilityEvidence } from './architecture-dependency-guard/api-export-reachability.mjs';
export { collectApiReachabilityFindings } from './architecture-dependency-guard/api-reachability-findings.mjs';
export { collectApiProductionReachability } from './architecture-dependency-guard/api-production-reachability.mjs';
export {
  formatApiReachabilityFindings,
  formatApiReachabilityReport,
} from './architecture-dependency-guard/api-reachability-report.mjs';

export async function runDependencyCruise(baseDir = process.cwd()) {
  const cruiseResult = await runDependencyCruiseReport(baseDir);
  return cruiseResult.summary.violations ?? [];
}

export function formatCruiseViolations(violations) {
  return violations.map(
    (violation) =>
      `${violation.rule.name}: ${violation.from}${violation.to ? ` -> ${violation.to}` : ''}`
  );
}

export async function runArchitectureDependencyGuard(baseDir = process.cwd()) {
  const cruiseResult = await runDependencyCruiseReport(baseDir);
  const dependencyViolations = cruiseResult.summary.violations ?? [];
  const adapterContractFindings = collectAdapterCanonicalContractFindings(baseDir);
  const apiReachability = await collectApiProductionReachability(baseDir, { cruiseResult });

  return {
    dependencyViolations,
    adapterContractFindings,
    apiReachability,
  };
}

export async function main() {
  const result = await runArchitectureDependencyGuard();
  const dependencyMessages = formatCruiseViolations(result.dependencyViolations);
  const adapterContractMessages = formatAdapterCanonicalContractFindings(
    result.adapterContractFindings
  );
  const reachabilityMessages = formatApiReachabilityFindings(result.apiReachability.findings);
  const messages = [...dependencyMessages, ...adapterContractMessages, ...reachabilityMessages];

  console.log(formatApiReachabilityReport(result.apiReachability));

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
