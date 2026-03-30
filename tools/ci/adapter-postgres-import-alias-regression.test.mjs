import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const ADAPTER_POSTGRES_SRC_ROOT = path.resolve('packages/@dvt/adapter-postgres/src');

function listTypeScriptFiles(rootDir) {
  const result = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.ts')) {
        result.push(fullPath);
      }
    }
  }

  return result.sort((a, b) => a.localeCompare(b));
}

function hasInlineImportTypeAlias(content) {
  const sourceFile = ts.createSourceFile('inline-import-alias-check.ts', content, ts.ScriptTarget.Latest);
  let found = false;

  function containsImportType(node) {
    if (!node) return false;
    if (ts.isImportTypeNode(node)) return true;
    return ts.forEachChild(node, containsImportType) === true;
  }

  function visit(node) {
    if (ts.isTypeAliasDeclaration(node) && node.type && containsImportType(node.type)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

test('detects inline import type alias with dollar-prefixed identifier', () => {
  const content = `
type $Foo = import('./types.js').Foo;
`;
  assert.equal(hasInlineImportTypeAlias(content), true);
});

test('does not flag inline-import pattern inside comments or strings', () => {
  const content = `
// type Foo = import('./types.js').Foo;
const x = "type Foo = import('./types.js').Foo";
/* type Bar = import('./types.js').Bar; */
type Real = { ok: true };
`;
  assert.equal(hasInlineImportTypeAlias(content), false);
});

test('detects nested inline import aliases inside union and indexed access types', () => {
  const content = `
type ViaUnion = import('./types.js').Foo | null;
type ViaIndexed = { node: import('./types.js').Foo }['node'];
`;
  assert.equal(hasInlineImportTypeAlias(content), true);
});
test('adapter-postgres source keeps import-type aliases explicit (no type = import(...))', () => {
  const targetFiles = listTypeScriptFiles(ADAPTER_POSTGRES_SRC_ROOT);
  assert.ok(targetFiles.length > 0, 'adapter-postgres src must contain TypeScript source files');

  for (const file of targetFiles) {
    const content = readFileSync(file, 'utf8');
    assert.ok(
      !hasInlineImportTypeAlias(content),
      `forbidden inline import alias found in ${file}`
    );
  }
});
