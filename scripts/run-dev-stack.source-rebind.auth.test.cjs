const test = require('node:test');
const assert = require('node:assert/strict');

const { LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS } = require('./run-dev-stack.auth.cjs');

test('local protected runtime grants the explicit warehouse Source rebind command', () => {
  assert.ok(LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS.includes('workspace:source-import:rebind'));
});
