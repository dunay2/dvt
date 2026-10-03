import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { buildCiScopeOutputs } from './ci-scope-outputs.mjs';
import {
  buildNonPullRequestTestMatrixOutputs,
  buildTestMatrixOutputs,
} from './package-test-matrix.mjs';
import {
  SCOPE_MODES,
  WORKSPACE_ENTRIES,
  classifyPackageJsonChange,
  computeWorkflowModeScopeOutputs,
  computeWorkspaceMatrix,
} from './scope-config.mjs';

test('one projection preserves every capability and matrix for representative diffs', () => {
  for (const files of [
    [],
    ['docs/README.md'],
    ['apps/web/src/App.tsx'],
    ['apps/api/src/server.ts'],
    ['apps/temporal-worker/src/index.ts'],
    ['packages/@dvt/adapter-temporal/src/plugins/postgres/index.ts'],
    ['packages/@dvt/contracts/src/index.ts'],
    ['packages/@dvt/engine/src/index.ts'],
    ['packages/@dvt/adapter-postgres/src/index.ts'],
    ['tools/ci/emit-scope.mjs'],
    ['.github/workflows/ci.yml'],
    ['package.json'],
    ['pnpm-lock.yaml'],
    ['tools/ci/policy/unknown.json'],
  ]) {
    const outputs = buildCiScopeOutputs(files);
    for (const mode of Object.keys(SCOPE_MODES)) {
      assert.deepEqual(
        JSON.parse(outputs[`${mode.replaceAll('-', '_')}_scope`]),
        computeWorkflowModeScopeOutputs(mode, files),
        `${files}:${mode}`
      );
    }
    const workspaces = computeWorkspaceMatrix(files);
    const tests = buildTestMatrixOutputs(files);
    assert.equal(outputs.any_changed, workspaces.anyChanged);
    assert.deepEqual(JSON.parse(outputs.workspace_matrix), { include: workspaces.include });
    assert.equal(outputs.any_tests, tests.anyTests);
    assert.deepEqual(JSON.parse(outputs.test_matrix), { include: tests.include });
  }
});

test('shared metadata context narrows both matrices without dropping changed-file validation', () => {
  const context = Object.fromEntries(
    ['package.json', 'apps/web/package.json'].map((file) => [
      file,
      classifyPackageJsonChange({ version: '1' }, { version: '2' }),
    ])
  );
  const outputs = buildCiScopeOutputs([...Object.keys(context), 'CHANGELOG.md'], context);
  assert.equal(outputs.any_changed, false);
  assert.equal(outputs.any_tests, false);
  assert.equal(JSON.parse(outputs.workflow_scope).changed_file_validation_relevant, true);
  assert.equal(JSON.parse(outputs.test_scope).web, false);
  assert.equal(JSON.parse(outputs.pr_quality_scope).temporal_changed, false);
  assert.equal(JSON.parse(outputs.workflow_scope).security_analysis_relevant, false);
});

test('full posture retains all capabilities and cataloged matrices', () => {
  const outputs = buildCiScopeOutputs([], {}, { full: true });
  for (const [key, value] of Object.entries(outputs)) {
    if (key.endsWith('_scope'))
      assert.ok(
        Object.values(JSON.parse(value)).every((selected) => selected === true),
        key
      );
  }
  assert.deepEqual(
    JSON.parse(outputs.workspace_matrix).include,
    WORKSPACE_ENTRIES.map(({ name, pkg }) => ({ name, pkg }))
  );
  assert.deepEqual(
    JSON.parse(outputs.test_matrix).include,
    buildNonPullRequestTestMatrixOutputs().include
  );
});

test('CLI acquires one real Git diff and each manifest pair once, rejecting obsolete arguments and unavailable refs', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'dvt-ci-scope-'));
  const output = path.join(directory, 'outputs');
  const trace = path.join(directory, 'git-trace');
  const cli = fileURLToPath(new URL('./emit-scope.mjs', import.meta.url));
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'Scope fixture',
    GIT_AUTHOR_EMAIL: 'scope@example.test',
    GIT_COMMITTER_NAME: 'Scope fixture',
    GIT_COMMITTER_EMAIL: 'scope@example.test',
  };
  for (const key of ['GIT_BASE', 'GIT_HEAD', 'GIT_INDEX_FILE', 'GIT_DIR', 'GIT_WORK_TREE'])
    delete env[key];
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: directory,
      env,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  try {
    git('init', '--quiet');
    mkdirSync(path.join(directory, 'apps/web'), { recursive: true });
    const snapshot = (version, parent) => {
      for (const file of ['package.json', 'apps/web/package.json'])
        writeFileSync(path.join(directory, file), JSON.stringify({ version }));
      git('add', 'package.json', 'apps/web/package.json');
      return git(
        'commit-tree',
        git('write-tree'),
        ...(parent ? ['-p', parent] : []),
        '-m',
        'Scope fixture'
      );
    };
    const base = snapshot('1');
    const head = snapshot('2', base);
    const execute = (args, refs = { GIT_BASE: base, GIT_HEAD: head }, event = 'pull_request') =>
      spawnSync(process.execPath, [cli, ...args], {
        cwd: directory,
        env: { ...env, ...refs, GITHUB_EVENT_NAME: event, GITHUB_OUTPUT: output, GIT_TRACE: trace },
        encoding: 'utf8',
      });
    const result = execute([]);
    assert.equal(result.status, 0, result.stderr);
    const values = Object.fromEntries(
      readFileSync(output, 'utf8')
        .trim()
        .split(/\r?\n/u)
        .map((line) => {
          const split = line.indexOf('=');
          return [line.slice(0, split), line.slice(split + 1)];
        })
    );
    assert.equal(values.any_changed, 'false');
    assert.equal(values.any_tests, 'false');
    assert.equal(JSON.parse(values.workflow_scope).changed_file_validation_relevant, true);
    const commands = readFileSync(trace, 'utf8');
    assert.equal((commands.match(/built-in: git diff /gu) ?? []).length, 1, commands);
    assert.equal((commands.match(/built-in: git show /gu) ?? []).length, 4, commands);
    rmSync(output);
    for (const [args, refs] of [
      [['--mode', 'test'], { GIT_BASE: base, GIT_HEAD: head }],
      [[], {}],
      [[], { GIT_BASE: base, GIT_HEAD: 'unavailable-head' }],
    ]) {
      const failure = execute(args, refs);
      assert.notEqual(failure.status, 0, failure.stdout);
      assert.equal(
        existsSync(output),
        false,
        'Failed acquisition must not publish partial outputs'
      );
    }
    for (const event of ['push', 'workflow_dispatch']) {
      const full = execute([], {}, event);
      assert.equal(full.status, 0, full.stderr);
      assert.match(readFileSync(output, 'utf8'), /any_tests=true/u);
      rmSync(output);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
