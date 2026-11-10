/**
 * Owned concern: select affected test contracts from canonical repository ownership.
 * @baseline Local Changed Files Gate: retain cross-owner, deleted-source and complete-suite obligations.
 * @decision Infer only real adjacent tests of known command owners; keep cross-file relations explicit.
 * @consequence Selection is explainable and computed once without spawning checks or duplicating inventory.
 * @version 1.0.0
 */
const fs = require('node:fs');
const path = require('node:path');
const { currentSchemaSources } = require('../../tools/planning-db/schema/manifest.cjs');
const { classifyRepositoryFileScope } = require('../../tools/ci/repository-change-scope.mjs');
const {
  classifyScriptFilePath,
  isGovernanceToolingCommand,
  isRepositoryCommandFile,
} = require('../../tools/ci/repository-command-catalog.mjs');
const {
  TOOLING_CRYPTO_CONTRACT,
  isToolingCryptoContractInput,
} = require('../../tools/ci/ci-tool-test-suite.mjs');
const {
  testStep,
  normalizeChangedFiles,
  pushSteps,
} = require('./local-validation-plan-values.cjs');
const {
  composeLocalTestCoverage,
  parentTestSuiteFor,
  readParentSuiteMembers,
} = require('./local-test-coverage.cjs');
const repoRoot = path.resolve(__dirname, '../..');
// These are actual cross-file contracts, not repeated adjacent pairs or test self references.
const EXCEPTIONS = Object.freeze({
  'scripts/planning-db/feature-mechanization-policy.cjs':
    'scripts/planning-db-operate-tests/feature-mechanization.test.cjs',
  'scripts/planning-db/queries/current-component-files-query.cjs':
    'scripts/planning-db-query-tests/current-component-files.test.cjs',
  'scripts/lib/feature-mechanization-manifest.cjs': 'scripts/check-feature-mechanization.test.cjs',
  'apps/web/cypress/node/chromiumNetworkProjection.ts':
    'scripts/chromium-network-projection.test.cjs',
  'apps/web/cypress/node/chromiumNetworkDiagnostics.ts':
    'scripts/chromium-network-diagnostics.test.cjs',
  'apps/web/cypress/node/chromiumNetworkEvidence.ts':
    'scripts/chromium-network-diagnostics.test.cjs',
  'apps/web/cypress/node/chromiumProcessObserver.ts': 'scripts/chromium-process-observer.test.cjs',
  'apps/web/cypress/node/linuxChromiumProcessObserver.py':
    'scripts/chromium-process-protocol.test.cjs',
  'apps/web/cypress/node/linuxChromiumProcessProtocol.py':
    'scripts/chromium-process-protocol.test.cjs',
  'apps/web/cypress/node/linuxChromiumSignalTrace.py': 'scripts/chromium-process-protocol.test.cjs',
  'apps/web/cypress/node/linuxChromiumOomJournal.py': 'scripts/chromium-process-protocol.test.cjs',
  'scripts/chromium-process-protocol.test.py': 'scripts/chromium-process-protocol.test.cjs',
  'scripts/chromium-signal-trace.test.py': 'scripts/chromium-process-protocol.test.cjs',
  'scripts/chromium-oom-journal.test.py': 'scripts/chromium-process-protocol.test.cjs',
  'scripts/planning-db/frontend-component-inventory.cjs':
    'scripts/planning-db-frontend-component-inventory.test.cjs',
  'scripts/planning-db/frontend-mechanical-truth-inventory.cjs':
    'scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs',
  'scripts/planning-db/knowledge-intake-retirement-guard.cjs':
    'scripts/planning-db-knowledge-intake-retirement-guard.test.cjs',
});
const OPERATE_SOURCES = new Set([
  'catalog-implementation-reference-relocation',
  'docs-canonical-source-resolution',
  'catalog-reconciliation',
  'catalog-reconciliation-write',
  'feature-mechanization-evidence-retirement',
]);
const QUERY_SOURCES = new Set([
  'component-integrity-query',
  'rail-vocabulary-query',
  'source-drift-query',
  'code-symbol-query',
]);

