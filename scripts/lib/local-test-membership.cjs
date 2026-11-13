/**
 * Owned concern: acquire the actual members of admitted parent test suites.
 * @baseline Local Changed Files Gate: a parent covers only its real test imports.
 * @decision Keep one private catalog and reject unprovable literal membership.
 * @consequence Membership queries neither execute tests nor alter the coverage plan.
 * @version 1.0.0
 */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const repoRoot = path.resolve(__dirname, '../..');
const PARENT_SUITES = Object.freeze([
  ['scripts/planning-db-query.test.cjs', 'scripts/planning-db-query-tests/'],
  ['scripts/planning-db-operate.test.cjs', 'scripts/planning-db-operate-tests/'],
  ['scripts/generate-code-status.test.cjs', 'scripts/generate-code-status-tests/'],
  ['scripts/chromium-network-diagnostics.test.cjs', 'scripts/chromium-network-diagnostics-tests/'],
]);

function isParentSuite(file) {
  return PARENT_SUITES.some(([parent]) => parent === file);
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
  if (!isParentSuite(parent)) throw new Error(`Unknown test parent: ${parent}`);
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

module.exports = { isParentSuite, readParentSuiteMembers, parentTestSuiteFor };
