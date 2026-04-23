import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function* walkPackageJsons(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkPackageJsons(fullPath);
      continue;
    }

    if (entry.name === 'package.json') {
      yield fullPath.replaceAll('\\', '/');
    }
  }
}

function collectWorkspacePackages() {
  return [...walkPackageJsons('apps'), ...walkPackageJsons('packages')]
    .map((file) => ({
      file,
      pkg: JSON.parse(readFileSync(file, 'utf8')),
    }))
    .filter(({ pkg }) => typeof pkg.name === 'string');
}

test('every workspace with a build script also exposes a canonical typecheck script', () => {
  const missing = collectWorkspacePackages()
    .filter(({ pkg }) => pkg.scripts?.build)
    .filter(({ pkg }) => !pkg.scripts?.typecheck)
    .map(({ pkg, file }) => `${pkg.name} (${file})`);

  assert.deepEqual(missing, []);
});
