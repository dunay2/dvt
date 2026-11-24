/** Owned concern: keep isolated Web presentation edits local while retaining shared and global obligations. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WORKSPACE_ENTRIES,
  computeTestPackageMatrix,
  computeWorkflowModeScopeOutputs,
  computeWorkspaceMatrix,
} from './scope-config.mjs';

const styleOnlyFiles = [
  'apps/web/src/styles/theme.css',
  'apps/web/src/app/plugins/createDeferredView.module.css',
  'apps/web/src/app/components/LeftNavigation.tsx',
];

function assertWebOnlyScope(files) {
  assert.deepEqual(computeWorkspaceMatrix(files).include, [{ name: 'web', pkg: '@dvt/web' }]);
  assert.deepEqual(computeTestPackageMatrix(files).include, []);
  const scope = computeWorkflowModeScopeOutputs('test', files);
  assert.equal(scope.web, true);
  assert.equal(scope.root_build_sensitive, false);
  for (const consumer of ['api', 'engine', 'temporal_worker', 'planner', 'contracts']) {
    assert.equal(scope[consumer], false, `Unrelated ${consumer} must stay outside Web scope`);
  }
}

test('isolated Web styles and components retain Web validation without unrelated package builds', () => {
  for (const file of styleOnlyFiles) assertWebOnlyScope([file]);
  assertWebOnlyScope(styleOnlyFiles);
});

test('shared contract edits retain contract and Planner proof alongside Web styles', () => {
  const files = [styleOnlyFiles[0], 'packages/@dvt/contracts/src/index.ts'];
  assert.deepEqual(computeWorkspaceMatrix(files).include, [
    { name: 'web', pkg: '@dvt/web' },
    { name: 'contracts', pkg: '@dvt/contracts' },
  ]);
  assert.deepEqual(
    computeTestPackageMatrix(files).include.map(({ key }) => key),
    ['contracts', 'planner']
  );
  const scope = computeWorkflowModeScopeOutputs('test', files);
  assert.equal(scope.web, true);
  assert.equal(scope.contracts, true);
  assert.equal(scope.determinism_relevant, true);
  assert.equal(scope.postgres_capability_changed, true);
});

test('global dependency changes keep complete workspace validation when mixed with Web styles', () => {
  const files = [styleOnlyFiles[0], 'pnpm-lock.yaml'];
  const selected = computeWorkspaceMatrix(files).include.map(({ pkg }) => pkg);
  assert.deepEqual(
    selected,
    WORKSPACE_ENTRIES.map(({ pkg }) => pkg)
  );
  assert.equal(computeWorkflowModeScopeOutputs('test', files).root_build_sensitive, true);
  assert.equal(computeWorkflowModeScopeOutputs('test', files).coverage_relevant, true);
});
