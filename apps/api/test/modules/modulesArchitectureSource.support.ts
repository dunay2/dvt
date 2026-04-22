/**
 * Owned concern: AST-backed semantic source inspection for module
 * architecture checks in `apps/api`.
 */
import ts from 'typescript';

import { type ArchitectureTextFile, readModuleTextFile } from './modulesArchitectureCatalog.support.js';

type NamedImportContract = {
  readonly importedName: string;
  readonly moduleSpecifier: string;
};

type ExportedNamedStatement =
  | ts.ClassDeclaration
  | ts.EnumDeclaration
  | ts.FunctionDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration;

export class ModuleArchitectureSource {
  public readonly sourceFile: ts.SourceFile;

  public constructor(private readonly file: ArchitectureTextFile) {
    this.sourceFile = ts.createSourceFile(
      file.fileName,
      file.sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
  }

  public get sourceText(): string {
    return this.file.sourceText;
  }

  public hasOwnedConcernDocblock(): boolean {
    return this.sourceText.startsWith('/**\n * Owned concern:');
  }

  public collectNamedImports(moduleSpecifier: string): string[] {
    const imports: string[] = [];

    for (const statement of this.sourceFile.statements) {
      const namedImports = collectNamedImportsForStatement(
        this.sourceFile,
        statement,
        moduleSpecifier
      );
      imports.push(...namedImports);
    }

    return imports;
  }

  public hasNamedImport(contract: NamedImportContract): boolean {
    return this.collectNamedImports(contract.moduleSpecifier).includes(contract.importedName);
  }

  public hasCallToIdentifier(identifierName: string): boolean {
    return hasMatchingNode(this.sourceFile, (node) =>
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === identifierName
    );
  }

  public hasNewExpression(constructorName: string): boolean {
    return hasMatchingNode(this.sourceFile, (node) =>
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === constructorName
    );
  }

  public collectExportedIdentifiers(): string[] {
    return this.sourceFile.statements.flatMap((statement) =>
      collectExportedIdentifiersForStatement(statement)
    );
  }
}

export function readModuleSource(fileName: string): ModuleArchitectureSource {
  return new ModuleArchitectureSource(readModuleTextFile(fileName));
}

function collectNamedImportsForStatement(
  sourceFile: ts.SourceFile,
  statement: ts.Statement,
  moduleSpecifier: string
): string[] {
  if (!ts.isImportDeclaration(statement)) {
    return [];
  }

  if (statement.moduleSpecifier.getText(sourceFile) !== `'${moduleSpecifier}'`) {
    return [];
  }

  const namedBindings = statement.importClause?.namedBindings;
  if (namedBindings === undefined || !ts.isNamedImports(namedBindings)) {
    return [];
  }

  return namedBindings.elements.map((element) => element.name.text);
}

function hasMatchingNode(root: ts.Node, matches: (node: ts.Node) => boolean): boolean {
  if (matches(root)) {
    return true;
  }

  return root.forEachChild((child) => hasMatchingNode(child, matches) || undefined) === true;
}

function collectExportedIdentifiersForStatement(statement: ts.Statement): string[] {
  if (!isExportedStatement(statement)) {
    return [];
  }

  if (isExportedNamedStatement(statement)) {
    return statement.name === undefined ? [] : [statement.name.text];
  }

  if (!ts.isVariableStatement(statement)) {
    return [];
  }

  return statement.declarationList.declarations.flatMap((declaration) =>
    ts.isIdentifier(declaration.name) ? [declaration.name.text] : []
  );
}

function isExportedStatement(statement: ts.Statement): boolean {
  const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
  return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
}

function isExportedNamedStatement(statement: ts.Statement): statement is ExportedNamedStatement {
  return (
    ts.isFunctionDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  );
}
