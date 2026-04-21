import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const COMPONENT_ROOT = join(import.meta.dirname, '../../../src/entrypoints/http');

type ComponentFile = {
  readonly fileName: string;
  readonly sourceText: string;
  readonly sourceFile: ts.SourceFile;
};

function readComponentSource(fileName: string): ComponentFile {
  const sourceText = readFileSync(join(COMPONENT_ROOT, fileName), 'utf8');
  return {
    fileName,
    sourceText,
    sourceFile: ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
  };
}

function collectNamedImports(component: ComponentFile, moduleSpecifier: string): string[] {
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

function hasNamedImport(
  component: ComponentFile,
  moduleSpecifier: string,
  importedName: string
): boolean {
  return collectNamedImports(component, moduleSpecifier).includes(importedName);
}

function collectExportedFunctionNames(component: ComponentFile): string[] {
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

function hasCallToProperty(component: ComponentFile, propertyPath: string): boolean {
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

function hasCallToIdentifier(component: ComponentFile, identifierName: string): boolean {
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

function collectObjectLiteralPropertyNames(component: ComponentFile, variableName: string): string[] {
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

const HTTP_ERROR_CONTRACT_SOURCE = readComponentSource('httpErrorContract.ts');
const HTTP_ERROR_TRANSLATION_SOURCE = readComponentSource('httpErrorTranslation.ts');
const HTTP_ERROR_REASON_CATALOG_SOURCE = readComponentSource('httpErrorReasonCatalog.ts');
const ROUTE_PARSE_ISSUE_SOURCE = readComponentSource('routeParseIssue.ts');
const HTTP_ERROR_MAPPER_SOURCE = readComponentSource('httpErrorMapper.ts');
const HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE = readComponentSource('httpDomainErrorClassifier.ts');

describe('HTTP runtime error translation architecture', () => {
  it('keeps a dedicated shared helper for optional error details', () => {
    expect(existsSync(join(COMPONENT_ROOT, 'httpErrorDetails.ts'))).toBe(true);
    expect(hasNamedImport(HTTP_ERROR_MAPPER_SOURCE, './httpErrorDetails.js', 'compactHttpErrorDetails')).toBe(
      true
    );
    expect(
      hasNamedImport(HTTP_ERROR_MAPPER_SOURCE, './httpErrorDetails.js', 'withOptionalHttpErrorDetails')
    ).toBe(true);
    expect(
      hasNamedImport(
        HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE,
        './httpErrorDetails.js',
        'compactHttpErrorDetails'
      )
    ).toBe(true);
    expect(
      hasNamedImport(
        HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE,
        './httpErrorDetails.js',
        'withOptionalHttpErrorDetails'
      )
    ).toBe(true);
    expect(HTTP_ERROR_MAPPER_SOURCE.sourceText).not.toContain('function compactDetails(');
    expect(HTTP_ERROR_MAPPER_SOURCE.sourceText).not.toContain('function withDetails(');
    expect(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE.sourceText).not.toContain('function compactDetails(');
    expect(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE.sourceText).not.toContain('function withDetails(');
  });

  it('states the owned concern at the top of each boundary module', () => {
    for (const source of [
      HTTP_ERROR_CONTRACT_SOURCE,
      HTTP_ERROR_TRANSLATION_SOURCE,
      HTTP_ERROR_REASON_CATALOG_SOURCE,
      ROUTE_PARSE_ISSUE_SOURCE,
      HTTP_ERROR_MAPPER_SOURCE,
      HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE,
    ]) {
      expect(source.sourceText.startsWith('/**\n * Owned concern:')).toBe(true);
    }
  });

  it('keeps runtime-domain classification in the dedicated classifier instead of the mapper', () => {
    expect(hasNamedImport(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE, '@dvt/engine', 'RunNotFoundError')).toBe(true);
    expect(collectExportedFunctionNames(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE)).toContain(
      'mapRuntimeDomainError'
    );
    expect(HTTP_DOMAIN_ERROR_CLASSIFIER_SOURCE.sourceText).not.toContain('RouteParseIssue');

    expect(collectExportedFunctionNames(HTTP_ERROR_MAPPER_SOURCE)).toEqual([
      'mapRouteParseIssue',
      'mapStartRunFacadeResult',
      'mapStartRunEngineError',
      'mapAuthenticationFailure',
      'mapAuthorizationFailure',
    ]);
    expect(collectNamedImports(HTTP_ERROR_MAPPER_SOURCE, '@dvt/engine')).toEqual([]);
    expect(HTTP_ERROR_MAPPER_SOURCE.sourceText).not.toContain('mapRuntimeDomainError');
    expect(HTTP_ERROR_MAPPER_SOURCE.sourceText).not.toContain('export { HTTP_HEADER');
    expect(HTTP_ERROR_MAPPER_SOURCE.sourceText).not.toContain('type HttpResponseModel } from');
  });

  it('exposes one public component API grouped by concern', () => {
    expect(existsSync(join(COMPONENT_ROOT, 'httpErrorTranslation.ts'))).toBe(true);
    expect(collectObjectLiteralPropertyNames(HTTP_ERROR_TRANSLATION_SOURCE, 'httpErrorTranslation')).toEqual([
      'respond',
      'admin',
      'parse',
      'auth',
      'startRun',
      'workspaceGraphDraft',
      'runtime',
    ]);
    expect(hasNamedImport(HTTP_ERROR_TRANSLATION_SOURCE, './httpErrorContract.js', 'sendHttpResponse')).toBe(
      true
    );
    expect(hasNamedImport(HTTP_ERROR_TRANSLATION_SOURCE, './httpErrorMapper.js', 'mapRouteParseIssue')).toBe(
      true
    );
    expect(
      hasNamedImport(HTTP_ERROR_TRANSLATION_SOURCE, './httpDomainErrorClassifier.js', 'mapRuntimeDomainError')
    ).toBe(true);
    expect(hasCallToProperty(HTTP_ERROR_TRANSLATION_SOURCE, 'httpErrorTranslation.respond')).toBe(false);
    expect(hasCallToIdentifier(HTTP_ERROR_TRANSLATION_SOURCE, 'sendHttpResponse')).toBe(true);
  });

  it('forces production consumers to depend on the public component API instead of internals', () => {
    for (const consumerFile of [
      'adminRoutes.ts',
      'authorizeAdminExecutionScope.ts',
      'authorizeExecutionScope.ts',
      'getRunRoute.ts',
      'getRunEventsRoute.ts',
      'listRunsRoute.ts',
      'planRouteRequestResolver.ts',
      'runCommandRouteExecutor.ts',
      'startRunRoute.ts',
      'workspaceGraphDraftRoutes.ts',
      'executePlanRouteFacade.ts',
    ]) {
      const consumerSource = readComponentSource(consumerFile);
      expect(hasNamedImport(consumerSource, './httpErrorTranslation.js', 'httpErrorTranslation')).toBe(true);
      expect(collectNamedImports(consumerSource, './httpDomainErrorClassifier.js')).toEqual([]);
      expect(collectNamedImports(consumerSource, './httpErrorMapper.js')).toEqual([]);
      expect(hasNamedImport(consumerSource, './httpErrorContract.js', 'sendHttpResponse')).toBe(false);
    }
  });

  it('keeps route-local static envelopes behind the component facade', () => {
    for (const consumerFile of ['adminRoutes.ts', 'workspaceGraphDraftRoutes.ts']) {
      const consumerSource = readComponentSource(consumerFile);
      expect(hasNamedImport(consumerSource, './httpErrorContract.js', 'createHttpErrorResponse')).toBe(false);
    }

    expect(collectObjectLiteralPropertyNames(HTTP_ERROR_TRANSLATION_SOURCE, 'httpErrorTranslation')).toContain(
      'admin'
    );
    expect(collectObjectLiteralPropertyNames(HTTP_ERROR_TRANSLATION_SOURCE, 'httpErrorTranslation')).toContain(
      'workspaceGraphDraft'
    );
  });

  it('uses the owned serializer for translated HttpResponseModel values', () => {
    for (const consumerFile of [
      'adminRoutes.ts',
      'getRunRoute.ts',
      'getRunEventsRoute.ts',
      'listRunsRoute.ts',
      'runCommandRouteExecutor.ts',
      'startRunRoute.ts',
      'workspaceGraphDraftRoutes.ts',
      'executePlanRouteFacade.ts',
    ]) {
      const consumerSource = readComponentSource(consumerFile);
      expect(hasCallToProperty(consumerSource, 'httpErrorTranslation.respond')).toBe(true);
      expect(hasCallToIdentifier(consumerSource, 'sendHttpResponse')).toBe(false);
    }
  });
});
