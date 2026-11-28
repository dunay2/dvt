/** @ownedConcern Compose source discovery and the API reachability evidence pipeline. */
import { runApiReachabilityCruiseReport } from '../architecture-dependency-acquisition.mjs';
import { listChangedFilesBetween } from '../git-diff-files.mjs';
import { dynamicPackageImports } from './api-dynamic-imports.mjs';
import { collectApiExportReachabilityEvidence } from './api-export-reachability.mjs';
import { collectApiDeploymentProfileEvidence } from './api-profile-evidence.mjs';
import { collectApiReachabilityFindings } from './api-reachability-findings.mjs';
import {
  API_SOURCE_FILE_PATTERN,
  API_TEST_FILE_PATTERN,
  applyDeploymentProfileClassifications,
} from './api-reachability-policy.mjs';
import { classifyApiSourceReachability } from './api-source-reachability.mjs';
import { normalizeCruiseModules } from './cruise-module-graph.mjs';
import { listFilesRecursive, normalizePath, readSourceContents } from './source-files.mjs';
import { relative, resolve } from 'node:path';

function listChangedApiSources() {
  try {
    return listChangedFilesBetween({ diffFilter: 'ACMR' }).filter((source) =>
      API_SOURCE_FILE_PATTERN.test(source)
    );
  } catch (error) {
    if (process.env.CI || process.env.GITHUB_ACTIONS) throw error;
    console.error(
      `[api-production-reachability] Git diff unavailable locally; regression comparison skipped: ${error.message}`
    );
    return [];
  }
}

export async function collectApiProductionReachability(baseDir = process.cwd(), options = {}) {
  const cruiseResult = options.cruiseResult ?? (await runApiReachabilityCruiseReport(baseDir));
  const modules = normalizeCruiseModules(cruiseResult.modules);
  const sourceFiles = listFilesRecursive(resolve(baseDir, 'apps/api/src'))
    .map((absolutePath) => normalizePath(relative(baseDir, absolutePath)))
    .filter((source) => API_SOURCE_FILE_PATTERN.test(source))
    .sort();
  const testRoots = modules
    .map(({ source }) => source)
    .filter((source) => API_TEST_FILE_PATTERN.test(source));
  const sourceContents = readSourceContents(baseDir, [
    ...sourceFiles,
    ...modules.map(({ source }) => source).filter((source) => API_TEST_FILE_PATTERN.test(source)),
  ]);
  const classified = classifyApiSourceReachability({
    modules,
    sourceFiles,
    testRoots,
    sourceContents,
  });
  const profileEvidence = collectApiDeploymentProfileEvidence({
    modules: classified.modules,
    productionSources: classified.productionSources,
    testSources: classified.testSources,
    sourceContents,
  });
  const profileClassifications = applyDeploymentProfileClassifications(
    classified.classifications,
    profileEvidence
  );
  const classifiedWithProfiles = { ...classified, classifications: profileClassifications };
  const exportEvidence = collectApiExportReachabilityEvidence({
    modules: classified.modules,
    productionSources: classified.productionSources,
    productionTypeSources: classified.productionTypeSources,
    testSources: classified.testSources,
    sourceContents,
  });
  const changedSourceFiles = options.changedSourceFiles ?? listChangedApiSources();
  const findings = collectApiReachabilityFindings({
    ...classifiedWithProfiles,
    changedSourceFiles,
    sourceContents,
    profileEvidence,
  });
  const dynamicImports = dynamicPackageImports(
    classified.modules,
    classified.productionSources,
    sourceContents
  );

  return {
    ...classifiedWithProfiles,
    profileEvidence,
    dynamicImports,
    exportEvidence,
    findings,
  };
}
