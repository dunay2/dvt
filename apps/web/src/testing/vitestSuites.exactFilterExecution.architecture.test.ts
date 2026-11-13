/**
 * Owned concern: prove mandatory exact-filter preflight at the real Web CLI boundary.
 * @decision Exercise filesystem rejection before any dependency or selected test execution.
 * @consequence Execution failures remain independent of whole-source ownership acquisition.
 */
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const webRoot = process.cwd();
const normalize = (value: string): string => value.replaceAll('\\', '/');
const proof = 'src/testing/vitestSuites.testSourceOwnership.architecture.test.ts';

function runExactFilter(filter: string): SpawnSyncReturns<string> {
  return spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      resolve('scripts/run-vitest-changed-suites.ts'),
      '--phase=vitest',
      '--files',
      'src/testing/vitestSuites.architecture.test.ts',
      filter,
    ],
    { cwd: webRoot, encoding: 'utf8', env: process.env }
  );
}

describe('mandatory Web exact-filter execution', () => {
  it('rejects a missing exact filter even beside a valid unregistered test', () => {
    const result = runExactFilter('src/testing/__unavailable_3904__.architecture.test.ts');
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Exact Vitest filter must be a current regular file');
    expect(result.stdout).not.toContain('RUN  v');
  });

  it.each(['true', 'false'])(
    'validates all batches before dependencies or any execution when CI=%s',
    (ci) => {
      const result = spawnSync(
        process.execPath,
        [
          '--import',
          'tsx',
          resolve('scripts/run-vitest-changed-suites.ts'),
          '--phase=vitest',
          '--files',
          'src/app/views/canvas/canvasDraftScope.test.ts',
          'src/testing/__unavailable_3904__.architecture.test.ts',
        ],
        { cwd: webRoot, encoding: 'utf8', env: { ...process.env, CI: ci } }
      );
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Exact Vitest filter must be a current regular file');
      expect(result.stdout).not.toMatch(/RUN\s+v|test:deps|build/);
    }
  );

  it('rejects a directory exact filter and removes only its owned fixture', () => {
    const parent = resolve(webRoot, 'src/testing');
    const owned = mkdtempSync(resolve(parent, '.gh3904-filter-'));
    if (dirname(owned) !== parent || !basename(owned).startsWith('.gh3904-filter-'))
      throw new Error('Unowned filter fixture');
    try {
      const directory = resolve(owned, 'directory.architecture.test.ts');
      mkdirSync(directory);
      const result = runExactFilter(normalize(relative(webRoot, directory)));
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Exact Vitest filter must be a current regular file');
      expect(result.stdout).not.toContain('RUN  v');
    } finally {
      rmSync(owned, { recursive: true });
    }
  });

  it('rejects an unavailable mandatory guard before any full-architecture execution', () => {
    const parent = resolve(tmpdir());
    const owned = mkdtempSync(resolve(parent, 'dvt-3904-missing-guard-'));
    if (dirname(owned) !== parent || !basename(owned).startsWith('dvt-3904-missing-guard-'))
      throw new Error('Unowned preflight fixture');
    try {
      const preload = resolve(owned, 'guard-visibility.cjs');
      writeFileSync(
        preload,
        `const fs=require('node:fs'),p=require('node:path'),cp=require('node:child_process');
const original=fs.statSync;
fs.statSync=function(file,...args){if(typeof file==='string'&&p.resolve(file)===${JSON.stringify(resolve(webRoot, proof))})throw Object.assign(new Error('Guard unavailable in isolated adapter'),{code:'ENOENT'});return original.call(this,file,...args);};
cp.spawnSync=function(){throw new Error('SPAWN_BEFORE_MANDATORY_GUARD');};
require('node:module').syncBuiltinESMExports();\n`
      );
      const result = spawnSync(
        process.execPath,
        [
          '--require',
          preload,
          '--import',
          'tsx',
          resolve('scripts/run-vitest-changed-suites.ts'),
          '--phase=vitest',
          '--files',
          'src/testing/vitestSuites.browserRouting.fixtures.ts',
        ],
        { cwd: webRoot, encoding: 'utf8', env: { ...process.env, CI: 'true' } }
      );
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(
        `Exact Vitest filter must be a current regular file: ${proof}`
      );
      expect(result.stderr).not.toContain('SPAWN_BEFORE_MANDATORY_GUARD');
      expect(result.stdout).not.toMatch(/RUN\s+v|test:deps|build/);
    } finally {
      rmSync(owned, { recursive: true });
    }
  });
});
