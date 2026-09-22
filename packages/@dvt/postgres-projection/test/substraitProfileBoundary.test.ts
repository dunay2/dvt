import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';
import ts from 'typescript';
import { expect, it } from 'vitest';

import { functionProfiles } from '../src/substrait-profile/functions.js';

it('binds unique executable validators to existing supported standard capabilities', () => {
  const keys = functionProfiles.map((profile) => JSON.stringify([profile.kind, profile.identity]));
  expect(new Set(keys).size).toBe(keys.length);
  for (const profile of functionProfiles) {
    const entries = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.filter(
      (entry) =>
        entry.kind === 'standard' &&
        entry.category === profile.category &&
        entry.profileStatus === 'supported-profile' &&
        entry.identity.sourceKind === 'simple-extension' &&
        entry.identity.urn === profile.identity.urn &&
        entry.identity.name === profile.identity.name
    );
    expect(entries).toHaveLength(1);
  }
});

it('keeps the profile component independent of SQL, rendering, Web and runtime dependencies', () => {
  const directory = new URL('../src/substrait-profile/', import.meta.url);
  const names = readdirSync(directory).filter((name) => name.endsWith('.ts'));
  expect(names.length).toBeGreaterThan(0);
  for (const name of names) {
    const file = new URL(name, directory);
    const ast = ts.createSourceFile(
      fileURLToPath(file),
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    function inspect(node: ts.Node): void {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (specifier && ts.isStringLiteral(specifier)) {
          const target = specifier.text;
          expect(
            target === '@dvt/contracts' ||
              target.startsWith('@buf/') ||
              (target.startsWith('./') && names.includes(target.slice(2).replace(/\.js$/, '.ts'))),
            `${name} -> ${target}`
          ).toBe(true);
        }
      }
      expect(
        ts.isCallExpression(node) &&
          (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(node.expression) && node.expression.text === 'require')),
        `${name}: dynamic dependency`
      ).toBe(false);
      ts.forEachChild(node, inspect);
    }
    inspect(ast);
  }
});