function scriptTestFor(file) {
  if (EXCEPTIONS[file]) return EXCEPTIONS[file];
  if (file === 'scripts/planning-db-query-tests/current-component-files.test.cjs') return file;
  const parent = parentTestSuiteFor(file);
  if (parent) return parent;
  if (
    file.startsWith('scripts/planning-db/operate/') ||
    (file.startsWith('scripts/planning-db/') &&
      OPERATE_SOURCES.has(path.posix.basename(file, '.cjs')))
  ) {
    readParentSuiteMembers('scripts/planning-db-operate.test.cjs');
    return 'scripts/planning-db-operate.test.cjs';
  }
  if (
    file.startsWith('scripts/planning-db/queries/') &&
    QUERY_SOURCES.has(path.posix.basename(file, '.cjs'))
  ) {
    readParentSuiteMembers('scripts/planning-db-query.test.cjs');
    return 'scripts/planning-db-query.test.cjs';
  }
  if (!file.startsWith('scripts/')) return null;
  if (file.endsWith('.test.cjs') && !fs.existsSync(path.join(repoRoot, file))) {
    throw new Error(`Unavailable changed test: ${file}`);
  }
  if (
    file === 'scripts/feature-mechanization-test-routing.test.cjs' ||
    Object.values(EXCEPTIONS).includes(file)
  )
    return file;
  const source = file.replace(/\.test\.cjs$/u, '.cjs').replace(/\.py$/u, '.cjs');
  if (classifyScriptFilePath(source).domain === 'unknown') return null;
  const target = file.endsWith('.test.cjs') ? file : file.replace(/\.(?:cjs|py)$/u, '.test.cjs');
  return target !== file || file.endsWith('.test.cjs')
    ? fs.existsSync(path.join(repoRoot, target))
      ? target
      : null
    : null;
}

function explainCiToolSelection(files) {
  const reasons = [];
  const changedFiles = normalizeChangedFiles(files);
  for (const file of changedFiles) {
    const scope = classifyRepositoryFileScope(file, { repoRootPath: repoRoot });
    const reason = scope.workflowPolicyInput
      ? 'workflow or action composition'
      : scope.rootBuildInput
        ? 'root package or workspace composition'
        : scope.rootCiPolicyInput || scope.ciConfigurationInput
          ? 'CI policy configuration'
          : ['ci-tooling', 'developer-workflow', 'runtime-root', 'unknown'].includes(
                scope.commandClass?.domain
              )
            ? `repository command domain: ${scope.commandClass.domain}`
            : null;
    if (reason) reasons.push({ path: file, reason });
  }
  return reasons.length
    ? { mode: 'all', reasons }
    : {
        mode: 'focused',
        reasons: changedFiles.map((file) => ({ path: file, reason: 'existing focused route' })),
      };
}

function ciToolSteps(files) {
  if (explainCiToolSelection(files).mode === 'all')
    return [testStep('test-ci-tools', 'pnpm', 'test:ci-tools')];
  const tests = new Set(
    files.filter((file) => file.startsWith('tools/ci/') && file.endsWith('.test.mjs'))
  );
  if (
    files.some((file) =>
      [
        'docs/architecture/components/web/code-workbench-workspace-files-component.md',
        'docs/planning/proposals/mandatory/runtime-and-contracts/tf-c3-production-plugin-host-composition-plan-20260414.md',
        'docs/evidence/ED-20260410-contract-mapper-boundary-option-a.md',
      ].includes(file)
    )
  )
    tests.add('tools/ci/docs-disposition-canon.test.mjs');
  if (files.some(isRepositoryCommandFile))
    tests.add('tools/ci/repository-command-catalog.test.mjs');
  const steps = [...tests].map((file) =>
    testStep(`test-${path.posix.basename(file, '.test.mjs')}`, 'node', '--test', file)
  );
  if (files.some(isToolingCryptoContractInput) && !tests.has(TOOLING_CRYPTO_CONTRACT.testPath))
    steps.push(
      testStep(
        'test-tooling-crypto-contract',
        'node',
        '--test',
        '--test-name-pattern=' + TOOLING_CRYPTO_CONTRACT.namePattern,
        TOOLING_CRYPTO_CONTRACT.testPath
      )
    );
  return steps;
}

