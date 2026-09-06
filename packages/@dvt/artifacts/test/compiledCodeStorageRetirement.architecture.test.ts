/** Owned concern: prevent retired compiled-code authorities from returning to productive/public source. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '../../../..');
const ACTIVE_SOURCE_ROOTS = [
  join(REPO_ROOT, 'packages/@dvt'),
  join(REPO_ROOT, 'apps'),
  join(REPO_ROOT, 'docs/contracts'),
] as const;

const RETIRED_SYMBOLS = [
  'ICompiledCodeStorage',
  'CompiledCodeStorage',
  'CompiledCodeRef',
  'compiledCodeRef',
  'attachCompiledCodeRefs',
  'InMemoryCompiledCodeCache',
  'CompositeCompiledCodeReader',
  'FileUriCompiledCodeReader',
  'InMemoryCompiledCodeReader',
  'CachedRetryCompiledCodeResolver',
  'ICompiledCodeReader',
  'ICompiledCodeResolver',
  'CompiledCodeBlob',
  'IExecutionBindingVerifier',
  'PlanBindingRecord',
] as const;

const SKIPPED_DIRECTORIES = new Set(['dist', 'node_modules', 'test', 'tests', '__tests__']);
const ACTIVE_SOURCE_EXTENSIONS = ['.ts', '.tsx', '.json', '.md'] as const;

describe('artifact authority hard cut', () => {
  it('keeps retired compiled-code models out of all productive/public source', () => {
    const violations = ACTIVE_SOURCE_ROOTS.flatMap(readProductSourceFiles).flatMap((source) =>
      RETIRED_SYMBOLS.filter((symbol) => source.includes(symbol)).map(
        (symbol) => `${source.split('\n', 1)[0]}: ${symbol}`
      )
    );
    expect(violations).toEqual([]);
  });
});

function readProductSourceFiles(rootDirectory: string): string[] {
  const sources: string[] = [];
  for (const entry of readdirSync(rootDirectory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;

    const entryPath = join(rootDirectory, entry.name);
    if (entry.isDirectory()) {
      sources.push(...readProductSourceFiles(entryPath));
      continue;
    }
    if (
      entry.isFile() &&
      ACTIVE_SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension)) &&
      (entryPath.includes(`${join('', 'src')}`) ||
        entryPath.includes(`${join('', 'docs/contracts')}`))
    ) {
      sources.push(`${entryPath}\n${readFileSync(entryPath, 'utf8')}`);
    }
  }
  return sources;
}
