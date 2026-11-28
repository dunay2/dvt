/** @ownedConcern Declare the API source scopes, retention classes and deployment profile policy. */

export const API_PRODUCTION_ROOTS = ['apps/api/src/app.ts', 'apps/api/src/server.ts'];

export const API_REACHABILITY_CLASSIFICATIONS = Object.freeze({
  production: 'production',
  conditionalProduction: 'conditional-production',
  validNullObject: 'valid-null-object',
  testSupport: 'test-support-misplaced',
  orphan: 'orphan',
});

export const REQUIRED_API_DEPLOYMENT_PROFILES = Object.freeze([
  'observability-noop',
  'observability-otel',
  'oidc-protected-runtime',
  'oidc-public-only',
  'postgres-protected-storage',
  'reconciler-disabled',
  'reconciler-enabled',
  'temporal-provider',
]);

export const API_SOURCE_FILE_PATTERN = /^apps\/api\/src\/.*\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/;

export const API_TEST_FILE_PATTERN = /^apps\/api\/test\/.*\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/;

export function applyDeploymentProfileClassifications(classifications, profileEvidence) {
  const validNullObjectSources = new Set(
    profileEvidence
      .filter(
        ({ classification }) => classification === API_REACHABILITY_CLASSIFICATIONS.validNullObject
      )
      .flatMap(({ sources }) => sources)
  );
  const conditionalSources = new Set(
    profileEvidence
      .filter(
        ({ classification }) =>
          classification === API_REACHABILITY_CLASSIFICATIONS.conditionalProduction
      )
      .flatMap(({ sources }) => sources)
  );
  const roots = new Set(API_PRODUCTION_ROOTS);

  return classifications.map((item) => {
    if (
      item.classification !== API_REACHABILITY_CLASSIFICATIONS.production ||
      roots.has(item.source)
    ) {
      return item;
    }
    if (validNullObjectSources.has(item.source)) {
      return {
        ...item,
        classification: API_REACHABILITY_CLASSIFICATIONS.validNullObject,
        retentionReason: 'production-null-object',
      };
    }
    if (conditionalSources.has(item.source)) {
      return {
        ...item,
        classification: API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
        runtimeReachability: 'conditional',
        retentionReason: 'production-profile',
      };
    }
    return item;
  });
}
