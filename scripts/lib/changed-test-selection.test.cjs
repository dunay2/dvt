/**
 * Owned concern: prove focused routing, cross-owner contracts and finite conservative additions.
 * @baseline Local Changed Files Gate: preserve each selected contract and failure boundary.
 * @decision Move existing assertions with their concrete owner instead of copying routing data.
 * @consequence Partial selection cannot hide lost coverage or acceptance obligations.
 * @version 1.0.0
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildCiToolTestList } = require('../../tools/ci/ci-tool-test-suite.mjs');
const { buildVerifyChangedPlan } = require('../local-validation-plan.cjs');
const {
  buildFocusedChangedTestPlan,
  explainCiToolSelection,
} = require('./changed-test-selection.cjs');
const { effectiveNodeTestFiles } = require('./local-test-coverage.cjs');
const { commandLabel } = require('./local-validation-plan-values.cjs');
const catalogTest = 'node --test tools/ci/repository-command-catalog.test.mjs';
const cryptoTest =
  'node --test --test-name-pattern=tooling crypto mechanics tools/ci/architecture-dependency-guard.test.mjs';

function labelsFor(files) {
  return buildVerifyChangedPlan(files).map(commandLabel);
}
function focusedLabelsFor(files) {
  return buildFocusedChangedTestPlan(files).map(commandLabel);
}
function assertLabels(actual, expected, message) {
  assert.equal(actual.length, new Set(actual).size, message);
  assert.deepEqual([...actual].sort(), [...expected].sort(), message);
}

test('adjacent inference retains deleted sources but cannot invent unknown-owner or application routes', (t) => {
  const exists = fs.existsSync;
  const deleted = path.resolve(__dirname, '../git-local-changes.cjs');
  const invented = path.resolve(__dirname, '../unclassified.test.cjs');
  t.mock.method(fs, 'existsSync', (file) =>
    path.resolve(file) === deleted ? false : path.resolve(file) === invented ? true : exists(file)
  );
  const deletedPlan = buildFocusedChangedTestPlan(['scripts/git-local-changes.cjs']);
  assert.ok(effectiveNodeTestFiles(deletedPlan).includes('scripts/git-local-changes.test.cjs'));
  const unknown = buildFocusedChangedTestPlan(['scripts/unclassified.cjs']);
  assert.ok(unknown.some((step) => step.args.includes('test:ci-tools')));
  assert.ok(!effectiveNodeTestFiles(unknown).includes('scripts/unclassified.test.cjs'));
  for (const file of [
    'apps/api/src/server.ts',
    'apps/api/test/contract.test.ts',
    'apps/web/src/app/views/CodeView.test.tsx',
  ]) {
    assert.deepEqual(buildFocusedChangedTestPlan([file]), []);
  }
  assert.throws(
    () => buildFocusedChangedTestPlan(['scripts/unavailable.test.cjs']),
    /Unavailable changed test/u
  );
});

test('CI iteration composition selects the complete CI tools suite before Web exactly once', () => {
  for (const trigger of [
    '.github/workflows/test.yml',
    '.github/actions/setup-node-pnpm/action.yml',
    'package.json',
    'pnpm-workspace.yaml',
    'pnpm-lock.yaml',
    'turbo.json',
    'tsconfig.tools.json',
    'eslint.config.cjs',
    '.dependency-cruiser.cjs',
    '.prettierrc.json',
    'tools/ci/policy/workflow-scope.json',
    'tools/ci/policy/not-yet-catalogued.yaml',
    'tools/ci/policy/not-yet-catalogued.toml',
    '.github/scripts/workflow-policy.ps1',
    'tools/ci/scope-config.mjs',
    'scripts/local-validation-plan.cjs',
    'scripts/run-turbo-workspace-task.cjs',
    'scripts/not-yet-classified-command.cjs',
  ]) {
    const files = [trigger, trigger, 'apps/web/src/app/views/CodeView.tsx'];
    for (const options of [undefined, { iteration: true }]) {
      const plan = buildVerifyChangedPlan(files, options);
      const selected = plan.filter((step) => step.args.includes('test:ci-tools'));
      assert.equal(selected.length, 1, trigger);
      assert.equal(selected[0].kind, 'test');
      assert.ok(plan.indexOf(selected[0]) > plan.findIndex((step) => step.id === 'check-changed'));
      assert.ok(
        plan.indexOf(selected[0]) < plan.findIndex((step) => step.id === 'test-web-changed')
      );
      assert.deepEqual(
        effectiveNodeTestFiles(plan)
          .filter((file) => file.startsWith('tools/ci/'))
          .sort(),
        buildCiToolTestList('all').sort(),
        trigger
      );
    }
    const explanation = explainCiToolSelection(files);
    assert.equal(explanation.mode, 'all', trigger);
    assert.equal(explanation.reasons.length, 1);
    assert.equal(explanation.reasons[0].path, trigger);
    assert.ok(explanation.reasons[0].reason.length > 0);
    assert.deepEqual(explainCiToolSelection([...files].reverse()), explanation);
  }
});

test('hosted adapters retain CI contracts and the unchanged Vitest frontier without local browser work', () => {
  const workflow = '.github/workflows/test.yml';
  const action = '.github/actions/setup-native-browser/action.yml';
  for (const inputs of [
    [workflow],
    [action],
    [action, workflow],
    [workflow, 'docs/guides/pr-preflight-and-ci-triage.md'],
    [action, 'tools/ci/test-suite-outcome.test.mjs'],
    [workflow, 'scripts/lib/changed-test-selection.cjs'],
  ]) {
    for (const files of [inputs, [...inputs].reverse(), [...inputs, ...inputs]]) {
      for (const options of [undefined, { iteration: true }]) {
        const plan = buildVerifyChangedPlan(Object.freeze(files), options);
        const web = plan.filter((step) => step.id === 'test-web-changed');
        const ci = plan.filter((step) => step.args.includes('test:ci-tools'));
        assert.equal(web.length, 1);
        assert.equal(ci.length, 1);
        assert.deepEqual(web[0].args, ['test:web:changed', '--phase=vitest'], files.join());
        assert.ok(plan.indexOf(ci[0]) < plan.indexOf(web[0]));
        assert.ok(effectiveNodeTestFiles(plan).includes('tools/ci/test-suite-outcome.test.mjs'));
      }
    }
  }
});

test('hosted adapters cannot reduce shared, root or unclassified runtime obligations', () => {
  // Undefined classification and an explicitly unknown domain are distinct refusal cases.
  for (const companion of [
    'apps/web/src/app/views/CodeView.tsx',
    'apps/api/src/server.ts',
    'packages/@dvt/engine/src/WorkflowEngine.ts',
    'scripts/live-proof-process.cjs',
    'tools/ci/run-web-cypress-native.mjs',
    'package.json',
    'tsconfig.tools.json',
    'eslint.config.cjs',
    'tools/ci/policy/not-yet-catalogued.yaml',
    '.github/workflows/new-workflow.yml',
    '.github/actions/setup-node-pnpm/action.yml',
    'scripts/unclassified-runtime.cjs',
    '.github/scripts/new-runtime.sh',
    '.github/scripts/new-runtime.js',
    'scripts/new-python.py',
    'unknown.config',
  ]) {
    const files = ['.github/workflows/test.yml', companion];
    const plan = buildVerifyChangedPlan(files);
    const web = plan.filter((step) => step.id === 'test-web-changed');
    assert.equal(web.length, 1, companion);
    assert.deepEqual(web[0].args, ['test:web:changed'], companion);
    const iteration = buildVerifyChangedPlan(files, { iteration: true });
    assert.deepEqual(iteration.find((step) => step.id === 'test-web-changed').args, [
      'test:web:changed',
      '--phase=vitest',
    ]);
  }
});

test('hosted classification does not enable Web in callers that exclude it', () => {
  const plan = buildFocusedChangedTestPlan(['.github/workflows/test.yml']);
  assert.ok(!plan.some((step) => step.id === 'test-web-changed'));
  assert.equal(plan.filter((step) => step.args.includes('test:ci-tools')).length, 1);
  for (const file of ['docs/guides/pr-preflight-and-ci-triage.md', 'scripts/new-python.py']) {
    assert.ok(!buildVerifyChangedPlan([file]).some((step) => step.id === 'test-web-changed'));
  }
});

test('CI iteration complete selection absorbs partial CI tests and retains adjacent script coverage', () => {
  const plan = buildVerifyChangedPlan(
    [
      '.github/workflows/test.yml',
      'tools/ci/architecture-dependency-guard.test.mjs',
      'tools/ci/repository-command-catalog.test.mjs',
      'scripts/git-local-changes.cjs',
      'scripts/git-local-changes.test.cjs',
      'scripts/planning-db-query.cjs',
    ],
    { iteration: true }
  );
  const selected = effectiveNodeTestFiles(plan);
  assert.equal(selected.length, new Set(selected).size);
  for (const suite of [
    ...buildCiToolTestList('all'),
    'scripts/git-local-changes.test.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/documentation-publication.test.cjs',
  ])
    assert.equal(selected.filter((file) => file === suite).length, 1, suite);
  assert.ok(
    !plan.some(
      (step) => step.command === 'node' && step.args.some((arg) => arg.startsWith('tools/ci/'))
    )
  );
});

test('CI iteration test-only and unrelated sources retain explainable focused selection', () => {
  for (const files of [
    ['tools/ci/architecture-dependency-guard.test.mjs'],
    ['scripts/verify-changed.test.cjs'],
    ['scripts/planning-db-schema.cjs'],
    ['docs/guides/example.md'],
    ['apps/web/src/app/views/CodeView.tsx'],
    ['apps/api/src/server.ts'],
    ['apps/web/package.json'],
    ['apps/web/tsconfig.json'],
    ['apps/api/test/contract.test.ts'],
    ['docs/guides/ci-policy.json'],
  ]) {
    assert.equal(explainCiToolSelection(files).mode, 'focused', files.join(','));
    assert.ok(
      !buildVerifyChangedPlan(files, { iteration: true }).some((step) =>
        step.args.includes('test:ci-tools')
      )
    );
    assert.ok(explainCiToolSelection(files).reasons.every((entry) => entry.reason.length > 0));
  }
  const suite = 'tools/ci/architecture-dependency-guard.test.mjs';
  assert.deepEqual(
    buildFocusedChangedTestPlan([suite, suite])
      .filter((step) => step.args.includes(suite))
      .map(commandLabel),
    [`node --test ${suite}`]
  );
});

test('Python source-facts inputs retain all actual source-facts consumers exactly once', () => {
  for (const source of [
    'scripts/lib/python-source-facts.cjs',
    'scripts/lib/python-source-facts.py',
  ]) {
    const plan = buildFocusedChangedTestPlan([source]);
    const selected = effectiveNodeTestFiles(plan);
    for (const contract of [
      'scripts/lib/python-source-facts.test.cjs',
      'scripts/lib/source-code-facts.test.cjs',
      'scripts/lib/component-source-responsibilities.test.cjs',
      'scripts/check-feature-mechanization.test.cjs',
      'scripts/planning-db/code-symbol-inventory.test.cjs',
      'scripts/web-code-duplication.test.cjs',
    ]) {
      assert.equal(
        selected.filter((file) => file === contract).length,
        1,
        `${source}: ${contract}`
      );
    }
    assert.equal(selected.length, new Set(selected).size);
  }
  const paired = effectiveNodeTestFiles(
    buildFocusedChangedTestPlan(['scripts/lib/python-source-facts.test.cjs'])
  );
  assert.equal(
    paired.filter((file) => file === 'scripts/lib/python-source-facts.test.cjs').length,
    1
  );
});

test('tooling crypto inputs select the bounded architecture contract once', () => {
  const suite = 'tools/ci/architecture-dependency-guard.test.mjs';
  for (const file of [
    'scripts/planning-db-schema.cjs',
    'scripts/planning-db/component-source-responsibility-store.cjs',
    'scripts/planning-db/component-source-responsibility.integration.test.cjs',
    'tools/docs/check-filenames.ts',
    'packages/@dvt/cli/src/main.ts',
    'packages/@dvt/engine/test/contracts/run-golden-paths.hash.test.ts',
  ]) {
    const plan = buildVerifyChangedPlan([file, file]);
    const selected = plan.filter((step) => step.args.includes(suite));
    assert.equal(selected.length, 1, file);
    assert.ok(selected[0].args.includes('--test-name-pattern=tooling crypto mechanics'));
    assert.ok(!plan.some((step) => step.args.includes('test:ci-tools')));
  }
  const full = buildVerifyChangedPlan(['scripts/planning-db-schema.cjs', suite]).filter((step) =>
    step.args.includes(suite)
  );
  assert.equal(full.length, 1);
  assert.deepEqual(full[0].args, ['--test', suite]);
  for (const file of ['docs/guides/example.md', 'apps/api/src/example.ts']) {
    assert.ok(!buildVerifyChangedPlan([file]).some((step) => step.args.includes(suite)));
  }
});

test('scope configuration changes retain routing and package metadata regressions once', () => {
  const suites = [
    'tools/ci/ci-tool-routing.test.mjs',
    'tools/ci/emit-scope.test.mjs',
    'tools/ci/package-json-scope-classification.test.mjs',
    'tools/ci/workflow-scope-classification.test.mjs',
  ];
  for (const files of [['tools/ci/scope-config.mjs'], ['tools/ci/scope-config.mjs', ...suites]]) {
    const plan = buildVerifyChangedPlan(files);
    const selected = effectiveNodeTestFiles(plan);
    for (const suite of suites)
      assert.equal(selected.filter((file) => file === suite).length, 1, suite);
    assert.equal(plan.filter((step) => step.args.includes('test:ci-tools')).length, 1);
  }
});

test('consumed provenance documents select one complete contract before Web tests', () => {
  const suite = 'tools/ci/docs-disposition-canon.test.mjs';
  const documents = [
    'docs/architecture/components/web/code-workbench-workspace-files-component.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/tf-c3-production-plugin-host-composition-plan-20260414.md',
    'docs/evidence/ED-20260410-contract-mapper-boundary-option-a.md',
  ];
  for (const file of documents) {
    const plan = buildVerifyChangedPlan([file, file]);
    assert.deepEqual(
      plan.filter((step) => step.args.includes(suite)).map((step) => step.args),
      [['--test', suite]],
      file
    );
    assertLabels(focusedLabelsFor([file]), ['node --test ' + suite], file);
  }
  const files = [...documents, suite, 'apps/web/src/app/views/CodeView.tsx'];
  const plan = buildVerifyChangedPlan(files);
  assert.deepEqual(buildVerifyChangedPlan([...files].reverse()), plan);
  const selected = plan.filter((step) => step.args.includes(suite));
  assert.equal(selected.length, 1);
  assert.deepEqual(selected[0].args, ['--test', suite]);
  assert.ok(plan.indexOf(selected[0]) > plan.findIndex((step) => step.id === 'check-changed'));
  assert.ok(plan.indexOf(selected[0]) < plan.findIndex((step) => step.id === 'test-web-changed'));
  for (const file of ['docs/guides/unrelated.md', 'apps/api/src/example.ts']) {
    assert.ok(!buildVerifyChangedPlan([file]).some((step) => step.args.includes(suite)), file);
    assert.ok(!buildFocusedChangedTestPlan([file]).some((step) => step.args.includes(suite)), file);
  }
});

test('buildFocusedChangedTestPlan retains adjacent script tests without duplicating general gates', () => {
  const labels = focusedLabelsFor([
    'docs/guides/testing-and-ci-capabilities.md',
    'scripts/git-local-changes.cjs',
    'scripts/planning-db-query.cjs',
  ]);

  assertLabels(labels, [
    'node --test scripts/git-local-changes.test.cjs',
    'node --test scripts/planning-db-query.test.cjs',
    'pnpm test:ci-tools',
  ]);
  assert.ok(!labels.includes('pnpm lint:md:changed'));
  assert.ok(!labels.includes('pnpm test:web:changed'));
  assert.ok(!labels.includes('pnpm governance:db:import'));
});

test('buildFocusedChangedTestPlan retains the ordinary-workflow publication guard', () => {
  const labels = focusedLabelsFor([
    '.github/workflows/pr-quality-gate.yml',
    'scripts/documentation-publication.test.cjs',
  ]);

  assert.equal(
    labels.filter((label) => label === 'node --test scripts/documentation-publication.test.cjs')
      .length,
    1
  );
});

test('buildFocusedChangedTestPlan validates changes to the changed-file lint gate once', () => {
  const labels = focusedLabelsFor(['scripts/check-changed.cjs', 'scripts/check-changed.test.cjs']);

  assertLabels(labels, [
    'node --test scripts/web-code-duplication.test.cjs',
    'node --test scripts/planning-db/code-symbol-inventory.test.cjs',
    'node --test scripts/check-changed.test.cjs',
    'pnpm test:ci-tools',
  ]);
});

test('runtime runner source and test changes select their isolated contract exactly once', () => {
  for (const name of [
    'run-selected-closure-live-proof',
    'run-selected-closure-cypress',
    'live-proof-process',
    'live-proof-web-runtime',
    'run-dev-stack',
  ]) {
    const source = `scripts/${name}.cjs`;
    const contract = `scripts/${name}.test.cjs`;
    for (const files of [[source], [contract], [source, contract]]) {
      const plan = buildFocusedChangedTestPlan(files);
      assertLabels(
        plan.map(commandLabel),
        [`node --test ${contract}`, catalogTest, cryptoTest],
        files.join(', ')
      );
      assert.equal(plan[0].kind, 'test');
    }
  }
});

test('Chromium diagnostic source and paired tests retain one focused Node obligation', () => {
  for (const [source, contract] of [
    [
      'apps/web/cypress/node/chromiumNetworkProjection.ts',
      'scripts/chromium-network-projection.test.cjs',
    ],
    [
      'apps/web/cypress/node/chromiumNetworkDiagnostics.ts',
      'scripts/chromium-network-diagnostics.test.cjs',
    ],
    [
      'apps/web/cypress/node/chromiumNetworkEvidence.ts',
      'scripts/chromium-network-diagnostics.test.cjs',
    ],
    [
      'apps/web/cypress/node/chromiumProcessObserver.ts',
      'scripts/chromium-process-observer.test.cjs',
    ],
    [
      'apps/web/cypress/node/linuxChromiumProcessObserver.py',
      'scripts/chromium-process-protocol.test.cjs',
    ],
    [
      'apps/web/cypress/node/linuxChromiumProcessProtocol.py',
      'scripts/chromium-process-protocol.test.cjs',
    ],
    [
      'apps/web/cypress/node/linuxChromiumSignalTrace.py',
      'scripts/chromium-process-protocol.test.cjs',
    ],
    [
      'apps/web/cypress/node/linuxChromiumOomJournal.py',
      'scripts/chromium-process-protocol.test.cjs',
    ],
    ['scripts/chromium-process-protocol.test.py', 'scripts/chromium-process-protocol.test.cjs'],
    ['scripts/chromium-signal-trace.test.py', 'scripts/chromium-process-protocol.test.cjs'],
    ['scripts/chromium-oom-journal.test.py', 'scripts/chromium-process-protocol.test.cjs'],
  ]) {
    for (const files of [[source], [contract], [source, contract]]) {
      assertLabels(focusedLabelsFor(files), [
        `node --test ${contract}`,
        ...(files.includes(contract) ? [catalogTest, cryptoTest] : []),
      ]);
    }
  }
});

test('live browser runtime inputs select the existing Web router without broad API routing', () => {
  const files = [
    'apps/api/test/integration/sourceLivePreviewPostgres.proof.ts',
    'apps/api/vitest.integration.config.ts',
    'apps/api/package.json',
    'scripts/run-selected-closure-live-proof.cjs',
    'scripts/run-selected-closure-cypress.cjs',
    'scripts/live-proof-process.cjs',
    'scripts/live-proof-web-runtime.cjs',
    'tools/ci/run-web-cypress-native.mjs',
  ];
  for (const changed of [...files.map((file) => [file]), files]) {
    assert.equal(labelsFor(changed).filter((label) => label === 'pnpm test:web:changed').length, 1);
  }
  for (const file of ['scripts/ai-preflight.cjs', 'apps/api/src/server.ts']) {
    assert.ok(!labelsFor([file]).includes('pnpm test:web:changed'), file);
  }
});

test('runtime runner contracts retain mixed Web and adjacent script obligations', () => {
  const labels = labelsFor([
    'scripts/run-selected-closure-live-proof.cjs',
    'scripts/run-selected-closure-live-proof.test.cjs',
    'scripts/run-dev-stack.cjs',
    'scripts/run-dev-stack.test.cjs',
    'scripts/git-local-changes.cjs',
    'apps/web/src/app/views/canvas/CanvasView.test.tsx',
  ]);

  for (const expected of [
    'node --test scripts/run-selected-closure-live-proof.test.cjs',
    'node --test scripts/run-dev-stack.test.cjs',
    'node --test scripts/git-local-changes.test.cjs',
    'pnpm test:web:changed',
    'node scripts/check-changed.cjs',
    'pnpm docs:feature-mechanization:implementation',
  ]) {
    assert.equal(labels.filter((label) => label === expected).length, 1, expected);
  }
});

test('unrelated script changes do not select runtime runner contracts', () => {
  assertLabels(focusedLabelsFor(['scripts/ai-preflight.cjs']), [
    'node --test scripts/ai-preflight.test.cjs',
    'pnpm test:ci-tools',
  ]);
});

test('source drift and dashboard changes select the shared query contract once', () => {
  const files = [
    'scripts/planning-db/queries/source-drift-query.cjs',
    'scripts/planning-db/queries/code-symbol-query.cjs',
    'scripts/planning-db-query-tests/source-drift.test.cjs',
  ];
  const expected = 'node --test scripts/planning-db-query.test.cjs';
  for (const changed of [...files.map((file) => [file]), files]) {
    assertLabels(
      focusedLabelsFor(changed),
      [expected, catalogTest, cryptoTest],
      changed.join(', ')
    );
  }
  assertLabels(focusedLabelsFor([...files, 'scripts/planning-db-integrity-check.cjs']), [
    'node --test scripts/planning-db-integrity-check.test.cjs',
    expected,
    catalogTest,
    cryptoTest,
  ]);
});

test('buildVerifyChangedPlan routes extracted query evidence to its canonical suite', () => {
  const paths = [
    'scripts/planning-db-query-tests/catalogs.test.cjs',
    'scripts/planning-db-query-tests/documentation.test.cjs',
    'scripts/planning-db-query-tests/knowledge-intake.test.cjs',
    'scripts/planning-db-query-tests/frontend.test.cjs',
    'scripts/planning-db-query-tests/architecture-authority.test.cjs',
    'scripts/planning-db-query-tests/architecture-fitness.test.cjs',
    'scripts/planning-db-query-tests/component-engineering.test.cjs',
    'scripts/planning-db-query-tests/governance.test.cjs',
    'scripts/planning-db-query-tests/operator-context.test.cjs',
    'scripts/planning-db-query-tests/source-drift.test.cjs',
    'scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
    'scripts/planning-db-query-tests/component-profiles.test.cjs',
  ];
  for (const changed of [...paths.map((file) => [file]), paths]) {
    const labels = labelsFor(changed);
    assert.equal(
      labels.filter((label) => label === 'node --test scripts/planning-db-query.test.cjs').length,
      1
    );
    assert.ok(!labels.includes('pnpm test:planning:db'));
  }
});

test('buildVerifyChangedPlan routes CodeStatus evidence to its existing canonical suite', () => {
  const paths = [
    'scripts/generate-code-status-tests/workspace-membership.test.cjs',
    'scripts/generate-code-status-tests/repository-map.test.cjs',
    'scripts/generate-code-status-tests/component-topology.test.cjs',
    'scripts/generate-code-status-tests/system-delivery.test.cjs',
    'scripts/generate-code-status.test.cjs',
    'scripts/generate-code-status-tests/publication.integration.test.cjs',
    'scripts/generate-code-status-tests/helpers.cjs',
  ];
  for (const changed of [...paths.map((file) => [file]), paths]) {
    const labels = labelsFor(changed);
    assert.equal(
      labels.filter((label) => label === 'node --test scripts/generate-code-status.test.cjs')
        .length,
      1
    );
    assert.ok(!labels.includes('node --test scripts/planning-db-query.test.cjs'));
  }
});

test('modular Planning DB operation sources retain their canonical suite without directory discovery', () => {
  const paths = [
    'scripts/planning-db/operate/cli.cjs',
    'scripts/planning-db/operate/command-values.cjs',
    'scripts/planning-db/operate/operation-payload.cjs',
    'scripts/planning-db/operate/docs.cjs',
    'scripts/planning-db/operate/component-definition.cjs',
    'scripts/planning-db/operate/component-operations.cjs',
    'scripts/planning-db/operate/feature-mechanization.cjs',
    'scripts/planning-db/operate/architecture-design-authority.cjs',
    'scripts/planning-db/operate/architecture-design-operations.cjs',
    'scripts/planning-db/operate/architecture-component-profile.cjs',
    'scripts/planning-db/operate/architecture-relations.cjs',
    'scripts/planning-db/operate/architecture-contracts-io.cjs',
    'scripts/planning-db/operate/architecture-evidence.cjs',
    'scripts/planning-db/operate/architecture-fitness.cjs',
    'scripts/planning-db/operate/architecture-audit.cjs',
    'scripts/planning-db/operate/evidence-origin.cjs',
    'scripts/planning-db/operate/fowler.cjs',
    'scripts/planning-db/operate/db-surface.cjs',
    'scripts/planning-db/catalog-implementation-reference-relocation.cjs',
    'scripts/planning-db/docs-canonical-source-resolution.cjs',
    'scripts/planning-db-operate-tests/catalog-implementation-reference-relocation.test.cjs',
  ];
  for (const files of [
    ...paths.map((file) => [file]),
    [...paths, 'scripts/planning-db-operate.cjs'],
  ]) {
    for (const labels of [focusedLabelsFor(files), labelsFor(files)]) {
      assert.equal(
        labels.filter((label) => label === 'node --test scripts/planning-db-operate.test.cjs')
          .length,
        1
      );
      assert.ok(!labels.includes('pnpm test:planning:db'));
    }
  }
  const unknown = ['scripts/planning-db/operate/undeclared-operation.cjs'];
  for (const labels of [focusedLabelsFor(unknown), labelsFor(unknown)]) {
    assert.ok(
      labels.includes('node --test scripts/planning-db-operate.test.cjs'),
      'Unknown operation sources retain the canonical owner suite'
    );
  }
});

test('buildVerifyChangedPlan routes catalog reconciliation to one canonical command suite', () => {
  const paths = [
    'scripts/planning-db/catalog-reconciliation.cjs',
    'scripts/planning-db/catalog-reconciliation-write.cjs',
    'scripts/planning-db-operate-tests/catalog-reconciliation.test.cjs',
    'scripts/planning-db/feature-mechanization-evidence-retirement.cjs',
    'scripts/planning-db-operate-tests/feature-mechanization-retirement.test.cjs',
  ];
  for (const changed of [...paths.map((path) => [path]), paths]) {
    const labels = labelsFor(changed);
    assert.equal(
      labels.filter((label) => label === 'node --test scripts/planning-db-operate.test.cjs').length,
      1
    );
    assert.ok(!labels.includes('pnpm test:planning:db'));
  }
});

test('buildVerifyChangedPlan runs changed closeout helper tests directly', () => {
  const labels = labelsFor(['scripts/closeout-changed.cjs']);

  assert.equal(
    labels.filter((label) => label === 'node --test scripts/closeout-changed.test.cjs').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs changed governance report tests directly', () => {
  const labels = labelsFor(['scripts/generate-governance-remediation-queue.test.cjs']);

  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/generate-governance-remediation-queue.test.cjs'
    ).length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs changed AI preflight tests directly', () => {
  const labels = labelsFor(['scripts/ai-preflight.cjs']);

  assert.equal(
    labels.filter((label) => label === 'node --test scripts/ai-preflight.test.cjs').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan routes CI tooling modules to the complete contracts once', () => {
  const plan = buildVerifyChangedPlan(['tools/ci/repository-command-catalog.mjs']);
  assert.equal(
    effectiveNodeTestFiles(plan).filter(
      (file) => file === 'tools/ci/repository-command-catalog.test.mjs'
    ).length,
    1
  );
  assert.equal(plan.filter((step) => step.args.includes('test:ci-tools')).length, 1);
});

test('buildVerifyChangedPlan runs changed CI tooling tests directly and deduped', () => {
  const labels = labelsFor([
    'tools/ci/repository-command-catalog.test.mjs',
    'tools/ci/workflow-pattern-parity.test.mjs',
  ]);

  assertLabels(labels, [...new Set(labels)]);
  assert.equal(
    labels.filter((label) => label === 'node --test tools/ci/repository-command-catalog.test.mjs')
      .length,
    1
  );
  assert.equal(
    labels.filter((label) => label === 'node --test tools/ci/workflow-pattern-parity.test.mjs')
      .length,
    1
  );
  assert.ok(!labels.includes('pnpm test:ci-tools'));
});
