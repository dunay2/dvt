/**
 * Owned concern: create explicit source fixtures and retire only temporary roots this module owns.
 * Why: dependency and semantic proofs share filesystem mechanics, not query or assertion policy.
 * Corner: recursive removal requires exact ownership and a direct child of the OS temporary directory.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const ownedRoots = new Set();

export function createFixtureRoot(prefix) {
  assert.match(prefix, /^dvt-[A-Za-z0-9_-]*$/u);
  const root = resolve(mkdtempSync(join(resolve(tmpdir()), prefix)));
  ownedRoots.add(root);
  return root;
}

export function removeFixtureRoot(root) {
  const target = resolve(root);
  assert.equal(dirname(target), resolve(tmpdir()));
  assert.ok(basename(target).startsWith('dvt-'));
  assert.ok(ownedRoots.has(target), 'Only an owned fixture root can be removed');
  rmSync(target, { recursive: true, force: true });
  ownedRoots.delete(target);
}

export function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

export function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

export function readCruiserConfig() {
  return createRequire(import.meta.url)('../../../.dependency-cruiser.cjs');
}

export function extractForbiddenRuleNames(config) {
  return new Set((config.forbidden ?? []).map((rule) => rule.name));
}

export function writeFixtureFiles(root, files) {
  for (const [filePath, contents] of Object.entries(files)) {
    const absolutePath = join(root, filePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents);
  }
}

export function writeTsConfig(root) {
  writeFixtureFiles(root, {
    'tsconfig.json': `${JSON.stringify({
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@dvt/engine': ['packages/@dvt/engine/src/index.ts'],
          '@dvt/engine/*': ['packages/@dvt/engine/src/*'],
          '@dvt/*': ['packages/@dvt/*'],
          '@dvt/*/*': ['packages/@dvt/*/*'],
        },
      },
    })}\n`,
  });
}
