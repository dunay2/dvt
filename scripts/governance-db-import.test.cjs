const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs, runGovernanceImport } = require('./governance-db-import.cjs');

test('governance DB import parses database URL without planning flags', () => {
  assert.deepEqual(parseArgs(['--database-url', 'postgres://example/planning']), {
    databaseUrl: 'postgres://example/planning',
    help: false,
  });
});

test('governance DB import delegates only the governance snapshot import scope', async () => {
  const calls = [];
  const result = await runGovernanceImport(
    { databaseUrl: 'postgres://example/planning' },
    {
      importContent: async (options) => {
        calls.push(options);
        return { governanceFiles: 3, governanceComponents: 2, governanceRemediationTasks: 1 };
      },
    }
  );

  assert.deepEqual(calls, [
    {
      databaseUrl: 'postgres://example/planning',
      includePlanning: false,
      includeGovernance: true,
    },
  ]);
  assert.deepEqual(result, {
    governanceFiles: 3,
    governanceComponents: 2,
    governanceRemediationTasks: 1,
  });
});