function webTestPhase(files) {
  const runtimeChanged = files.some(
    (file) =>
      file.startsWith('apps/web/') ||
      [
        'apps/api/package.json',
        'apps/api/vitest.integration.config.ts',
        'apps/api/test/integration/sourceLivePreviewPostgres.proof.ts',
        'scripts/run-selected-closure-live-proof.cjs',
        'scripts/run-selected-closure-cypress.cjs',
        'scripts/live-proof-process.cjs',
        'scripts/live-proof-web-runtime.cjs',
        'tools/ci/run-web-cypress-native.mjs',
      ].includes(file)
  );
  const scopes = files.map((file) => classifyRepositoryFileScope(file, { repoRootPath: repoRoot }));
  if (!runtimeChanged && !scopes.some((scope) => scope.hostedWebTestAdapter)) return null;
  // Only positive ownership evidence may remove the local browser obligation.
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
  return hostedOnly ? 'vitest' : 'all';
}

function buildFocusedChangedTestPlan(files, options = {}) {
  const changedFiles = normalizeChangedFiles(files);
  const ci = ciToolSteps(changedFiles);
  const plan = [];
  if (options.includeWeb) {
    pushSteps(plan, ci);
    const webPhase = webTestPhase(changedFiles);
    if (webPhase !== null) {
      pushSteps(plan, [
        testStep(
          'test-web-changed',
          'pnpm',
          'test:web:changed',
          ...(options.iteration || webPhase === 'vitest' ? ['--phase=vitest'] : [])
        ),
      ]);
    }
  }
  const sourceFacts = changedFiles.some((file) =>
    [
      'scripts/lib/source-code-facts.cjs',
      'scripts/lib/python-source-facts.cjs',
      'scripts/lib/python-source-facts.py',
    ].includes(file)
  );
  const affected = sourceFacts
    ? [
        ...changedFiles,
        'scripts/lib/source-code-facts.cjs',
        'scripts/lib/component-source-responsibilities.cjs',
        'scripts/check-feature-mechanization.cjs',
      ]
    : [...changedFiles];
  if (
    sourceFacts ||
    changedFiles.some((file) =>
      [
        'scripts/web-code-duplication.cjs',
        'scripts/web-code-duplication.test.cjs',
        'scripts/check-changed.cjs',
        'scripts/planning-db/code-symbol-inventory.cjs',
        'scripts/planning-db/code-symbol-inventory.test.cjs',
      ].includes(file)
    )
  ) {
    affected.push(
      'scripts/web-code-duplication.test.cjs',
      'scripts/planning-db/code-symbol-inventory.test.cjs'
    );
  }
  const tests = new Set(affected.map(scriptTestFor).filter(Boolean));
  if (
    changedFiles.some(
      (file) =>
        file.startsWith('.github/workflows/') ||
        [
          'scripts/documentation-publication.cjs',
          'scripts/documentation-publication.test.cjs',
        ].includes(file)
    )
  )
    tests.add('scripts/documentation-publication.test.cjs');
  pushSteps(
    plan,
    [...tests]
      .sort()
      .map((file) =>
        testStep(`test-${path.posix.basename(file, '.test.cjs')}`, 'node', '--test', file)
      )
  );
  if (!options.includeWeb) pushSteps(plan, ci);
  if (
    changedFiles.some((file) =>
      [
        ...currentSchemaSources,
        'tools/planning-db/schema/manifest.cjs',
        'scripts/planning-db/current-schema.cjs',
        'scripts/planning-db-schema.cjs',
        'scripts/planning-db-schema.test.cjs',
        'scripts/planning-db-current-schema-policy.cjs',
        'scripts/planning-db-current-schema-policy.test.cjs',
      ].includes(file)
    )
  ) {
    pushSteps(plan, [
      testStep('test-planning-db-current-schema', 'pnpm', 'test:planning:db:current-schema'),
    ]);
  }
  if (
    changedFiles.some((file) =>
      ['infra/planning-db/', 'tools/planning-db/knowledge/', 'tools/governance-db/'].some(
        (prefix) => file.startsWith(prefix)
      )
    )
  ) {
    pushSteps(plan, [testStep('test-planning-db', 'pnpm', 'test:planning:db')]);
  }
  if (changedFiles.includes('scripts/local-validation-plan.cjs'))
    pushSteps(plan, [testStep('test-local-validation-core', 'pnpm', 'test:verify-prepush')]);
  return composeLocalTestCoverage(plan);
}

module.exports = { buildFocusedChangedTestPlan, explainCiToolSelection };
