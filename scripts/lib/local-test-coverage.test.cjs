/**
 * Owned concern: prove effective package and parent test coverage.
 * @baseline Local Changed Files Gate: preserve each selected contract and failure boundary.
 * @decision Move existing assertions with their concrete owner instead of copying routing data.
 * @consequence Partial selection cannot hide lost coverage or acceptance obligations.
 * @version 1.0.0
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { currentSchemaSources } = require('../../tools/planning-db/schema/manifest.cjs');
const { buildCiToolTestList } = require('../../tools/ci/ci-tool-test-catalog.mjs');

const { buildFocusedChangedTestPlan } = require('./changed-test-selection.cjs');
const { composeLocalTestCoverage, effectiveNodeTestFiles } = require('./local-test-coverage.cjs');
const { readParentSuiteMembers } = require('./local-test-membership.cjs');
const { testStep } = require('./local-validation-plan-values.cjs');

const packagePath = path.resolve(__dirname, '../../package.json');
const packageScripts = JSON.parse(fs.readFileSync(packagePath, 'utf8')).scripts;
function effectiveTestFiles(plan, scripts = packageScripts) {
  return plan.flatMap((step) => {
    if (step.kind !== 'test') return [];
    if (step.command === 'pnpm' && step.args[0] === 'test:ci-tools')
      return buildCiToolTestList('all');
    const args = step.command === 'pnpm' ? scripts[step.args[0]]?.split(/\s+/).slice(1) : step.args;
    return args?.[0] === '--test' && args.slice(1).every((arg) => !arg.startsWith('--'))
      ? args.slice(1)
      : [];
  });
}
function mockPackageScripts(t, scripts) {
  const read = fs.readFileSync;
  return t.mock.method(fs, 'readFileSync', (file, ...args) =>
    file === packagePath ? JSON.stringify({ scripts }) : read(file, ...args)
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
  assert.ok(selected.includes('tools/ci/architecture-dependency-guard.test.mjs'));
  assert.ok(!plan.some((step) => step.args.includes('test:planning:db:current-schema')));
  assert.deepEqual(buildFocusedChangedTestPlan([...files].reverse().concat(files)), plan);
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
    assert.ok(readParentSuiteMembers('scripts/' + parent).includes('scripts/' + child));
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

test('aggregate coverage follows the exact invocation and cannot be invented by an ID or filter', () => {
  for (const first of [
    testStep('test-verify-prepush', 'node', '--test', 'scripts/verify-prepush.test.cjs'),
    testStep('test-verify-prepush', 'pnpm', 'test:verify-prepush', '--test-name-pattern=partial'),
  ]) {
    const direct = testStep('changed-cli', 'node', '--test', 'scripts/verify-changed.test.cjs');
    assert.deepEqual(composeLocalTestCoverage([first, direct]), [first, direct]);
  }
});

test('effective coverage counts actual parent execution and removes only its covered direct child', () => {
  const uncovered = 'scripts/lib/local-validation-plan-values.test.cjs';
  for (const [parent, child] of [
    [
      'scripts/planning-db-query.test.cjs',
      'scripts/planning-db-query-tests/current-component-files.test.cjs',
    ],
    [
      'scripts/chromium-network-diagnostics.test.cjs',
      'scripts/chromium-network-diagnostics-tests/capture-admission.test.cjs',
    ],
  ]) {
    const obligations = [parent, child, uncovered].map((file, index) =>
      testStep(String(index), 'node', '--test', file)
    );
    for (const plan of [
      obligations,
      [...obligations].reverse(),
      [...obligations, obligations[1]],
    ]) {
      assert.ok(effectiveNodeTestFiles(plan).filter((file) => file === child).length > 1);
      const composed = composeLocalTestCoverage(plan);
      const effective = effectiveNodeTestFiles(composed);
      assert.equal(effective.filter((file) => file === child).length, 1);
      assert.equal(effective.filter((file) => file === uncovered).length, 1);
      assert.ok(composed.some((entry) => entry.args.includes(parent)));
    }
  }
  const core = [
    testStep('test-verify-prepush', 'pnpm', 'test:verify-prepush'),
    testStep(
      'direct-value-contract',
      'node',
      '--test',
      'scripts/lib/local-validation-plan-values.test.cjs'
    ),
  ];
  assert.equal(
    effectiveNodeTestFiles(composeLocalTestCoverage(core)).filter(
      (file) => file === 'scripts/lib/local-validation-plan-values.test.cjs'
    ).length,
    1
  );
});
