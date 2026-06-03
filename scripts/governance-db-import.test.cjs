const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs, runGovernanceImport } = require('./governance-db-import.cjs');

test('governance DB import parses database URL without planning flags', () => {
  assert.deepEqual(
    parseArgs(['--', '--database-url', 'postgres://example/planning', '--if-stale']),
    {
      databaseUrl: 'postgres://example/planning',
      help: false,
      ifStale: true,
    }
  );
});

test('governance DB import delegates only the governance snapshot import scope', async () => {
  const calls = [];
  const result = await runGovernanceImport(
    { databaseUrl: 'postgres://example/planning', ifStale: true },
    {
      runPlanningImport: async (options) => {
        calls.push(options);
        return { governanceFiles: 3, governanceComponents: 2, governanceRemediationTasks: 1 };
      },
    }
  );

  assert.deepEqual(calls, [
    {
      databaseUrl: 'postgres://example/planning',
      ifStale: true,
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
