import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { computeWorkflowModeScopeOutputs, getChangedFiles } from './scope-config.mjs';

function runGit(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

test('changed-file scope includes deleted code paths for CodeQL relevance', async () => {
  const repoDir = mkdtempSync(path.join(tmpdir(), 'dvt-scope-config-'));
  const originalCwd = process.cwd();

  try {
    runGit(repoDir, ['init']);
    runGit(repoDir, ['config', 'user.name', 'CI Scope Test']);
    runGit(repoDir, ['config', 'user.email', 'ci-scope-test@example.invalid']);

    const codePath = path.join(repoDir, 'apps', 'api', 'src', 'deleted-route.ts');
    mkdirSync(path.dirname(codePath), { recursive: true });
    writeFileSync(codePath, 'export const deletedRoute = true;\n', 'utf8');
    runGit(repoDir, ['add', '.']);
    runGit(repoDir, ['commit', '-m', 'Add code path']);

    unlinkSync(codePath);
    runGit(repoDir, ['add', '-A']);
    runGit(repoDir, ['commit', '-m', 'Delete code path']);

    process.chdir(repoDir);
    const changedFiles = await getChangedFiles('HEAD~1', 'HEAD');
    const scope = computeWorkflowModeScopeOutputs('workflow', changedFiles);

    assert.deepEqual(changedFiles, ['apps/api/src/deleted-route.ts']);
    assert.equal(scope.security_analysis_relevant, true);
  } finally {
    process.chdir(originalCwd);
    rmSync(repoDir, { recursive: true, force: true });
  }
});
