const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const statusSourceDir = path.join(repoRoot, 'docs', 'planning', 'status');
const generatedStatusRepoPath = '.generated-docs/planning/status';
const generatedStatusDir = path.join(repoRoot, '.generated-docs', 'planning', 'status');
const unitManifestPath = path.join(statusSourceDir, 'system-governance-unit-index.units.yaml');

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function repoRelative(filePath) {
  return toPosix(path.relative(repoRoot, filePath));
}

function governanceGeneratedPath(fileName) {
  return path.join(generatedStatusDir, fileName);
}

function governanceGeneratedRepoPath(fileName) {
  return toPosix(path.posix.join(generatedStatusRepoPath, fileName));
}

module.exports = {
  generatedStatusDir,
  generatedStatusRepoPath,
  governanceGeneratedPath,
  governanceGeneratedRepoPath,
  repoRelative,
  repoRoot,
  statusSourceDir,
  toPosix,
  unitManifestPath,
};
