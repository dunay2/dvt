const test = require('node:test');
const assert = require('node:assert/strict');

const { CanvasSourceImportLiveProofRunner } = require('./run-canvas-source-import-live-proof.cjs');

test('source import live proof starts the API without the package predev lifecycle', () => {
  const runner = new CanvasSourceImportLiveProofRunner({});

  assert.deepEqual(runner.buildApiProcessArgs(), [
    '--filter',
    'dvt-api',
    'exec',
    'tsx',
    'watch',
    'src/server.ts',
  ]);
});

test('source import live proof uses an explicit local Temporal test server binary', async () => {
  const temporalServerPath = 'C:\\tools\\temporal-test-server.exe';
  const calls = [];
  const runner = new CanvasSourceImportLiveProofRunner({
    DVT_TEMPORAL_TEST_SERVER_PATH: temporalServerPath,
  });

  await runner.createTemporalEnvironment({
    createTimeSkipping: async (options) => {
      calls.push(options);
      return { namespace: 'default' };
    },
  });

  assert.deepEqual(calls, [
    {
      server: {
        executable: {
          type: 'existing-path',
          path: temporalServerPath,
        },
      },
    },
  ]);
});

test('source import live proof reports an actionable Temporal server bootstrap failure', async () => {
  const runner = new CanvasSourceImportLiveProofRunner({});

  await assert.rejects(
    () =>
      runner.createTemporalEnvironment({
        createTimeSkipping: async () => {
          throw new Error('error sending request for url: dns error');
        },
      }),
    /DVT_TEMPORAL_TEST_SERVER_PATH/
  );
});
