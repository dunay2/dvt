/**
 * Owned concern: compose effective coverage and remove covered test executions.
 * @baseline Local Changed Files Gate: package and parent suites own their real members.
 * @decision Validate complete invocations and query actual parent membership.
 * @consequence Coverage composition cannot invent ownership or silently lose an obligation.
 * @version 1.0.0
 */
const fs = require('node:fs');
const path = require('node:path');
const { testStep } = require('./local-validation-plan-values.cjs');
const { isParentSuite, readParentSuiteMembers } = require('./local-test-membership.cjs');
const { buildCiToolTestList } = require('../../tools/ci/ci-tool-test-catalog.mjs');
const repoRoot = path.resolve(__dirname, '../..');
const AGGREGATES = Object.freeze([
  'test:planning:db',
  'test:planning:db:current-schema',
  'test:verify-prepush',
]);

function isCompleteAggregate(entry) {
  return (
    entry.kind === 'test' &&
    entry.command === 'pnpm' &&
    entry.args.length === 1 &&
    AGGREGATES.includes(entry.args[0])
  );
}

function readTestAggregate(scripts, name, root = repoRoot) {
  const tokens = typeof scripts?.[name] === 'string' ? scripts[name].trim().split(/\s+/u) : [];
  const files = tokens.slice(2);
  if (
    tokens[0] !== 'node' ||
    tokens[1] !== '--test' ||
    files.length === 0 ||
    new Set(files).size !== files.length ||
    files.some(
      (file) =>
        !/^(?:[\w@.-]+\/)*[\w@.-]+\.test\.[cm]?js$/u.test(file) ||
        file.split('/').some((part) => part === '.' || part === '..') ||
        !fs.existsSync(path.join(root, file))
    )
  ) {
    throw new Error(
      `Invalid test aggregate ${name}: expected node --test with unique existing test files`
    );
  }
  return files;
}

function composeLocalTestCoverage(plan, options = {}) {
  const root = options.repoRootPath || repoRoot;
  const aggregates = plan
    .filter(isCompleteAggregate)
    .sort((left, right) => AGGREGATES.indexOf(left.args[0]) - AGGREGATES.indexOf(right.args[0]));
  const scripts = aggregates.length
    ? options.scripts ||
      JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts
    : undefined;
  const covered = new Set();
  const replacements = new Map();
  const cover = (file) => {
    covered.add(file);
    if (isParentSuite(file))
      readParentSuiteMembers(file, options).forEach((member) => covered.add(member));
  };
  for (const aggregate of aggregates) {
    const {
      id,
      args: [name],
    } = aggregate;
    const members = readTestAggregate(scripts, name, root);
    const remaining = members.filter((file) => !covered.has(file));
    replacements.set(
      id,
      remaining.length === 0
        ? null
        : remaining.length === members.length
          ? aggregate
          : testStep(id, 'node', '--test', ...remaining)
    );
    members.forEach(cover);
  }
  const direct = new Map(
    plan
      .filter(
        (entry) =>
          entry.kind === 'test' &&
          entry.command === 'node' &&
          entry.args[0] === '--test' &&
          entry.args.length > 1 &&
          entry.args.slice(1).every((arg) => !arg.startsWith('-'))
      )
      .map((entry) => [entry.id, entry.args.slice(1)])
  );
  // A selected real parent covers children even when it occurs later in the plan.
  for (const members of direct.values())
    for (const file of members) {
      if (isParentSuite(file))
        readParentSuiteMembers(file, options).forEach((member) => covered.add(member));
    }
  return plan.flatMap((entry) => {
    if (replacements.has(entry.id))
      return replacements.get(entry.id) ? [replacements.get(entry.id)] : [];
    const members = direct.get(entry.id);
    if (!members) return [entry];
    const remaining = members.filter((file) => !covered.has(file));
    remaining.forEach(cover);
    return remaining.length === 0 ? [] : [{ ...entry, args: ['--test', ...remaining] }];
  });
}

function effectiveNodeTestFiles(plan, options = {}) {
  const root = options.repoRootPath || repoRoot;
  const scripts =
    options.scripts || JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;
  return plan.flatMap((entry) => {
    if (entry.kind !== 'test') return [];
    if (entry.command === 'pnpm' && entry.args[0] === 'test:ci-tools')
      return buildCiToolTestList('all');
    const files =
      entry.command === 'pnpm'
        ? isCompleteAggregate(entry)
          ? readTestAggregate(scripts, entry.args[0], root)
          : []
        : entry.command === 'node' && entry.args[0] === '--test'
          ? entry.args.slice(1).filter((argument) => !argument.startsWith('--'))
          : [];
    return files.flatMap((file) =>
      isParentSuite(file) ? [file, ...readParentSuiteMembers(file, options)] : [file]
    );
  });
}

module.exports = {
  composeLocalTestCoverage,
  effectiveNodeTestFiles,
};
