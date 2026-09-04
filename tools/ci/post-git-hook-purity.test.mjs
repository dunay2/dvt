import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const PostGitHookPurityPolicy = Object.freeze({
  forbiddenHooks: ['.husky/post-merge', '.husky/post-checkout'],
  retiredFiles: [
    'scripts/format-git-operation-changes.cjs',
    'scripts/format-git-operation-changes.test.cjs',
  ],
  retiredPackageScripts: ['postgit:format', 'test:postgit:format'],
});

test('post-Git operations have no repository hooks that can mutate the checked-out tree', () => {
  for (const hookPath of PostGitHookPurityPolicy.forbiddenHooks) {
    assert.equal(
      existsSync(path.join(repoRoot, hookPath)),
      false,
      `${hookPath} must remain absent; post-Git hooks cannot enforce a clean tree after the operation`
    );
  }
});

test('the retired post-Git formatter has no executable or command-catalog surface', () => {
  for (const filePath of PostGitHookPurityPolicy.retiredFiles) {
    assert.equal(
      existsSync(path.join(repoRoot, filePath)),
      false,
      `${filePath} must remain retired`
    );
  }

  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  for (const scriptName of PostGitHookPurityPolicy.retiredPackageScripts) {
    assert.equal(packageJson.scripts[scriptName], undefined, `${scriptName} must remain retired`);
  }

  const commandCatalog = readFileSync(
    path.join(repoRoot, 'tools/ci/repository-command-catalog.mjs'),
    'utf8'
  );
  assert.doesNotMatch(commandCatalog, /postgit:format|format-git-operation-changes/u);
});
