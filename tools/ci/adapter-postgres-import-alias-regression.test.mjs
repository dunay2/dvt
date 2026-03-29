import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const FORBIDDEN_INLINE_IMPORT_ALIAS = /\btype\s+\w+\s*=\s*import\(/;

const TARGET_FILES = [
  'packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts',
  'packages/@dvt/adapter-postgres/src/PostgresStateStoreRuntime.ts',
  'packages/@dvt/adapter-postgres/src/types.ts',
];

test('adapter-postgres source keeps import-type aliases explicit (no type = import(...))', () => {
  for (const file of TARGET_FILES) {
    const content = readFileSync(file, 'utf8');
    assert.ok(
      !FORBIDDEN_INLINE_IMPORT_ALIAS.test(content),
      `forbidden inline import alias found in ${file}`
    );
  }
});
