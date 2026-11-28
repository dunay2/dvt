/** Separate resolver-dependent module calls from references with explicit source ownership. */
import ts from 'typescript';
import { readModuleLiteral } from './vitestSuites.moduleImports.test-support';

function requireFactoryNames(statement: ts.Statement): string[] {
  if (!ts.isImportDeclaration(statement)) return [];
  if (!/^(?:node:)?module$/.test(readModuleLiteral(statement.moduleSpecifier) ?? '')) return [];
  const bindings = statement.importClause?.namedBindings;
  if (bindings == null || !ts.isNamedImports(bindings)) return [];
  return bindings.elements
    .filter(({ propertyName, name }) => (propertyName ?? name).text === 'createRequire')
    .map(({ name }) => name.text);
}

function calledName(source: ts.SourceFile, node: ts.Node | undefined): string | undefined {
  return node != null && ts.isCallExpression(node) ? node.expression.getText(source) : undefined;
}

function requireLoaderNames(
  source: ts.SourceFile,
  factories: ReadonlySet<string>
): ReadonlySet<string> {
  const loaders = new Set<string>();
  function collect(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (factories.has(calledName(source, node.initializer) ?? '')) loaders.add(node.name.text);
    }
    ts.forEachChild(node, collect);
  }
  collect(source);
  return loaders;
}

type ModuleCallKind = 'contextual' | 'runtime' | 'resolve';

export type ModuleCall = Readonly<{
  kind: ModuleCallKind | undefined;
  specifier: string | undefined;
  observation: boolean;
}>;

export function readModuleCalls(source: ts.SourceFile): (node: ts.CallExpression) => ModuleCall {
  const factories = new Set(source.statements.flatMap(requireFactoryNames));
  const loaders = requireLoaderNames(source, factories);
  function kindOf(node: ts.CallExpression, name: string): ModuleCallKind | undefined {
    const nestedName = calledName(source, node.expression);
    if (loaders.has(name) || factories.has(nestedName ?? '')) return 'contextual';
    if (name === 'require.resolve') return 'resolve';
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) return 'runtime';
    if (nestedName === 'createRequire' || /(?:^|\.)(?:require|importActual|importMock)$/.test(name))
      return 'runtime';
    return undefined;
  }
  return (node: ts.CallExpression) => {
    const name = node.expression.getText(source);
    return {
      kind: kindOf(node, name),
      specifier: readModuleLiteral(node.arguments[0]),
      observation: name.startsWith('import.meta.glob'),
    };
  };
}
