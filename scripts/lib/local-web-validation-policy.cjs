/**
 * Owned concern: assign local Web proof without changing the complete changed-file frontier.
 * @baseline ADR-0069: one policy owns the reason to defer common hosted scenarios.
 * @decision Keep infrastructure inputs complete; retain changed and native host scenarios in readiness.
 * @consequence Local readiness never attests hosted merge acceptance.
 * @version 1.0.0
 */
const path = require('node:path');
const { classifyRepositoryFileScope } = require('../../tools/ci/repository-change-scope.mjs');
const { isGovernanceToolingCommand } = require('../../tools/ci/repository-command-catalog.mjs');
const repoRoot = path.resolve(__dirname, '../..');
const NATIVE_RUNTIME_INPUTS = new Set([
  'apps/api/package.json',
  'apps/api/vitest.integration.config.ts',
  'apps/api/test/integration/sourceLivePreviewPostgres.proof.ts',
  'scripts/run-selected-closure-live-proof.cjs',
  'scripts/run-selected-closure-cypress.cjs',
  'scripts/live-proof-process.cjs',
  'scripts/live-proof-web-runtime.cjs',
  'tools/ci/run-web-cypress-native.mjs',
]);

function webTestPhase(files, options = {}) {
  const runtimeChanged = files.some(
    (file) => file.startsWith('apps/web/') || NATIVE_RUNTIME_INPUTS.has(file)
  );
  const scopes = files.map((file) => classifyRepositoryFileScope(file, { repoRootPath: repoRoot }));
  if (!runtimeChanged && !scopes.some((scope) => scope.hostedWebTestAdapter)) return null;
  const nativeChanged = files.some(
    (file) =>
      NATIVE_RUNTIME_INPUTS.has(file) ||
      /^scripts\/(?:live-proof-|run-selected-closure-|disposable-postgres-|prefixed-process-)/u.test(
        file
      ) ||
      /^scripts\/lib\/(?:local-validation-executor|git-repository-environment)\./u.test(file)
  );
  if (nativeChanged) return 'all';
  const hostedOnly =
    !runtimeChanged &&
    scopes.every(
      (scope) =>
        scope.hostedWebTestAdapter ||
        (!scope.rootCiPolicyInput &&
          !scope.workflowPolicyInput &&
          !scope.runtimeWorkspaceFanout &&
          (scope.path.startsWith('docs/') ||
            (scope.commandClass != null && isGovernanceToolingCommand(scope.commandClass))))
    );
  if (hostedOnly) return 'vitest';
  if (!options.pushReadiness || !['win32', 'linux'].includes(options.platform ?? process.platform))
    return 'all';
  // Positive admission is narrower than apps/web/**; host adapters and unknown companions veto it.
  const productOnly = scopes.every(
    (scope) =>
      !scope.rootBuildInput &&
      !scope.rootCiPolicyInput &&
      !scope.runtimeWorkspaceFanout &&
      (!scope.workflowPolicyInput || scope.hostedWebTestAdapter) &&
      (scope.path.startsWith('apps/web/src/') ||
        scope.path === 'apps/web/cypress.catalog.json' ||
        /^apps\/web\/cypress\/e2e\/(?:[^/]+\/)*[^/]+\.cy\.ts$/u.test(scope.path) ||
        scope.path.startsWith('docs/') ||
        scope.path === 'AGENTS.md' ||
        scope.hostedWebTestAdapter ||
        (scope.commandClass != null && isGovernanceToolingCommand(scope.commandClass)))
  );
  return productOnly ? 'push-readiness' : 'all';
}

module.exports = { webTestPhase };
