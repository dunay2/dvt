import assert from 'node:assert/strict';
import test from 'node:test';

import { WORKSPACE_ENTRIES, computeWorkspaceMatrix } from './scope-config.mjs';
import {
  buildNonPullRequestWorkspaceMatrixOutputs,
  buildWorkspaceMatrixOutputs,
} from './emit-workspace-matrix.mjs';

test('workspace matrix emitter keeps scripts-only package json empty', () => {
  const matrix = buildWorkspaceMatrixOutputs(['package.json'], {
    packageJsonChange: {
      packageScriptsOnly: true,
      rootBuildSensitive: false,
      dependencySensitive: false,
      lifecycleSensitive: false,
      ciToolingSensitive: false,
      governanceToolingOnly: true,
    },
  });

  assert.equal(matrix.anyChanged, false);
  assert.deepEqual(matrix.include, []);
});

test('workspace matrix emitter keeps pull-request workflow policy changes empty', () => {
  for (const file of ['.github/workflows/ci.yml', '.github/workflows/test.yml']) {
    const matrix = buildWorkspaceMatrixOutputs([file]);

    assert.equal(matrix.anyChanged, false);
    assert.deepEqual(matrix.include, []);
  }
});

test('workspace matrix emitter preserves non-pull-request full workspace fan-out', () => {
  const matrix = buildNonPullRequestWorkspaceMatrixOutputs();

  assert.equal(matrix.anyChanged, true);
  assert.deepEqual(
    matrix.include.map(({ pkg }) => pkg).sort(),
    WORKSPACE_ENTRIES.map(({ pkg }) => pkg).sort()
  );
});

test('workspace matrix emitter fails closed for package json read failure', () => {
  const matrix = computeWorkspaceMatrix(['package.json'], {
    packageJsonChange: {
      failClosed: true,
      rootBuildSensitive: true,
      dependencySensitive: true,
      lifecycleSensitive: true,
      ciToolingSensitive: true,
    },
  });

  assert.equal(matrix.anyChanged, true);
  assert.equal(matrix.include.length, WORKSPACE_ENTRIES.length);
});
