/** @ownedConcern Relate static TypeScript imports and exports to dependency-cruiser targets. */
import { dependencyTargets } from './cruise-module-graph.mjs';
import { ts } from './typescript-source.mjs';

const { SyntaxKind } = ts;
const NAMED_EXPORT_DECLARATIONS = new Set([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.ClassDeclaration,
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeAliasDeclaration,
  SyntaxKind.EnumDeclaration,
]);

export function staticImportDeclarations(sourceFile) {
  return sourceFile.statements.filter(
    (statement) =>
      ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)
  );
}

function namedImportElements(clause) {
  const bindings = clause?.namedBindings;
  if (!bindings || !ts.isNamedImports(bindings)) return [];
  return bindings.elements;
}

function originalSymbolName(element) {
  return (element.propertyName ?? element.name).text;
}

export function importedIdentifier(sourceFile, name) {
  for (const statement of staticImportDeclarations(sourceFile)) {
    const binding = namedImportElements(statement.importClause).find(
      (node) => node.name.text === name
    );
    if (binding) {
      return { specifier: statement.moduleSpecifier.text, symbol: originalSymbolName(binding) };
    }
  }
  return null;
}

export function importedSymbolTarget(module, parsed, symbol) {
  const declaration = importedIdentifier(parsed, symbol);
  return declaration ? (dependencyTargets(module).get(declaration.specifier) ?? null) : null;
}

export function namedReexports(sourceFile, exportedName) {
  return sourceFile.statements.flatMap((statement) => {
    if (!ts.isExportDeclaration(statement)) return [];
    if (statement.moduleSpecifier == null || !ts.isStringLiteral(statement.moduleSpecifier))
      return [];
    const elements = namedExportElements(statement.exportClause);
    const match = elements.find((element) => element.name.text === exportedName);
    return match
      ? [{ specifier: statement.moduleSpecifier.text, symbol: originalSymbolName(match) }]
      : [];
  });
}

function namedExportElements(clause) {
  return clause && ts.isNamedExports(clause) ? clause.elements : [];
}

function namespaceNames(clause) {
  const bindings = clause.namedBindings;
  return bindings && ts.isNamespaceImport(bindings) ? [bindings.name.text] : [];
}

export function importBindingNames(clause) {
  const implicit = [...namespaceNames(clause)];
  if (clause.name) implicit.unshift(clause.name.text);
  const named = namedImportElements(clause);
  const all = [...implicit, ...named.map((node) => node.name.text)];
  const runtime =
    clause.phaseModifier === ts.SyntaxKind.TypeKeyword
      ? []
      : [...implicit, ...named.filter((node) => !node.isTypeOnly).map((node) => node.name.text)];
  return { all, runtime };
}

function hasExportModifier(node) {
  return node.modifiers?.some((modifier) => modifier.kind === SyntaxKind.ExportKeyword) ?? false;
}

function declarationExportNames(statement) {
  if (ts.isExportDeclaration(statement)) {
    return namedExportElements(statement.exportClause).map(originalSymbolName);
  }
  if (!hasExportModifier(statement)) return [];
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations
      .map((node) => node.name)
      .filter(ts.isIdentifier)
      .map((name) => name.text);
  }
  if (NAMED_EXPORT_DECLARATIONS.has(statement.kind) && statement.name) return [statement.name.text];
  return [];
}

export function exportedNames(sourceFile) {
  return [...new Set(sourceFile.statements.flatMap(declarationExportNames))].sort();
}

function importsFromClause(clause) {
  if (!clause) return [];
  const names = namedImportElements(clause).map(originalSymbolName);
  if (namespaceNames(clause).length > 0) names.push('*');
  if (clause.name) names.unshift('default');
  return names;
}

function dependencySymbols(statement) {
  if (ts.isImportDeclaration(statement)) return importsFromClause(statement.importClause);
  if (!ts.isExportDeclaration(statement)) return [];
  const clause = statement.exportClause;
  return clause ? namedExportElements(clause).map(originalSymbolName) : ['*'];
}

export function dynamicImportSpecifier(node) {
  if (!ts.isCallExpression(node)) return null;
  if (node.expression.kind !== SyntaxKind.ImportKeyword) return null;
  if (node.arguments.length !== 1) return null;
  const argument = node.arguments[0];
  return ts.isStringLiteral(argument) ? argument.text : null;
}

export function importedNamesByTarget(module, sourceFile) {
  const targets = dependencyTargets(module);
  return sourceFile.statements.flatMap((statement) => {
    const specifier = statement.moduleSpecifier;
    if (specifier == null || !ts.isStringLiteral(specifier)) return [];
    const target = targets.get(specifier.text);
    return target ? dependencySymbols(statement).map((symbol) => ({ target, symbol })) : [];
  });
}
