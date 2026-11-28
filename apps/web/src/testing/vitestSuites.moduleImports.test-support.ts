/** Interpret static TypeScript references without reading files or resolving paths. */
import ts from 'typescript';

type ImportUsage = 'runtime' | 'type-only' | 'empty-specifiers';

export function classifyImportClause(clause: ts.ImportClause | undefined): ImportUsage {
  if (clause == null) return 'runtime';
  if (clause.phaseModifier === ts.SyntaxKind.TypeKeyword) return 'type-only';
  if (clause.name != null) return 'runtime';
  const bindings = clause.namedBindings;
  if (bindings == null || !ts.isNamedImports(bindings)) return 'runtime';
  if (bindings.elements.length === 0) return 'empty-specifiers';
  return bindings.elements.every((specifier) => specifier.isTypeOnly) ? 'type-only' : 'runtime';
}

export function readModuleLiteral(node: ts.Node | undefined): string | undefined {
  return node != null && ts.isStringLiteralLike(node) ? node.text : undefined;
}

type ModuleReference = Readonly<{ specifier: string; runtime: boolean }>;

function moduleReference(
  literal: ts.Node | undefined,
  runtime: boolean
): ModuleReference | undefined {
  const specifier = readModuleLiteral(literal);
  return specifier == null ? undefined : { specifier, runtime };
}

function isTypeOnlyExport(node: ts.ExportDeclaration): boolean {
  if (node.isTypeOnly) return true;
  const bindings = node.exportClause;
  if (bindings == null || !ts.isNamedExports(bindings)) return false;
  return (
    bindings.elements.length > 0 && bindings.elements.every((specifier) => specifier.isTypeOnly)
  );
}

function readImportReference(node: ts.ImportDeclaration): ModuleReference | undefined {
  const specifier = readModuleLiteral(node.moduleSpecifier);
  if (specifier == null) return undefined;
  const runtime = classifyImportClause(node.importClause) !== 'type-only';
  return { specifier, runtime: runtime && !specifier.includes('?raw') };
}

export function readStaticModuleReference(node: ts.Node): ModuleReference | undefined {
  if (ts.isImportDeclaration(node)) return readImportReference(node);
  if (ts.isExportDeclaration(node))
    return moduleReference(node.moduleSpecifier, !isTypeOnlyExport(node));
  if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference))
    return moduleReference(node.moduleReference.expression, !node.isTypeOnly);
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
    return moduleReference(node.argument.literal, false);
  return undefined;
}
