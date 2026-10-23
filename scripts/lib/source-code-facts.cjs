/** Owned concern: derive syntax, qualified identities and import facts from one source parser. */
const ts = require('typescript');

function readSourceCodeFacts({ path, content }, { fragment = false } = {}) {
  if (typeof path !== 'string' || typeof content !== 'string')
    throw new Error('Source path and content are required.');
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
  if (!fragment) {
    const options = { noLib: true, noResolve: true, jsx: ts.JsxEmit.Preserve, allowJs: true };
    const host = ts.createCompilerHost(options);
    host.getSourceFile = (name) => (name === path ? source : undefined);
    const diagnostics = ts.createProgram([path], options, host).getSyntacticDiagnostics(source);
    if (diagnostics.length)
      throw new Error(
        'Invalid source syntax in ' +
          path +
          ': ' +
          ts.flattenDiagnosticMessageText(diagnostics[0].messageText, ' ')
      );
  }
  const declarations = [];
  const imports = new Set();
  const named = (node) =>
    node.name && (ts.isIdentifier(node.name) || ts.isPrivateIdentifier(node.name));
  const modifiers = (node) => (ts.canHaveModifiers(node) ? ts.getModifiers(node) || [] : []);
  function visit(node, scope = '', linkable = true, ambient = false) {
    ambient ||= modifiers(node).some((m) => m.kind === ts.SyntaxKind.DeclareKeyword);
    const qualify = (name) => (scope ? scope + '.' + name : name);
    const record = (name, kind, implementation = node, exportOwner = node) => {
      const ownerModifiers = modifiers(exportOwner);
      const start = node.getStart(source);
      const fact = {
        name,
        qualifiedName: qualify(name),
        kind,
        node: implementation,
        source,
        start,
        body: implementation.body,
        implemented: !ambient && (kind === 'class' || Boolean(implementation.body)),
        linkable,
        topLevel: exportOwner.parent === source,
        exportKind: ownerModifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
          ? 'default'
          : ownerModifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
            ? 'named'
            : 'internal',
      };
      declarations.push(fact);
      return fact.qualifiedName;
    };
    let nextScope = scope;
    if (ts.isClassDeclaration(node) && named(node)) nextScope = record(node.name.text, 'class');
    else if (ts.isModuleDeclaration(node) && named(node)) nextScope = qualify(node.name.text);
    else if (ts.isFunctionDeclaration(node) && named(node))
      nextScope = record(node.name.text, 'function');
    else if (ts.isMethodDeclaration(node) && named(node) && ts.isClassDeclaration(node.parent))
      nextScope = record(node.name.text, 'method');
    else if ((ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node)) && named(node)) {
      const initializer = node.initializer;
      const callable =
        initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer));
      nextScope = record(
        node.name.text,
        callable ? (ts.isArrowFunction(initializer) ? 'arrow_function' : 'function') : 'variable',
        callable ? initializer : node,
        ts.isVariableDeclaration(node) ? node.parent.parent : node
      );
      if (callable) {
        visit(initializer.body, nextScope, linkable, ambient);
        return;
      }
    } else if (
      (ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      named(node)
    )
      record(node.name.text, 'type');
    else if (
      ts.isExportDeclaration(node) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const element of node.exportClause.elements) record(element.name.text, 'alias');
    }
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    )
      imports.add(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    )
      imports.add(node.arguments[0].text);
    if (
      ts.isClassExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      (ts.isMethodDeclaration(node) && !ts.isClassDeclaration(node.parent))
    )
      linkable = false;
    ts.forEachChild(node, (child) => visit(child, nextScope, linkable, ambient));
  }
  visit(source);
  return { source, declarations, importRefs: [...imports].sort() };
}

module.exports = { readSourceCodeFacts };
