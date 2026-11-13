/** Owned concern: Failed-spec snapshot identity and preservation, scoped to the actual current launch. */
require('tsx/cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cypressConfig = require('../../apps/web/cypress.config.ts').default;
const {
  withChromiumNetworkDiagnostics,
  configureChromiumNetworkDiagnostics,
} = require('../../apps/web/cypress/node/chromiumNetworkDiagnostics.ts');

test('failed-spec snapshot survives raw overwrite without snapshotting successful or interactive specs', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-network-snapshot-test-'));
  const previousFlag = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
  process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = '1';
  const evidence = path.join(workspaceRoot, '.dvt/evidence/chromium-network');
  const spec = { relative: 'cypress/e2e/canvas/example.cy.ts' };
  try {
    await withChromiumNetworkDiagnostics(
      workspaceRoot,
      async () => {
        const hooks = new Map();
        cypressConfig.e2e.setupNodeEvents(
          (event, handler) => {
            assert.equal(hooks.has(event), false, 'profile and capture share one launch hook');
            hooks.set(event, handler);
          },
          { projectRoot: path.join(workspaceRoot, 'apps/web') }
        );
        const launch = hooks.get('before:browser:launch')(
          { family: 'chromium', name: 'chrome', isHeadless: true },
          { args: [] }
        );
        assert.ok(launch.args.some((argument) => argument.includes('primaryPointerType=4')));
        const raw = launch.args
          .find((argument) => argument.startsWith('--log-net-log='))
          .slice('--log-net-log='.length);
        const afterSpec = hooks.get('after:spec');
        assert.equal(typeof afterSpec, 'function');
        afterSpec(spec, undefined);
        afterSpec(spec, { stats: { failures: 0 } });
        assert.equal(fs.existsSync(evidence), false);
        const failed = { stats: { failures: 1 }, error: 'private failure' };
        assert.throws(() => afterSpec(spec, failed), /^Error: Chromium network snapshot failed$/);
        fs.writeFileSync(raw, 'private malformed capture');
        assert.throws(() => afterSpec(spec, failed), /^Error: Chromium network snapshot failed$/);
        const capture = {
          constants: { logEventTypes: { URL_REQUEST_START_JOB: 1 } },
          events: [
            { type: 1, source: { id: 3 }, params: { headers: ['private'], body: 'private' } },
          ],
        };
        fs.writeFileSync(raw, JSON.stringify(capture));
        assert.throws(
          () => afterSpec({ relative: '../private' }, failed),
          /^Error: Chromium network snapshot failed$/
        );
        afterSpec(spec, failed);
        assert.equal(fs.existsSync(raw), true);
        assert.equal(fs.existsSync(evidence), false, 'open writer observations stay private');
        capture.events[0].source.id = 9;
        fs.writeFileSync(raw, JSON.stringify(capture));
      },
      async () => null
    );
    const reports = fs.readdirSync(evidence);
    assert.equal(reports.length, 2);
    const read = (name) => JSON.parse(fs.readFileSync(path.join(evidence, name), 'utf8'));
    const snapshot = read(reports.find((name) => name.includes('-failure-')));
    const final = read(reports.find((name) => !name.includes('-failure-')));
    assert.equal(snapshot.spec, spec.relative);
    assert.ok(Number.isFinite(Date.parse(snapshot.observedAt)));
    assert.equal(snapshot.events[0].sourceId, 3);
    assert.equal(snapshot.continuity, 'replaced');
    assert.equal(snapshot.observationBoundary, 'after:spec');
    assert.equal(final.events[0].sourceId, 9);
    assert.doesNotMatch(JSON.stringify(snapshot), /private|error|headers|body/);
  } finally {
    if (previousFlag === undefined) delete process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
    else process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = previousFlag;
    assert.ok(path.resolve(workspaceRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(workspaceRoot, { recursive: true });
  }
});

test('failed specs bind only to the current Chromium launch, never earlier captures', async () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-network-launch-test-'));
  const previousFlag = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
  process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = '1';
  try {
    await withChromiumNetworkDiagnostics(
      workspaceRoot,
      async () => {
        const hooks = new Map();
        configureChromiumNetworkDiagnostics((event, handler) => hooks.set(event, handler), {});
        const failed = { stats: { failures: 1 } };
        const afterSpec = hooks.get('after:spec');
        assert.throws(
          () => afterSpec({ relative: 'cypress/e2e/first.cy.ts' }, failed),
          /snapshot failed/
        );
        for (const [id, spec] of [
          [3, 'first'],
          [9, 'second'],
        ]) {
          const launch = hooks.get('before:browser:launch')({ family: 'chromium' }, { args: [] });
          fs.writeFileSync(
            launch.args[0].slice('--log-net-log='.length),
            JSON.stringify({
              constants: { logEventTypes: { URL_REQUEST_START_JOB: 1 } },
              events: [{ type: 1, source: { id } }],
            })
          );
          afterSpec({ relative: `cypress/e2e/${spec}.cy.ts` }, failed);
        }
        hooks.get('before:browser:launch')({ family: 'firefox' }, { args: [] });
        assert.throws(
          () => afterSpec({ relative: 'cypress/e2e/third.cy.ts' }, failed),
          /snapshot failed/
        );
      },
      async () => null
    );
    const evidence = path.join(workspaceRoot, '.dvt/evidence/chromium-network');
    const reports = fs
      .readdirSync(evidence)
      .filter((name) => name.includes('-failure-'))
      .map((name) => JSON.parse(fs.readFileSync(path.join(evidence, name), 'utf8')));
    assert.deepEqual(reports.map((report) => [report.spec, report.events[0].sourceId]).sort(), [
      ['cypress/e2e/first.cy.ts', 3],
      ['cypress/e2e/second.cy.ts', 9],
    ]);
  } finally {
    if (previousFlag === undefined) delete process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
    else process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS = previousFlag;
    assert.ok(path.resolve(workspaceRoot).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(workspaceRoot, { recursive: true });
  }
});
