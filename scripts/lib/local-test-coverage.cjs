/**
 * Owned concern: effective test membership and removal of covered executions.
 * @baseline Local Changed Files Gate: package and parent suites own their real members.
 * @decision Read bounded literal declarations and retain every uncovered test.
 * @consequence Coverage composition cannot invent ownership or silently lose an obligation.
 * @version 1.0.0
 */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { testStep } = require('./local-validation-plan-values.cjs');
const { buildCiToolTestList } = require('../../tools/ci/ci-tool-test-suite.mjs');
const repoRoot = path.resolve(__dirname, '../..');
const PARENT_SUITES = Object.freeze([
  ['scripts/planning-db-query.test.cjs', 'scripts/planning-db-query-tests/'],
  ['scripts/planning-db-operate.test.cjs', 'scripts/planning-db-operate-tests/'],
  ['scripts/generate-code-status.test.cjs', 'scripts/generate-code-status-tests/'],
]);
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

function readModuleRequires(file, options, strict = true) {
  const root = options.repoRootPath || repoRoot;
  const ast = ts.createSourceFile(
    file,
    fs.readFileSync(path.join(root, file), 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  if (ast.parseDiagnostics.length) throw new Error(`Invalid test parent source: ${file}`);
  const dependencies = [];
  const visit = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text.endsWith('.test.cjs')
    ) {
      throw new Error(`Unsupported test parent import: ${file}`);
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.getText(ast) === 'require' ||
        node.expression.kind === ts.SyntaxKind.ImportKeyword)
    ) {
      const [argument] = node.arguments;
      if (!argument || !ts.isStringLiteral(argument)) {
        if (strict) throw new Error(`Nonliteral test parent dependency: ${file}`);
        return;
      }
      dependencies.push({
        target: path.posix.normalize(path.posix.join(path.posix.dirname(file), argument.text)),
        relative: argument.text.startsWith('./'),
        test: argument.text.endsWith('.test.cjs'),
        standalone:
          node.expression.getText(ast) === 'require' &&
          ts.isExpressionStatement(node.parent) &&
          ts.isSourceFile(node.parent.parent),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return dependencies;
}

function readParentSuiteMembers(parent, options = {}) {
  if (!PARENT_SUITES.some(([entry]) => entry === parent))
    throw new Error(`Unknown test parent: ${parent}`);
  const root = options.repoRootPath || repoRoot;
  const members = [];
  for (const dependency of readModuleRequires(parent, options)) {
    if (!dependency.test) continue;
    const member = dependency.target;
    if (!dependency.standalone)
      throw new Error(`Conditional or unsupported test parent member: ${parent}: ${member}`);
    if (
      !dependency.relative ||
      member.startsWith('../') ||
      !fs.existsSync(path.join(root, member))
    ) {
      throw new Error(`Unavailable test parent member: ${parent}: ${member}`);
    }
    if (members.includes(member))
      throw new Error(`Repeated test parent member: ${parent}: ${member}`);
    members.push(member);
  }
  if (members.length === 0) throw new Error(`Empty test parent: ${parent}`);
  return members;
}

function parentTestSuiteFor(file, options = {}) {
  const family = PARENT_SUITES.find(([, directory]) => file.startsWith(directory));
  if (!family) return null;
  const [parent, directory] = family;
  const members = readParentSuiteMembers(parent, options);
  if (members.includes(file)) return parent;
  if (file === directory + 'helpers.cjs') {
    if (
      [parent, ...members].some((member) =>
        readModuleRequires(member, options, false).some((dependency) => dependency.target === file)
      )
    )
      return parent;
  }
  return null;
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
    if (PARENT_SUITES.some(([parent]) => parent === file))
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
      if (PARENT_SUITES.some(([parent]) => parent === file))
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
      PARENT_SUITES.some(([parent]) => parent === file)
        ? [file, ...readParentSuiteMembers(file, options)]
        : [file]
    );
  });
}

module.exports = {
  readParentSuiteMembers,
  parentTestSuiteFor,
  composeLocalTestCoverage,
  effectiveNodeTestFiles,
};
