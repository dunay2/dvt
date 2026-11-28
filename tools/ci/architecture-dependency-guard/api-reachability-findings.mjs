/** @ownedConcern Report ownership, fake reachability and missing profile evidence breaches. */
import { analyzeLocalImportSemantics } from './api-local-import-semantics.mjs';
import {
  API_REACHABILITY_CLASSIFICATIONS,
  REQUIRED_API_DEPLOYMENT_PROFILES,
} from './api-reachability-policy.mjs';
import { normalizePath } from './source-files.mjs';

const CHANGED_SOURCE_POLICY = {
  [API_REACHABILITY_CLASSIFICATIONS.testSupport]: {
    ruleName: 'no-new-api-test-support-source',
    reason: 'changed src module is reachable only from tests',
  },
  [API_REACHABILITY_CLASSIFICATIONS.orphan]: {
    ruleName: 'no-new-api-orphan-source',
    reason: 'changed src module is unreachable from production and tests',
  },
};

function changedSourceFindings(classifications, changedSourceFiles) {
  const changed = new Set(changedSourceFiles.map(normalizePath));
  return classifications
    .filter(({ source }) => changed.has(source))
    .flatMap(({ source, classification }) => {
      const policy = CHANGED_SOURCE_POLICY[classification];
      return policy ? [{ ...policy, source }] : [];
    });
}

function importFindings(module, contents) {
  const usage = [...analyzeLocalImportSemantics(module, contents).values()];
  const localSources = usage.filter(({ target }) => target?.startsWith('apps/api/src/'));
  const source = module.source;
  const ruleName = 'no-api-fake-reachability-import';
  return [
    ...localSources
      .filter(({ hasSideEffectOnly }) => hasSideEffectOnly)
      .map(({ target }) => ({
        ruleName,
        source,
        target,
        reason: 'side-effect-only local import cannot prove product reachability',
      })),
    ...localSources
      .filter(({ hasUnusedValue, hasRuntimeUse }) => hasUnusedValue && !hasRuntimeUse)
      .map(({ target }) => ({
        ruleName,
        source,
        target,
        reason: 'unused local value import cannot prove product reachability',
      })),
  ];
}

function productionFindings(module, contents) {
  return [
    ...(module.dependencies ?? [])
      .filter(({ resolved }) => resolved?.startsWith('apps/api/test/'))
      .map(({ resolved }) => ({
        ruleName: 'no-api-production-to-test-support',
        source: module.source,
        target: resolved,
        reason: 'production source imports API test support',
      })),
    ...importFindings(module, contents),
  ];
}

function missingProfileFindings(profileEvidence) {
  const proven = new Set(profileEvidence.map(({ profile }) => profile));
  return REQUIRED_API_DEPLOYMENT_PROFILES.filter((profile) => !proven.has(profile)).map(
    (source) => ({
      ruleName: 'api-supported-profile-unproven',
      source,
      reason: 'supported deployment profile lacks semantic composition evidence',
    })
  );
}

function findingKey({ ruleName, source, target = '' }) {
  return [ruleName, source, target].join('\0');
}

export function collectApiReachabilityFindings({
  modules,
  classifications,
  productionSources,
  changedSourceFiles = [],
  sourceContents = new Map(),
  profileEvidence = [],
}) {
  return [
    ...changedSourceFindings(classifications, changedSourceFiles),
    ...modules
      .filter(({ source }) => productionSources.has(source))
      .flatMap((module) => productionFindings(module, sourceContents.get(module.source) ?? '')),
    ...missingProfileFindings(profileEvidence),
  ].sort((left, right) => findingKey(left).localeCompare(findingKey(right)));
}
