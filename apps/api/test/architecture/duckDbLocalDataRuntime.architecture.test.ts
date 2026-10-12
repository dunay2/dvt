/**
 * Owned concern: keep the native local-data gateway behind the API infrastructure boundary.
 * @baseline #3389: no native/raw-SQL product port, HTTP route or Web/Planner/Engine dependency.
 * @decision Inspect actual imports and composition rather than a forwarding barrel.
 * @consequence Native resource ownership cannot silently migrate into product application code.
 * @version 1.0.0
 */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import ts from 'typescript';
import { it } from 'vitest';

const root = fileURLToPath(new URL('../../../../', import.meta.url));

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const filename = path.join(directory, entry.name);
        return entry.isDirectory()
          ? sourceFiles(filename)
          : filename.endsWith('.ts')
            ? [filename]
            : [];
      })
    )
  ).flat();
}

it('confines native package imports and native callbacks to API infrastructure', async () => {
  for (const filename of await sourceFiles(path.join(root, 'apps/api/src'))) {
    const content = await readFile(filename, 'utf8');
    if (!content.includes('@duckdb/') && !content.includes('withSession')) continue;
    assert.ok(filename.includes(`${path.sep}infrastructure${path.sep}duckdb${path.sep}`), filename);
    const source = ts.createSourceFile(filename, content, ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
        continue;
      if (statement.moduleSpecifier.text.startsWith('@duckdb/')) {
        assert.equal(
          statement.importClause?.isTypeOnly,
          true,
          'Native addon must remain lazily imported'
        );
      }
    }
  }
});

it('composes only construction and shutdown without publishing a native gateway', async () => {
  const composition = await readFile(
    path.join(root, 'apps/api/src/modules/buildProtectedRuntimeModule.ts'),
    'utf8'
  );
  assert.ok(composition.includes('new DuckDbLocalDataRuntime(env.localData)'));
  assert.ok(composition.includes('() => localDataRuntime.close()'));
  assert.ok(!composition.includes('withSession'));
  const moduleTypes = await readFile(path.join(root, 'apps/api/src/modules/types.ts'), 'utf8');
  assert.ok(!/DuckDB|DuckDbLocalDataRuntime|withSession|query\(sql/.test(moduleTypes));
});

it('keeps the native dependency out of Web, Planner, Engine and contracts', async () => {
  for (const relative of [
    'apps/web/package.json',
    'packages/@dvt/planner/package.json',
    'packages/@dvt/engine/package.json',
    'packages/@dvt/contracts/package.json',
  ]) {
    assert.ok(!(await readFile(path.join(root, relative), 'utf8')).includes('@duckdb/'), relative);
  }
});
