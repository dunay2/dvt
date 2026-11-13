/** Owned concern: create one independently owned diagnostic fixture. */
require('tsx/cjs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  createChromiumNetworkDiagnostics,
} = require('../../apps/web/cypress/node/chromiumNetworkDiagnostics.ts');

function fixture(enabled = true) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-network-test-'));
  return {
    projectRoot,
    binding: createChromiumNetworkDiagnostics({ enabled, workspaceRoot: projectRoot }),
  };
}
module.exports = { fixture };
