import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';

import { listFilesRecursive, normalizePath } from './check-architecture-dependencies.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const RULE_NAME = 'no-api-non-root-state-store-role-binding';
const DEPCRUISE_CONFIG = resolve('.dependency-cruiser.cjs');
const DEPCRUISE_BIN = resolve('node_modules/dependency-cruiser/bin/dependency-cruise.mjs');
const API_SOURCE_ROOT = resolve('apps/api/src');
const ROLE_BINDING_MODULE = 'modules/stateStoreRoles.ts';
const ROLE_INTERFACE_NAMES = new Set([
  'IRunStateStoreRead',
  'IRunStateStoreWrite',
  'IRunStateStoreMaintenance',
]);

function writeFixture(root, relativePath, contents) {
  const absolutePath = join(root, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function collectRuleViolations(serviceSource) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'dvt-state-store-role-boundary-'));

  try {
    writeFixture(
      fixtureRoot,
      'tsconfig.json',
      `${JSON.stringify({ compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler' } })}\n`
    );
    writeFixture(
      fixtureRoot,
      'apps/api/src/modules/stateStoreRoles.ts',
      [
        'export interface StateStoreRoleBindings { readonly read: unknown }',
        'export function bindStateStoreRoles(): StateStoreRoleBindings { return { read: null }; }',
      ].join('\n')
    );
    writeFixture(fixtureRoot, 'apps/api/src/application/service.ts', serviceSource);

    const result = spawnSync(
      process.execPath,
      [DEPCRUISE_BIN, 'apps', '--config', DEPCRUISE_CONFIG, '--output-type', 'json'],
      { cwd: fixtureRoot, encoding: 'utf8' }
    );

    assert.equal(result.stderr, '');
    assert.equal(result.status, 0);

    return JSON.parse(result.stdout).summary.violations.map((violation) => violation.rule.name);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function parseApiSources() {
  return listFilesRecursive(API_SOURCE_ROOT)
    .filter((filePath) => filePath.endsWith('.ts'))
    .map((filePath) => {
      const relativePath = normalizePath(relative(API_SOURCE_ROOT, filePath));
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

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function getPropertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function findAggregateReconstructionViolations(sourceFile, relativePath) {
  const violations = [];

  visit(sourceFile, (node) => {
    if (ts.isIntersectionTypeNode(node)) {
      const roleTypeNames = new Set(
        node.types
          .filter(ts.isTypeReferenceNode)
          .map((typeNode) => typeNode.typeName.getText(sourceFile))
          .filter((typeName) => ROLE_INTERFACE_NAMES.has(typeName))
      );
      if (roleTypeNames.size === ROLE_INTERFACE_NAMES.size) {
        violations.push(`${relativePath}: state-store role intersection reconstructs aggregate`);
      }
    }

    if (!ts.isObjectLiteralExpression(node)) return;

    const propertyNames = new Set(
      node.properties
        .map((property) => {
          if (ts.isPropertyAssignment(property)) return getPropertyNameText(property.name);
          if (ts.isShorthandPropertyAssignment(property)) return property.name.text;
          return null;
        })
        .filter((name) => name !== null)
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

test('non-root API runtime code cannot bind concrete State Store roles', () => {
  const violations = collectRuleViolations(
    [
      "import { bindStateStoreRoles } from '../modules/stateStoreRoles.js';",
      'export default bindStateStoreRoles;',
    ].join('\n')
  );

  assert.ok(violations.includes(RULE_NAME));
});

test('type-only State Store role references remain allowed outside composition roots', () => {
  const violations = collectRuleViolations(
    [
      "import type { StateStoreRoleBindings } from '../modules/stateStoreRoles.js';",
      'export type Binding = StateStoreRoleBindings;',
    ].join('\n')
  );

  assert.equal(violations.includes(RULE_NAME), false);
});

test('API source does not reconstruct the State Store role aggregate outside its owner', () => {
  const violations = parseApiSources().flatMap(({ ast, relativePath }) =>
    relativePath === ROLE_BINDING_MODULE
      ? []
      : findAggregateReconstructionViolations(ast, relativePath)
  );

  assert.deepEqual(violations, []);
});
