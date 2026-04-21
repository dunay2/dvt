/**
 * Owned concern: shared AST inspection helpers for semantic HTTP entrypoint
 * architecture tests.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

export const HTTP_ENTRYPOINT_ROOT = join(import.meta.dirname, '../../../src/entrypoints/http');

export type HttpComponentFile = {
  readonly fileName: string;
  readonly sourceText: string;
  readonly sourceFile: ts.SourceFile;
};

export function httpEntrypointExists(fileName: string): boolean {
  return existsSync(join(HTTP_ENTRYPOINT_ROOT, fileName));
}

export function readHttpEntrypointSource(fileName: string): HttpComponentFile {
  const sourceText = readFileSync(join(HTTP_ENTRYPOINT_ROOT, fileName), 'utf8');
  return {
    fileName,
    sourceText,
    sourceFile: ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
  };
}

export function hasOwnedConcernDocblock(component: HttpComponentFile): boolean {
  return component.sourceText.startsWith('/**\n * Owned concern:');
}

export function collectNamedImports(
  component: HttpComponentFile,
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

    const clause = statement.importClause;
    const namedBindings = clause?.namedBindings;
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
  component: HttpComponentFile,
  moduleSpecifier: string,
  importedName: string
): boolean {
  return collectNamedImports(component, moduleSpecifier).includes(importedName);
}

export function collectExportedFunctionNames(component: HttpComponentFile): string[] {
  return component.sourceFile.statements.flatMap((statement) => {
    if (!ts.isFunctionDeclaration(statement) || statement.name === undefined) {
      return [];
    }

    const hasExportModifier = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    );
    return hasExportModifier ? [statement.name.text] : [];
  });
}

export function collectObjectLiteralPropertyNames(
  component: HttpComponentFile,
  variableName: string
): string[] {
  for (const statement of component.sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (
        !ts.isIdentifier(declaration.name) ||
        declaration.name.text !== variableName ||
        declaration.initializer === undefined ||
        !ts.isAsExpression(declaration.initializer) ||
        !ts.isObjectLiteralExpression(declaration.initializer.expression)
      ) {
        continue;
      }

      return declaration.initializer.expression.properties.flatMap((property) => {
        if (
          (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)) &&
          ts.isIdentifier(property.name)
        ) {
          return [property.name.text];
        }

        return [];
      });
    }
  }

  return [];
}

export function hasCallToIdentifier(
  component: HttpComponentFile,
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

export function hasCallToProperty(component: HttpComponentFile, propertyPath: string): boolean {
  let found = false;

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      flattenPropertyPath(node.expression) === propertyPath
    ) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(component.sourceFile);
  return found;
}

function flattenPropertyPath(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    const basePath = flattenPropertyPath(expression.expression);
    return basePath === null ? null : `${basePath}.${expression.name.text}`;
  }

  return null;
}
