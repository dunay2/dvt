/**
 * Owned concern: prove literal parent membership without executing its test bodies.
 * @baseline Local Changed Files Gate: loading evidence owns parent coverage.
 * @decision Query real parents and vary only declarations at the acquisition boundary.
 * @consequence Unsupported or absent evidence cannot grant suite membership.
 * @version 1.0.0
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  isParentSuite,
  readParentSuiteMembers,
  parentTestSuiteFor,
} = require('./local-test-membership.cjs');

test('Chromium diagnostics parent membership is admitted from literal test loading', () => {
  const parent = 'scripts/chromium-network-diagnostics.test.cjs';
  const child = 'scripts/chromium-network-diagnostics-tests/capture-admission.test.cjs';
  const members = readParentSuiteMembers(parent);
  assert.ok(members.includes(child));
  assert.equal(parentTestSuiteFor(child), parent);
  assert.equal(
    parentTestSuiteFor('scripts/chromium-network-diagnostics-tests/helpers.cjs'),
    parent
  );
  assert.equal(new Set(members).size, members.length);
});

test('the private parent catalog does not admit unknown or adjacent families', () => {
  assert.ok(isParentSuite('scripts/planning-db-query.test.cjs'));
  assert.ok(!isParentSuite('scripts/unregistered-parent.test.cjs'));
  assert.throws(
    () => readParentSuiteMembers('scripts/unregistered-parent.test.cjs'),
    /Unknown test parent/u
  );
  assert.equal(parentTestSuiteFor('scripts/planning-db-operate-tests-adjacent/helpers.cjs'), null);
  assert.ok(!Object.hasOwn(require('./local-test-membership.cjs'), 'PARENT_SUITES'));
});

test('parent membership proves unconditional requires and rejects unprovable test loading', (t) => {
  const parent = 'scripts/planning-db-query.test.cjs';
  const target = path.resolve(__dirname, '../..', parent);
  const read = fs.readFileSync;
  for (const declaration of [
    "if (enabled) require('./planning-db-query-tests/current-component-files.test.cjs');",
    'require(testPath);',
    "const loaded = require('./planning-db-query-tests/current-component-files.test.cjs');",
    "import './planning-db-query-tests/current-component-files.test.cjs';",
  ]) {
    const mock = t.mock.method(fs, 'readFileSync', (file, ...args) =>
      path.resolve(file) === target
        ? "require('./planning-db-query-tests/catalogs.test.cjs');\n" + declaration
        : read(file, ...args)
    );
    try {
      assert.throws(() => readParentSuiteMembers(parent), /test parent/u);
    } finally {
      mock.mock.restore();
    }
  }
});

test('duplicate, unavailable, empty and invalid parent declarations reject', (t) => {
  const parent = 'scripts/planning-db-query.test.cjs';
  const target = path.resolve(__dirname, '../..', parent);
  const member = "require('./planning-db-query-tests/catalogs.test.cjs');";
  const read = fs.readFileSync;
  for (const [declaration, reason] of [
    [member + member, /Repeated test parent member/u],
    [
      "require('./planning-db-query-tests/absent-membership-contract.test.cjs');",
      /Unavailable test parent member/u,
    ],
    ["require('node:assert/strict');", /Empty test parent/u],
    ['require(', /Invalid test parent source/u],
  ]) {
    const mock = t.mock.method(fs, 'readFileSync', (file, ...args) =>
      path.resolve(file) === target ? declaration : read(file, ...args)
    );
    try {
      assert.throws(() => readParentSuiteMembers(parent), reason);
    } finally {
      mock.mock.restore();
    }
  }
});

test('canonical helper membership follows real imports independent of quote or spacing style', (t) => {
  const helper = 'scripts/planning-db-operate-tests/helpers.cjs';
  const member = path.resolve(__dirname, '../planning-db-operate-tests/cli.test.cjs');
  const read = fs.readFileSync;
  const directory = path.resolve(__dirname, '../planning-db-operate-tests') + path.sep;
  const mock = t.mock.method(fs, 'readFileSync', (file, ...args) =>
    path.resolve(file) === member
      ? 'const fixture = require ( "./helpers.cjs" );\n'
      : path.resolve(file).startsWith(directory)
        ? ''
        : read(file, ...args)
  );
  assert.equal(parentTestSuiteFor(helper), 'scripts/planning-db-operate.test.cjs');
  mock.mock.restore();
  t.mock.method(fs, 'readFileSync', (file, ...args) =>
    path.resolve(file).startsWith(directory) ? '' : read(file, ...args)
  );
  assert.equal(parentTestSuiteFor(helper), null);
});
