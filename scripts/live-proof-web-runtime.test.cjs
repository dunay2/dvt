/** @ownedConcern Prove compiled Web proof startup and failure boundaries. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { startCompiledLiveProofWeb } = require('./live-proof-web-runtime.cjs');

function harness(outcome = { code: 0, signal: null }) {
  const calls = [];
  const handles = [];
  const build = { completion: Promise.resolve(outcome) };
  const preview = { completion: Promise.resolve({ code: 0, signal: null }) };
  const environment = Object.freeze({
    VITE_API_BASE_URL: 'http://127.0.0.1:3300',
    VITE_API_BEARER_TOKEN: 'proof-token',
    VITE_DEFAULT_PROJECT_ID: 'proof-project',
  });
  const options = { environment, host: '0.0.0.0', port: 4174, timeout: 900, interval: 7 };
  const dependencies = {
    spawnProcess(name, args, env) {
      calls.push({ name, args, env });
      return calls.length === 1 ? build : preview;
    },
    async waitForUrlOrProcessExit(...args) {
      calls.push({ readiness: args });
    },
  };
  return { calls, handles, build, preview, options, dependencies };
}

test('build completes before preview starts and both processes remain owned', async () => {
  const fixture = harness();
  const startup = startCompiledLiveProofWeb(fixture.options, fixture.handles, fixture.dependencies);
  assert.equal(fixture.calls.length, 1);
  assert.deepEqual(fixture.handles, [fixture.build]);
  const result = await startup;
  assert.equal(result, fixture.preview);
  assert.deepEqual(fixture.handles, [fixture.build, fixture.preview]);
  assert.deepEqual(fixture.calls[0].args, ['--filter', '@dvt/web', 'run', 'build:e2e']);
  assert.deepEqual(fixture.calls[1].args, [
    '--filter',
    '@dvt/web',
    'exec',
    'vite',
    'preview',
    '--mode',
    'e2e',
    '--host',
    '0.0.0.0',
    '--port',
    '4174',
    '--strictPort',
  ]);
  assert.equal(fixture.calls[0].env, fixture.options.environment);
  assert.equal(fixture.calls[1].env, fixture.options.environment);
});

for (const outcome of [
  { code: 1, signal: null },
  { code: 0, signal: 'SIGTERM' },
  { code: null, signal: null },
]) {
  test(`rejected build ${JSON.stringify(outcome)} cannot start preview`, async () => {
    const fixture = harness(outcome);
    await assert.rejects(
      startCompiledLiveProofWeb(fixture.options, fixture.handles, fixture.dependencies),
      /Web proof build failed/
    );
    assert.equal(fixture.calls.length, 1);
    assert.deepEqual(fixture.handles, [fixture.build]);
  });
}

test('readiness requires the compiled root and retains the configured process exit boundary', async () => {
  const fixture = harness();
  await startCompiledLiveProofWeb(fixture.options, fixture.handles, fixture.dependencies);
  const [url, validate, timeout, interval, label, process] = fixture.calls[2].readiness;
  assert.equal(url, 'http://127.0.0.1:4174/');
  assert.equal(validate({ statusCode: 200 }), true);
  for (const statusCode of [undefined, 404, 500]) assert.equal(validate({ statusCode }), false);
  assert.equal(timeout, 900);
  assert.equal(interval, 7);
  assert.equal(label, 'Compiled Web preview');
  assert.equal(process, fixture.preview);
});

test('readiness failure leaves both handles available to the existing cleanup owner', async () => {
  const fixture = harness();
  fixture.dependencies.waitForUrlOrProcessExit = async () => {
    throw new Error('Preview exited before readiness');
  };
  await assert.rejects(
    startCompiledLiveProofWeb(fixture.options, fixture.handles, fixture.dependencies),
    /Preview exited before readiness/
  );
  assert.deepEqual(fixture.handles, [fixture.build, fixture.preview]);
});
