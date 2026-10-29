const path = require('node:path');
const repoRoot = path.resolve(__dirname, '..', '..');

function workspaceRow(overrides = {}) {
  return {
    workspace: '@dvt/example',
    path: 'packages/@dvt/example',
    kind: 'package',
    src: 2,
    tests: 1,
    hasBuild: 'yes',
    hasTest: 'yes',
    hasTypecheck: 'yes',
    localReadmePath: null,
    ...overrides,
  };
}

function architectureComponent(componentId, overrides = {}) {
  return {
    component_id: componentId,
    name: `Component ${componentId}`,
    kind: 'module',
    layer: 'application',
    owner: 'Architecture',
    repo_path: `apps/${componentId.toLowerCase()}`,
    public_contract: `${componentId} contract`,
    runtime: 'node',
    criticality: 'medium',
    status: 'implemented',
    ...overrides,
  };
}

module.exports = { repoRoot, workspaceRow, architectureComponent };
