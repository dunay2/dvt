/**
 * Owned concern: prove scope-aware validation order and fail-closed success receipts.
 * @baseline Local Changed Files Gate: governance admission precedes affected checks.
 * @decision Exercise the canonical plan and executor; inject only child execution and receipts.
 * @consequence Static rejection starts no tests and cannot create a success stamp.
 * @version 1.0.0
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { currentSchemaSources } = require('../tools/planning-db/schema/manifest.cjs');
const catalogTest = 'node --test tools/ci/repository-command-catalog.test.mjs';
const cryptoTest =
  'node --test --test-name-pattern=tooling crypto mechanics tools/ci/architecture-dependency-guard.test.mjs';

const {
  buildFocusedChangedTestPlan,
  buildVerifyChangedPlan,
  commandLabel,
  executeVerifyChangedPlan,
  main,
  parseArgs,
} = require('./verify-changed.cjs');

const MIXED_CHANGED_FILES = [
  'apps/web/src/testing/vitestSuites.architecture.test.ts',
  'tools/planning-db/schema/manifest.cjs',
  'scripts/local-validation-plan.cjs',
  'scripts/check-changed.cjs',
];

function labelsFor(files) {
  return buildVerifyChangedPlan(files).map(commandLabel);
}

function focusedLabelsFor(files) {
  return buildFocusedChangedTestPlan(files).map(commandLabel);
}

const packagePath = path.resolve(__dirname, '../package.json');
const packageScripts = JSON.parse(fs.readFileSync(packagePath, 'utf8')).scripts;

function effectiveTestFiles(plan, scripts = packageScripts) {
  return plan.flatMap((step) => {
    if (step.kind !== 'test') return [];
    const args = step.command === 'pnpm' ? scripts[step.args[0]]?.split(/\s+/).slice(1) : step.args;
    return args?.[0] === '--test' && args.slice(1).every((arg) => !arg.startsWith('--'))
      ? args.slice(1)
      : [];
  });
}

function mockPackageScripts(t, scripts) {
  const readFileSync = fs.readFileSync;
  return t.mock.method(fs, 'readFileSync', (file, ...args) =>
    file === packagePath ? JSON.stringify({ scripts }) : readFileSync(file, ...args)
  );
}

test('Planning DB schema obligations retain both contracts exactly once', () => {
  const members = packageScripts['test:planning:db:current-schema'].split(/\s+/).slice(2);
  assert.ok(members.includes('scripts/planning-db-schema.test.cjs'));
  assert.ok(members.includes('scripts/planning-db-current-schema-policy.test.cjs'));
  for (const files of [
    ...currentSchemaSources.map((source) => [source]),
    ['tools/planning-db/schema/manifest.cjs'],
    ['scripts/planning-db/current-schema.cjs'],
    ['scripts/planning-db-schema.cjs'],
    ['scripts/planning-db-current-schema-policy.cjs'],
    ['tools/planning-db/schema/manifest.cjs', 'scripts/planning-db-schema.test.cjs'],
    ['scripts/planning-db-schema.test.cjs', 'scripts/planning-db-current-schema-policy.test.cjs'],
  ]) {
    const plan = buildFocusedChangedTestPlan(files);
    const selected = effectiveTestFiles(plan);
    for (const member of members)
      assert.equal(selected.filter((file) => file === member).length, 1, `${files}: ${member}`);
    assert.ok(!plan.some((step) => step.args.includes('test:planning:db')));
  }
});

test('Planning DB aggregate coverage removes repeated direct and current-schema execution', () => {
  const aggregate = packageScripts['test:planning:db'].split(/\s+/).slice(2);
  const files = [
    'infra/planning-db/docker-compose.yml',
    'tools/planning-db/schema/manifest.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/lib/source-code-facts.cjs',
    'scripts/git-local-changes.cjs',
  ];
  const plan = buildFocusedChangedTestPlan(files);
  const selected = effectiveTestFiles(plan);
  assert.equal(selected.length, new Set(selected).size);
  for (const member of aggregate) assert.ok(selected.includes(member), member);
  assert.ok(selected.includes('scripts/git-local-changes.test.cjs'));
  assert.ok(selected.includes('scripts/lib/source-code-facts.test.cjs'));
  assert.ok(selected.includes('scripts/web-code-duplication.test.cjs'));
  assert.ok(plan.some((step) => commandLabel(step) === cryptoTest));
  assert.ok(!plan.some((step) => step.args.includes('test:planning:db:current-schema')));
  assert.deepEqual(buildFocusedChangedTestPlan([...files].reverse().concat(files)), plan);
});

test('Python source-facts inputs retain all actual source-facts consumers exactly once', () => {
  for (const source of [
    'scripts/lib/python-source-facts.cjs',
    'scripts/lib/python-source-facts.py',
  ]) {
    const plan = buildFocusedChangedTestPlan([source]);
    const selected = effectiveTestFiles(plan);
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
  const paired = effectiveTestFiles(
    buildFocusedChangedTestPlan(['scripts/lib/python-source-facts.test.cjs'])
  );
  assert.equal(
    paired.filter((file) => file === 'scripts/lib/python-source-facts.test.cjs').length,
    1
  );
});

test('Planning DB aggregate coverage retains canonical parent execution without direct shards', () => {
  const plan = buildFocusedChangedTestPlan([
    'infra/planning-db/docker-compose.yml',
    'scripts/planning-db/queries/current-component-files-query.cjs',
    'scripts/planning-db/feature-mechanization-policy.cjs',
  ]);
  const selected = effectiveTestFiles(plan);
  assert.ok(selected.includes('scripts/planning-db-query.test.cjs'));
  assert.ok(selected.includes('scripts/planning-db-operate.test.cjs'));
  assert.ok(!selected.includes('scripts/planning-db-query-tests/current-component-files.test.cjs'));
  assert.ok(!selected.includes('scripts/planning-db-operate-tests/feature-mechanization.test.cjs'));
  for (const [parent, child] of [
    ['planning-db-query.test.cjs', 'planning-db-query-tests/current-component-files.test.cjs'],
    ['planning-db-operate.test.cjs', 'planning-db-operate-tests/feature-mechanization.test.cjs'],
  ]) {
    assert.ok(
      fs.readFileSync(path.join(__dirname, parent), 'utf8').includes(`require('./${child}')`)
    );
  }
});

test('Planning DB aggregate coverage follows actual package members and retains uncovered tests', (t) => {
  const schema = 'scripts/planning-db-schema.test.cjs';
  const extra = 'scripts/git-local-changes.test.cjs';
  const scripts = {
    ...packageScripts,
    'test:planning:db': packageScripts['test:planning:db']
      .split(/\s+/)
      .filter((arg) => arg !== schema)
      .join(' '),
    'test:planning:db:current-schema': `${packageScripts['test:planning:db:current-schema']} ${extra}`,
  };
  mockPackageScripts(t, scripts);
  const plan = buildFocusedChangedTestPlan([
    'infra/planning-db/docker-compose.yml',
    'tools/planning-db/schema/manifest.cjs',
    'scripts/git-local-changes.cjs',
  ]);
  const selected = effectiveTestFiles(plan, scripts);
  assert.equal(selected.length, new Set(selected).size);
  assert.ok(selected.includes(schema));
  assert.ok(selected.includes(extra));
  assert.ok(plan.every((step) => step.kind === 'test'));
});

test('Planning DB aggregate coverage rejects unsupported package declarations before execution', (t) => {
  const invalidCommands = [
    undefined,
    '',
    'node --test',
    'node --test scripts/planning-db-schema.test.cjs && echo done',
    'node --test --test-name-pattern=schema scripts/planning-db-schema.test.cjs',
    'node --test scripts/*.test.cjs',
    'node --test ../outside.test.cjs',
    'node --test scripts/absent-planning-contract.test.cjs',
    'node --test scripts/planning-db-schema.test.cjs scripts/planning-db-schema.test.cjs',
  ];
  for (const [name, changedFile] of [
    ['test:planning:db:current-schema', 'tools/planning-db/schema/manifest.cjs'],
    ['test:planning:db', 'infra/planning-db/docker-compose.yml'],
  ]) {
    for (const command of invalidCommands) {
      const mock = mockPackageScripts(t, { ...packageScripts, [name]: command });
      try {
        assert.throws(
          () => buildFocusedChangedTestPlan([changedFile]),
          new RegExp(`Invalid test aggregate ${name}:`),
          String(command)
        );
      } finally {
        mock.mock.restore();
      }
    }
  }
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
    for (const suite of suites)
      assert.equal(plan.filter((step) => step.args.includes(suite)).length, 1, suite);
    assert.ok(!plan.some((step) => step.args.includes('test:ci-tools')));
  }
});

test('buildFocusedChangedTestPlan retains adjacent script tests without duplicating general gates', () => {
  const labels = focusedLabelsFor([
    'docs/guides/testing-and-ci-capabilities.md',
    'scripts/git-local-changes.cjs',
    'scripts/planning-db-query.cjs',
  ]);

  assert.deepEqual(labels, [
    'node --test scripts/git-local-changes.test.cjs',
    'node --test scripts/planning-db-query.test.cjs',
    catalogTest,
    cryptoTest,
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

  assert.deepEqual(labels, [
    'node --test scripts/web-code-duplication.test.cjs',
    'node --test scripts/planning-db/code-symbol-inventory.test.cjs',
    'node --test scripts/check-changed.test.cjs',
    catalogTest,
    cryptoTest,
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
      assert.deepEqual(
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
      assert.deepEqual(focusedLabelsFor(files), [
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
    '.github/workflows/test.yml',
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
  assert.deepEqual(focusedLabelsFor(['scripts/ai-preflight.cjs']), [
    'node --test scripts/ai-preflight.test.cjs',
    catalogTest,
    cryptoTest,
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
    assert.deepEqual(
      focusedLabelsFor(changed),
      [expected, catalogTest, cryptoTest],
      changed.join(', ')
    );
  }
  assert.deepEqual(focusedLabelsFor([...files, 'scripts/planning-db-integrity-check.cjs']), [
    'node --test scripts/planning-db-integrity-check.test.cjs',
    expected,
    catalogTest,
    cryptoTest,
  ]);
});

test('buildVerifyChangedPlan keeps docs-only iteration on changed-file gates', () => {
  const labels = labelsFor(['docs/planning/templates/component-engineering-record-template.md']);

  assert.deepEqual(labels, [
    'pnpm planning:db:knowledge-intake:retirement:check',
    'pnpm docs:gov:locations -- --changed-only',
    'pnpm docs:gov:filenames:changed',
    'pnpm docs:gov:frontmatter:changed',
    'pnpm docs:arc:evidence:check -- --changed-only',
    'pnpm qa:artifact:check',
    'pnpm lint:md:changed',
    'pnpm docs:feature-mechanization:implementation',
    'node scripts/check-changed.cjs',
    'node scripts/check-forbidden-tracked-files.cjs',
  ]);

  assert.ok(!labels.includes('pnpm docs:governance:document-unit-map:check'));
  assert.ok(!labels.includes('pnpm docs:governance:file-component-index:check'));
  assert.ok(!labels.includes('pnpm docs:governance:file-fingerprint-baseline:check'));
  assert.ok(!labels.includes('pnpm docs:governance:coverage-report:check'));
  assert.ok(!labels.includes('pnpm docs:governance:remediation-queue:check'));
  assert.ok(!labels.includes('pnpm verify:prepush'));
  assert.ok(!labels.includes('node scripts/docs-workboard-check-changed.cjs'));
});

test('buildVerifyChangedPlan adds planning DB validation for planning query-store changes', () => {
  const labels = labelsFor([
    'scripts/planning-db-query.cjs',
    'tools/planning-db/schema/manifest.cjs',
  ]);

  assert.equal(labels.filter((label) => label === 'pnpm governance:db:import').length, 0);
  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(labels.filter((label) => label === 'pnpm planning:db:integrity:check').length, 1);
  assert.ok(
    labels.indexOf('pnpm planning:db:inventory:check') <
      labels.indexOf('pnpm planning:db:integrity:check')
  );
  assert.equal(
    labels.filter((label) => label === 'node --test scripts/planning-db-query.test.cjs').length,
    1
  );
  assert.equal(
    labels.filter((label) => label === 'pnpm test:planning:db:current-schema').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs the buzon retirement guard before markdown gates', () => {
  const labels = labelsFor(['buzon/new-fowler-analysis.md']);

  assert.ok(labels.includes('pnpm planning:db:knowledge-intake:retirement:check'));
  assert.ok(
    labels.indexOf('pnpm planning:db:knowledge-intake:retirement:check') <
      labels.indexOf('pnpm docs:gov:locations -- --changed-only')
  );
});

test('buildVerifyChangedPlan routes schema-only changes to the current-schema suite', () => {
  const labels = labelsFor(['tools/planning-db/schema/manifest.cjs']);

  assert.equal(labels.filter((label) => label === 'pnpm governance:db:import').length, 0);
  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(labels.filter((label) => label === 'pnpm planning:db:integrity:check').length, 1);
  assert.equal(
    labels.filter((label) => label === 'pnpm test:planning:db:current-schema').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan covers direct schema edits through the complete current-schema suite', () => {
  const labels = labelsFor([
    'scripts/planning-db-schema.test.cjs',
    'tools/planning-db/schema/manifest.cjs',
  ]);

  assert.equal(
    labels.filter((label) => label === 'pnpm test:planning:db:current-schema').length,
    1
  );
  assert.ok(!labels.includes('node --test scripts/planning-db-schema.test.cjs'));
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan keeps mixed docs and planning DB slices targeted and deduped', () => {
  const labels = labelsFor([
    'docs/guides/testing-and-ci-capabilities.md',
    'scripts/planning-db-import.cjs',
    'scripts/planning-db-import.test.cjs',
    'scripts/planning-db-schema.test.cjs',
    'tools/planning-db/schema/manifest.cjs',
  ]);

  assert.deepEqual(labels, [...new Set(labels)]);
  assert.equal(
    labels.filter((label) => label === 'node --test scripts/planning-db-import.test.cjs').length,
    1
  );
  assert.equal(
    labels.filter((label) => label === 'pnpm test:planning:db:current-schema').length,
    1
  );
  assert.ok(!labels.includes('node --test scripts/planning-db-schema.test.cjs'));
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs changed planning DB tests directly', () => {
  const labels = labelsFor(['scripts/planning-db-surface-inventory-check.test.cjs']);

  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/planning-db-surface-inventory-check.test.cjs'
    ).length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan routes planning DB query shards to the canonical suite', () => {
  const labels = labelsFor([
    'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
    'scripts/planning-db-query-tests/fowler-analysis.test.cjs',
    'scripts/planning-db-query-tests/governance-refresh.test.cjs',
    'scripts/planning-db-query-tests/helpers.cjs',
  ]);

  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(
    labels.filter((label) => label === 'node --test scripts/planning-db-query.test.cjs').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
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

test('buildVerifyChangedPlan runs focused frontend component inventory tests directly', () => {
  const labels = labelsFor(['scripts/planning-db/frontend-component-inventory.cjs']);

  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/planning-db-frontend-component-inventory.test.cjs'
    ).length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs changed governance DB tests directly', () => {
  const labels = labelsFor(['scripts/governance-db-import.test.cjs']);

  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(
    labels.filter((label) => label === 'node --test scripts/governance-db-import.test.cjs').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan reuses canonical planning DB scope for inventory checks', () => {
  const labels = labelsFor(['scripts/governance-generated-paths.cjs']);

  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs adjacent planning workflow tests without the full DB suite', () => {
  const labels = labelsFor(['scripts/governance-refresh.cjs']);

  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(
    labels.filter((label) => label === 'node --test scripts/governance-refresh.test.cjs').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs changed closeout helper tests directly', () => {
  const labels = labelsFor(['scripts/closeout-changed.cjs']);

  assert.equal(
    labels.filter((label) => label === 'node --test scripts/closeout-changed.test.cjs').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs targeted governance report generator tests for AI-sized changes', () => {
  const labels = labelsFor([
    'scripts/generate-governance-coverage-report.cjs',
    'scripts/generate-governance-remediation-queue.cjs',
  ]);

  assert.ok(!labels.includes('pnpm planning:db:inventory:check'));
  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/generate-governance-coverage-report.test.cjs'
    ).length,
    1
  );
  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/generate-governance-remediation-queue.test.cjs'
    ).length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs targeted ownership generator tests for AI-sized changes', () => {
  const labels = labelsFor([
    'scripts/check-governance-unit-coverage.cjs',
    'scripts/generate-governance-file-component-index.cjs',
    'scripts/generate-governance-document-unit-map.cjs',
  ]);

  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/check-governance-unit-coverage.test.cjs'
    ).length,
    1
  );
  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/generate-governance-file-component-index.test.cjs'
    ).length,
    1
  );
  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/generate-governance-document-unit-map.test.cjs'
    ).length,
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

test('buildVerifyChangedPlan retains every mixed-scope gate once with static checks before tests', () => {
  const plan = buildVerifyChangedPlan(MIXED_CHANGED_FILES);
  const labels = plan.map(commandLabel);

  assert.deepEqual(labels, [
    'pnpm planning:db:knowledge-intake:retirement:check',
    'pnpm planning:db:inventory:check',
    'pnpm planning:db:integrity:check',
    'pnpm docs:gov:locations -- --changed-only',
    'pnpm docs:gov:filenames:changed',
    'pnpm docs:gov:frontmatter:changed',
    'pnpm docs:arc:evidence:check -- --changed-only',
    'pnpm qa:artifact:check',
    'pnpm lint:md:changed',
    'pnpm docs:feature-mechanization:implementation',
    'node scripts/check-changed.cjs',
    'pnpm test:web:changed',
    'node --test scripts/web-code-duplication.test.cjs',
    'node --test scripts/planning-db/code-symbol-inventory.test.cjs',
    'node --test scripts/check-changed.test.cjs',
    catalogTest,
    cryptoTest,
    'pnpm test:planning:db:current-schema',
    'node --test scripts/verify-changed.test.cjs',
    'node --test scripts/verify-prepush.test.cjs',
    'node scripts/check-forbidden-tracked-files.cjs',
  ]);
  assert.equal(new Set(labels).size, plan.length);
  assert.equal(new Set(plan.map((step) => step.id)).size, plan.length);
  assert.deepEqual(plan.filter((step) => step.kind === 'test').map(commandLabel), [
    'pnpm test:web:changed',
    'node --test scripts/web-code-duplication.test.cjs',
    'node --test scripts/planning-db/code-symbol-inventory.test.cjs',
    'node --test scripts/check-changed.test.cjs',
    catalogTest,
    cryptoTest,
    'pnpm test:planning:db:current-schema',
    'node --test scripts/verify-changed.test.cjs',
    'node --test scripts/verify-prepush.test.cjs',
  ]);
});

test('buildVerifyChangedPlan self-tests developer workflow verifier changes', () => {
  const labels = labelsFor(['scripts/local-validation-plan.cjs']);

  assert.ok(labels.includes('node --test scripts/verify-changed.test.cjs'));
  assert.ok(labels.includes('node --test scripts/verify-prepush.test.cjs'));
});

test('buildVerifyChangedPlan runs changed AI preflight tests directly', () => {
  const labels = labelsFor(['scripts/ai-preflight.cjs']);

  assert.equal(
    labels.filter((label) => label === 'node --test scripts/ai-preflight.test.cjs').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan routes CI tooling modules to adjacent tests', () => {
  const labels = labelsFor(['tools/ci/repository-command-catalog.mjs']);

  assert.equal(
    labels.filter((label) => label === 'node --test tools/ci/repository-command-catalog.test.mjs')
      .length,
    1
  );
  assert.ok(!labels.includes('pnpm test:ci-tools'));
});

test('buildVerifyChangedPlan runs changed CI tooling tests directly and deduped', () => {
  const labels = labelsFor([
    'tools/ci/repository-command-catalog.mjs',
    'tools/ci/repository-command-catalog.test.mjs',
    'tools/ci/workflow-pattern-parity.test.mjs',
  ]);

  assert.deepEqual(labels, [...new Set(labels)]);
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

test('buildVerifyChangedPlan self-tests changed verifier changes without prepush verifier tests', () => {
  const labels = labelsFor(['scripts/verify-changed.cjs']);

  assert.ok(labels.includes('node --test scripts/verify-changed.test.cjs'));
  assert.ok(!labels.includes('node --test scripts/verify-prepush.test.cjs'));
});

test('buildVerifyChangedPlan self-tests prepush verifier changes without changed verifier tests', () => {
  const labels = labelsFor(['scripts/verify-prepush.cjs']);

  assert.ok(!labels.includes('node --test scripts/verify-changed.test.cjs'));
  assert.ok(labels.includes('node --test scripts/verify-prepush.test.cjs'));
});

test('main executes every gate once before building and writing the success stamp', () => {
  const plan = buildVerifyChangedPlan(MIXED_CHANGED_FILES);
  const events = [];
  const stamps = [];
  const status = main([], {
    changedFiles: MIXED_CHANGED_FILES,
    executeVerifyChangedPlan: (steps, options) =>
      executeVerifyChangedPlan(steps, {
        ...options,
        spawn: (command, args, spawnOptions) => {
          assert.equal(Object.hasOwn(spawnOptions, 'env'), plan[events.length].kind === 'test');
          events.push(commandLabel({ command, args }));
          return { status: 0 };
        },
      }),
    printPlan: () => {},
    buildPrepushStamp: (files) => {
      events.push('build-stamp');
      return {
        validationLevel: 'default',
        changedFiles: files,
        stateFingerprint: 'same-tree',
      };
    },
    writePrepushStamp: (stamp) => {
      events.push('write-stamp');
      stamps.push(stamp);
    },
  });

  assert.equal(status, 0);
  assert.deepEqual(events, [...plan.map(commandLabel), 'build-stamp', 'write-stamp']);
  assert.deepEqual(stamps, [
    {
      validationLevel: 'default',
      changedFiles: MIXED_CHANGED_FILES,
      stateFingerprint: 'same-tree',
    },
  ]);
});

test('main preserves static failure without running any tests, later gates or stamp operations', () => {
  const plan = buildVerifyChangedPlan(MIXED_CHANGED_FILES);
  const calls = [];
  const status = main([], {
    changedFiles: MIXED_CHANGED_FILES,
    executeVerifyChangedPlan: (steps, options) =>
      executeVerifyChangedPlan(steps, {
        ...options,
        spawn: (command, args) => {
          const label = commandLabel({ command, args });
          calls.push(label);
          return { status: label === 'node scripts/check-changed.cjs' ? 7 : 0 };
        },
      }),
    printPlan: () => {},
    buildPrepushStamp: () => assert.fail('Failed validation must not build a stamp'),
    writePrepushStamp: () => assert.fail('Failed validation must not write a stamp'),
  });

  assert.equal(status, 7);
  const failedIndex = plan.findIndex((step) => step.id === 'check-changed');
  assert.deepEqual(calls, plan.slice(0, failedIndex + 1).map(commandLabel));
  assert.deepEqual(
    plan.filter((step) => step.kind === 'test' && calls.includes(commandLabel(step))),
    []
  );
});

test('main runs focused tests from the exact committed diff without writing a local stamp', () => {
  const calls = [];
  const stamps = [];
  const status = main(['--committed-tests'], {
    listCommittedChangedFiles: () => ['scripts/planning-db-query.cjs'],
    executeFocusedChangedTestPlan: (plan) => {
      calls.push(...plan.map(commandLabel));
      return 0;
    },
    printPlan: () => {},
    writePrepushStamp: (stamp) => stamps.push(stamp),
  });

  assert.equal(status, 0);
  assert.deepEqual(calls, [
    'node --test scripts/planning-db-query.test.cjs',
    catalogTest,
    cryptoTest,
  ]);
  assert.deepEqual(stamps, []);
});

test('parseArgs supports dry-run planning without executing commands', () => {
  assert.deepEqual(parseArgs(['--dry-run']), { dryRun: true, committedTests: false });
  assert.deepEqual(parseArgs(['--committed-tests']), {
    dryRun: false,
    committedTests: true,
  });
  assert.throws(() => parseArgs(['--unknown']), /Unknown argument: --unknown/);
});
