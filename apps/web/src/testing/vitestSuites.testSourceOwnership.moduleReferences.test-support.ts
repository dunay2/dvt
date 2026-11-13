/**
 * Owned concern: project module references and Vite query modes from SourceFacts AST.
 * @decision Keep syntax interpretation independent of filesystem acquisition and ownership closure.
 * @consequence Physical and fixture evidence share the same conservative reference semantics.
 */
import ts from 'typescript';

export type TestSourceFacts = { source: ts.SourceFile; importRefs: readonly string[] };

export function moduleQueryKind(reference: string): 'plain' | 'source' | 'worker' | 'uncertain' {
  const separator = reference.indexOf('?');
  if (separator === -1) return 'plain';
  const flags = reference.slice(separator + 1).split('&');
  if (flags.length === 1 && flags[0] === 'raw') return 'source';
  const constructor = flags.filter((flag) => flag === 'worker' || flag === 'sharedworker');
  if (
    constructor.length === 1 &&
    new Set(flags).size === flags.length &&
    flags.every((flag) => flag === constructor[0] || flag === 'inline')
  )
    return 'worker';
  return 'uncertain';
}

export function moduleReferences(facts: TestSourceFacts): {
  conservative: Set<string>;
  runtime: Set<string>;
  observation: boolean;
  uncertain: boolean;
} {
  const conservative = new Set(facts.importRefs),
    runtime = new Set<string>();
  const explicit = new Set<string>(),
    contextual = new Set<string>();
  const factories = new Set<string>(),
    loaders = new Set<string>();
  for (const statement of facts.source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteralLike(statement.moduleSpecifier) ||
      !/^(?:node:)?module$/.test(statement.moduleSpecifier.text)
    )
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings))
      for (const binding of bindings.elements) {
        if ((binding.propertyName ?? binding.name).text === 'createRequire')
          factories.add(binding.name.text);
      }
  }
  function collectLoaders(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      factories.has(node.initializer.expression.getText(facts.source))
    )
      loaders.add(node.name.text);
    ts.forEachChild(node, collectLoaders);
  }
  collectLoaders(facts.source);
  let observation = false,
    uncertain = false;
  function visit(node: ts.Node): void {
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      conservative.add(node.argument.literal.text);
      explicit.add(node.argument.literal.text);
    }
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const clause = node.importClause,
        bindings = clause?.namedBindings;
      conservative.add(node.moduleSpecifier.text);
      explicit.add(node.moduleSpecifier.text);
      const allTypes =
        !clause?.name &&
        bindings &&
        ts.isNamedImports(bindings) &&
        bindings.elements.length > 0 &&
        bindings.elements.every((item) => item.isTypeOnly);
      if (!clause?.isTypeOnly && !allTypes && !node.moduleSpecifier.text.includes('?raw'))
        runtime.add(node.moduleSpecifier.text);
    }
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      conservative.add(node.moduleSpecifier.text);
      explicit.add(node.moduleSpecifier.text);
      const allTypes =
        node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.length > 0 &&
        node.exportClause.elements.every((item) => item.isTypeOnly);
      if (!node.isTypeOnly && !allTypes) runtime.add(node.moduleSpecifier.text);
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      conservative.add(node.moduleReference.expression.text);
      explicit.add(node.moduleReference.expression.text);
      if (!node.isTypeOnly) runtime.add(node.moduleReference.expression.text);
    }
    if (ts.isCallExpression(node)) {
      const expression = node.expression.getText(facts.source);
      const contextualLoad =
        loaders.has(expression) ||
        (ts.isCallExpression(node.expression) &&
          factories.has(node.expression.expression.getText(facts.source)));
      if (contextualLoad) {
        uncertain = true;
        if (node.arguments[0] && ts.isStringLiteralLike(node.arguments[0]))
          contextual.add(node.arguments[0].text);
      }
      const load =
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        /(?:^|\.)(?:require|importActual|importMock)$/.test(expression) ||
        (ts.isCallExpression(node.expression) &&
          node.expression.expression.getText(facts.source) === 'createRequire');
      if (load && !contextualLoad) {
        if (node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
          conservative.add(node.arguments[0].text);
          explicit.add(node.arguments[0].text);
          runtime.add(node.arguments[0].text);
        } else uncertain = true;
      }
      if (expression.startsWith('import.meta.glob')) observation = true;
      if (expression === 'require.resolve') {
        if (node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
          conservative.add(node.arguments[0].text);
          explicit.add(node.arguments[0].text);
        } else uncertain = true;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(facts.source);
  for (const ref of contextual)
    if (!explicit.has(ref)) {
      conservative.delete(ref);
      runtime.delete(ref);
    }
  return { conservative, runtime, observation, uncertain };
}
