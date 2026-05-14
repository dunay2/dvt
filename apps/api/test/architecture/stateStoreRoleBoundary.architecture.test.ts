import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));
const API_ROOT = join(TEST_ROOT, '../../src');
const REPO_ROOT = join(TEST_ROOT, '../../../..');
const COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/api/state-store-role-boundary-component.md'
);
const ROLE_BINDING_MODULE = 'modules/stateStoreRoles.ts';
const BINDING_ROOTS = new Set([
  'modules/protectedRuntime/buildProtectedRuntimeStorage.ts',
  'runtime/intentReconcilerRuntime.ts',
]);
const ROLE_INTERFACE_NAMES = new Set([
  'IRunStateStoreRead',
  'IRunStateStoreWrite',
  'IRunStateStoreMaintenance',
]);

describe('state-store role boundary architecture', () => {
  it('documents the component API, invariants, transitions, consumers, and diagrams', () => {
    expect(existsSync(COMPONENT_GUIDE)).toBe(true);

    const guide = readFileSync(COMPONENT_GUIDE, 'utf8');
    for (const heading of [
      '## Public API',
      '## Export Semantics',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Drift Guards',
      '## Diagrams',
    ]) {
      expect(guide).toContain(heading);
    }

    for (const token of [
      'StateStoreRoleBindings',
      'bindStateStoreRoles',
      'runtime export',
      'IRunStateStoreRead',
      'IRunStateStoreWrite',
      'IRunStateStoreMaintenance',
      'StateStoreRoleBoundaryQuery',
      '```mermaid',
    ]) {
      expect(guide).toContain(token);
    }
  });

  it('keeps state-store role binding ownership declared at the module boundary', () => {
    const source = readApiSource(ROLE_BINDING_MODULE);

    expect(source.slice(0, 320)).toContain('@ownedConcern');
    expect(source.slice(0, 320)).toContain('state-store role binding');
  });

  it('allows only root composition modules to bind concrete state stores into roles', () => {
    const importers = parseApiSources()
      .filter(({ ast }) => importsNamedBinding(ast, 'bindStateStoreRoles'))
      .map(({ relativePath }) => relativePath)
      .sort();

    expect(importers).toEqual([...BINDING_ROOTS].sort());
  });

  it('prevents ad hoc aggregate reconstruction outside the role-binding module', () => {
    const violations = parseApiSources().flatMap(({ ast, relativePath }) => {
      if (relativePath === ROLE_BINDING_MODULE) return [];

      return [
        ...findStateStoreRoleIntersectionViolations(ast, relativePath),
        ...findStateStoreRoleObjectLiteralViolations(ast, relativePath),
      ];
    });

    expect(violations).toEqual([]);
  });
});

function readApiSource(relativePath: string): string {
  return readFileSync(join(API_ROOT, relativePath), 'utf8');
}

function parseApiSources(): Array<{ relativePath: string; ast: ts.SourceFile }> {
  return collectSourceFiles(API_ROOT).map((filePath) => {
    const relativePath = normalizePath(relative(API_ROOT, filePath));
    return {
      relativePath,
      ast: ts.createSourceFile(
        relativePath,
        readFileSync(filePath, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
      ),
    };
  });
}

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const filePath = join(directory, entry);
    if (statSync(filePath).isDirectory()) return collectSourceFiles(filePath);
    return filePath.endsWith('.ts') ? [filePath] : [];
  });
}

function importsNamedBinding(sourceFile: ts.SourceFile, bindingName: string): boolean {
  return sourceFile.statements.some((statement) => {
    if (!ts.isImportDeclaration(statement)) return false;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) return false;
    if (!statement.moduleSpecifier.text.endsWith('/stateStoreRoles.js')) return false;

    const bindings = statement.importClause?.namedBindings;
    if (!bindings) return false;
    if (ts.isNamespaceImport(bindings)) return true;
    if (!ts.isNamedImports(bindings)) return false;

    return bindings.elements.some((element) => {
      const importedName = element.propertyName?.text ?? element.name.text;
      return importedName === bindingName;
    });
  });
}

function findStateStoreRoleIntersectionViolations(
  sourceFile: ts.SourceFile,
  relativePath: string
): string[] {
  const violations: string[] = [];

  visit(sourceFile, (node) => {
    if (!ts.isIntersectionTypeNode(node)) return;

    const roleTypeNames = new Set(
      node.types
        .filter(ts.isTypeReferenceNode)
        .map((typeNode) => typeNode.typeName.getText(sourceFile))
        .filter((typeName) => ROLE_INTERFACE_NAMES.has(typeName))
    );
    if (roleTypeNames.size === ROLE_INTERFACE_NAMES.size) {
      violations.push(`${relativePath}: state-store role intersection reconstructs aggregate`);
    }
  });

  return violations;
}

function findStateStoreRoleObjectLiteralViolations(
  sourceFile: ts.SourceFile,
  relativePath: string
): string[] {
  const violations: string[] = [];

  visit(sourceFile, (node) => {
    if (!ts.isObjectLiteralExpression(node)) return;

    const propertyNames = new Set(
      node.properties
        .map((property) => {
          if (ts.isPropertyAssignment(property)) return getPropertyNameText(property.name);
          if (ts.isShorthandPropertyAssignment(property)) return property.name.text;
          return null;
        })
        .filter((name): name is string => name !== null)
    );
    if (
      propertyNames.has('read') &&
      propertyNames.has('write') &&
      propertyNames.has('maintenance') &&
      propertyNames.has('snapshotStaleness')
    ) {
      violations.push(`${relativePath}: object literal reconstructs StateStoreRoleBindings`);
    }
  });

  return violations;
}

function getPropertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function visit(node: ts.Node, callback: (node: ts.Node) => void): void {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/');
}
