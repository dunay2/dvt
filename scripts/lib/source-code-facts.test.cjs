/** Owned concern: prove shared syntax identities while preserving consumer selection policies. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { readSourceCodeFacts } = require('./source-code-facts.cjs');
const { extractQualifiedSourceSymbols } = require('./component-source-responsibilities.cjs');
const { extractCodeSymbolsFromFile } = require('../planning-db/code-symbol-inventory.cjs');
const { FeatureImplementationGuard } = require('../check-feature-mechanization.cjs');

test('Python source facts resolve actual qualified definitions through the shared entrypoint', () => {
  const facts = readSourceCodeFacts({
    path: 'scripts/owned.py',
    content: 'class Owned:\n    async def read(self):\n        return 42\n',
  });
  assert.equal(facts.language, 'python');
  assert.deepEqual(
    facts.declarations.map((fact) => fact.qualifiedName),
    ['Owned', 'Owned.read']
  );
  assert.equal(facts.declarations[1].implemented, true);
  assert.throws(
    () =>
      readSourceCodeFacts(
        { path: 'scripts/owned.py', content: '    return 42' },
        { fragment: true }
      ),
    /complete source/
  );
});

test('TypeScript consumers retain actual source, declaration and block nodes', () => {
  const ts = require('typescript');
  const facts = readSourceCodeFacts({
    path: 'owned.ts',
    content: 'export function actual() { return 42; }',
  });
  assert.equal(facts.source.kind, ts.SyntaxKind.SourceFile);
  assert.equal(ts.isFunctionDeclaration(facts.declarations[0].node), true);
  assert.equal(ts.isBlock(facts.declarations[0].body), true);
  assert.equal(facts.declarations[0].source, facts.source);
});

test('consumers share qualified class and function identities with distinct explicit purposes', () => {
  const file = {
    path: 'model.ts',
    content:
      'export class Store { read() { return 1; } }\nexport function top() { return 1; }\nexport const count = 1;\n',
  };
  const facts = readSourceCodeFacts(file);
  assert.deepEqual(
    facts.declarations.map((f) => f.qualifiedName),
    ['Store', 'Store.read', 'top', 'count']
  );
  assert.deepEqual(extractQualifiedSourceSymbols(file), ['Store', 'Store.read', 'top']);
  assert.deepEqual(
    extractCodeSymbolsFromFile(file, new Map()).map((f) => f.symbolName),
    ['Store.read', 'top']
  );
  assert.deepEqual(
    new FeatureImplementationGuard([]).extractAddedCodeSymbols(file.path, file.content.split('\n')),
    ['Store', 'count', 'top']
  );
});

test('syntax facts distinguish overload signatures, aliases and implemented declarations', () => {
  const facts = readSourceCodeFacts({
    path: 'model.ts',
    content:
      'export function read(x: string): string;\nexport function read(x: string) { return x; }\nexport { read as fetch };\nconst text = "function phantom() {}";\n// class Phantom {}\n',
  });
  assert.equal(
    facts.declarations.filter((f) => f.qualifiedName === 'read' && f.implemented).length,
    1
  );
  assert.ok(facts.declarations.some((f) => f.qualifiedName === 'fetch' && f.kind === 'alias'));
  assert.ok(facts.declarations.every((f) => !/phantom/i.test(f.qualifiedName)));
  assert.throws(
    () => readSourceCodeFacts({ path: 'broken.ts', content: 'export function broken( {' }),
    /syntax/i
  );
});

test('nested named scopes are qualified and anonymous callbacks cannot invent binding identities', () => {
  const file = {
    path: 'model.ts',
    content:
      'function outer() { function inner() { return 1; } }\n[].map(() => { function hidden() { return 2; } });',
  };
  assert.deepEqual(extractQualifiedSourceSymbols(file), ['outer', 'outer.inner']);
});

test('module references include literal imports and exclude quoted, commented and computed code', () => {
  const facts = readSourceCodeFacts({
    path: 'module.ts',
    content: [
      "import type { Model } from './model';",
      "export { value } from './exported';",
      "const fs = require('node:fs');",
      "const pending = import('./dynamic');",
      "const duplicate = require('node:fs');",
      "const computed = import(prefix + '/computed');",
      "// import commented from './commented';",
      'const quoted = "require(\'./quoted\')";',
    ].join('\n'),
  });
  assert.deepEqual(facts.importRefs, ['./dynamic', './exported', './model', 'node:fs']);
});
