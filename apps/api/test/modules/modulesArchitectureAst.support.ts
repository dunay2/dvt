/**
 * Owned concern: shared AST inspection helpers for semantic module
 * architecture tests in `apps/api`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

export const MODULES_ROOT = join(import.meta.dirname, '../../src/modules');
export const API_DOCS_ROOT = join(import.meta.dirname, '../../docs');

export type ModuleComponentFile = {
  readonly fileName: string;
  readonly sourceText: string;
  readonly sourceFile: ts.SourceFile;
};

export function moduleComponentExists(fileName: string): boolean {
  return existsSync(join(MODULES_ROOT, fileName));
}

export function readModuleSource(fileName: string): ModuleComponentFile {
  const sourceText = readFileSync(join(MODULES_ROOT, fileName), 'utf8');
  return {
    fileName,
    sourceText,
    sourceFile: ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
  };
}

export function readApiDoc(fileName: string): string {
  return readFileSync(join(API_DOCS_ROOT, fileName), 'utf8');
}

export function apiDocExists(fileName: string): boolean {
  return existsSync(join(API_DOCS_ROOT, fileName));
}

export function hasOwnedConcernDocblock(component: ModuleComponentFile): boolean {
  return component.sourceText.startsWith('/**\n * Owned concern:');
}

export function collectNamedImports(
  component: ModuleComponentFile,
  moduleSpecifier: string
): string[] {
  const imports: string[] = [];

  for (const statement of component.sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue;
    }

    if (statement.moduleSpecifier.getText(component.sourceFile) !== `'${moduleSpecifier}'`) {
      continue;
    }

    const namedBindings = statement.importClause?.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      continue;
    }

    for (const element of namedBindings.elements) {
      imports.push(element.name.text);
    }
  }

  return imports;
}

export function hasNamedImport(
  component: ModuleComponentFile,
  moduleSpecifier: string,
  importedName: string
): boolean {
  return collectNamedImports(component, moduleSpecifier).includes(importedName);
}

export function hasCallToIdentifier(
  component: ModuleComponentFile,
  identifierName: string
): boolean {
  let found = false;

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === identifierName) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(component.sourceFile);
  return found;
}

export function hasNewExpression(
  component: ModuleComponentFile,
  constructorName: string
): boolean {
  let found = false;

  const visit = (node: ts.Node): void => {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === constructorName) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(component.sourceFile);
  return found;
}
