const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  generatedStatusDir,
  generatedStatusRepoPath,
  governanceGeneratedPath,
  statusSourceDir,
  unitManifestPath,
} = require('./governance-generated-paths.cjs');

test('governance generated paths write derived outputs outside tracked planning status docs', () => {
  assert.equal(generatedStatusRepoPath, '.generated-docs/planning/status');
  assert.match(generatedStatusDir, /[\\/]\.generated-docs[\\/]planning[\\/]status$/);
  assert.match(statusSourceDir, /[\\/]docs[\\/]planning[\\/]status$/);
  assert.equal(
    unitManifestPath.endsWith(
      path.join('docs', 'planning', 'status', 'system-governance-unit-index.units.yaml')
    ),
    true
  );
  assert.equal(
    governanceGeneratedPath('system-governance-file-index.files.yaml').endsWith(
      path.join('.generated-docs', 'planning', 'status', 'system-governance-file-index.files.yaml')
    ),
    true
  );
});
