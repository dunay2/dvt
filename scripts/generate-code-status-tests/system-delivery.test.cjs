const { workspaceRow, architectureComponent } = require('./helpers.cjs');
const assert = require('node:assert/strict');
const test = require('node:test');
const {
  buildSystemDeliveryStatusProjection,
  readEvaluatedRepositorySnapshot,
  readRepositoryReleaseFacts,
  renderSystemDeliveryStatus,
} = require('../generate-code-status.cjs');
function systemDeliveryFacts(overrides = {}) {
  return {
    components: [architectureComponent('A'), architectureComponent('B')],
    maturity: [
      { component_id: 'A', maturity_score: 90, missing_reasons: [] },
      { component_id: 'B', maturity_score: 60, missing_reasons: ['missing-test-evidence'] },
    ],
    rails: [
      {
        rail_id: 'rail-a',
        rail_name: 'ReadA',
        rail_type: 'query',
        rail_status: 'implemented',
        implementation_ref_count: 1,
        is_gap: false,
        is_duplicate: false,
      },
      {
        rail_id: 'rail-b',
        rail_name: 'WriteB',
        rail_type: 'command',
        rail_status: 'missing',
        implementation_ref_count: 0,
        is_gap: true,
        is_duplicate: false,
      },
    ],
    features: [
      { feature_id: 'FEATURE-A', mechanization_status: 'closed' },
      { feature_id: 'FEATURE-B', mechanization_status: 'implemented' },
      { feature_id: 'FEATURE-C', mechanization_status: 'mixed:closed,implemented' },
    ],
    ...overrides,
  };
}

test('repository release identity is exact and fails on contradictory sources', () => {
  const release = readRepositoryReleaseFacts({
    packageJson: { version: '1.2.3' },
    releaseManifest: { '.': '1.2.3' },
    changelog: '# Changelog\n\n## 1.2.3 (2026-08-10)\n',
  });
  assert.deepEqual(release, { version: '1.2.3' });

  assert.throws(
    () =>
      readRepositoryReleaseFacts({
        packageJson: { version: '1.2.3' },
        releaseManifest: { '.': '1.2.4' },
        changelog: '# Changelog\n\n## 1.2.3 (2026-08-10)\n',
      }),
    /Contradictory repository release identity.*1\.2\.3.*1\.2\.4/u
  );
  assert.throws(
    () =>
      readRepositoryReleaseFacts({
        packageJson: { version: '1.2.3' },
        releaseManifest: {},
        changelog: '# Changelog\n',
      }),
    /Required repository release fact/u
  );
});

test('System Delivery Status refuses worktree facts outside the evaluated Git commit', () => {
  const calls = [];
  assert.throws(
    () =>
      readEvaluatedRepositorySnapshot({
        release: { version: '1.2.3' },
        root: 'C:/fixture',
        gitTreePaths: new Map(),
        spawnSync: (command, args) => {
          calls.push({ command, args });
          if (args[0] === 'rev-parse') {
            return { status: 0, stdout: 'evaluated-sha\n', stderr: '' };
          }
          return {
            status: 0,
            stdout: ' M package.json\n?? packages/new/src/index.ts\n',
            stderr: '',
          };
        },
      }),
    /clean Git worktree.*package\.json.*packages\/new\/src\/index\.ts/su
  );
  assert.deepEqual(
    calls.map(({ args }) => args[0]),
    ['rev-parse', 'rev-parse', 'status']
  );
});

test('System Delivery Status projects exact Git, workspace, maturity, rail, and feature facts', () => {
  const projection = buildSystemDeliveryStatusProjection(
    [
      workspaceRow({ workspace: '@dvt/a', src: 3, tests: 2, hasBuild: 'yes', hasTest: 'yes' }),
      workspaceRow({ workspace: '@dvt/b', src: 4, tests: 1, hasBuild: 'no', hasTest: 'yes' }),
    ],
    systemDeliveryFacts(),
    { gitSha: 'evaluated-sha', release: { version: '1.2.3' } }
  );

  assert.deepEqual(projection.repository, {
    gitSha: 'evaluated-sha',
    version: '1.2.3',
    workspaceCount: 2,
    sourceFileCount: 7,
    testFileCount: 3,
    buildScriptCount: 1,
    testScriptCount: 2,
  });
  assert.deepEqual(projection.architecture, {
    componentCount: 2,
    maturityRegisteredCount: 2,
    componentsMissingMaturity: [],
    maturityScoreCounts: { 60: 1, 90: 1 },
  });
  assert.deepEqual(projection.delivery, {
    railCount: 2,
    railGapCount: 1,
    duplicateRailCount: 0,
    featureCount: 3,
    featureStatuses: { closed: 1, implemented: 1, 'mixed:closed,implemented': 1 },
    railStatuses: { implemented: 1, missing: 1 },
  });
  assert.deepEqual(projection.gaps, ['rail:command:WriteB:missing']);

  const first = renderSystemDeliveryStatus(projection, '2026-08-10');
  assert.equal(renderSystemDeliveryStatus(projection, '2026-08-10'), first);
  assert.match(first, /`evaluated-sha`/u);
  assert.match(first, /1\.2\.3/u);
  assert.match(first, /Exact Planning DB status only/u);
  assert.match(first, /Effective command\/query rail rows \| 2/u);
  assert.match(first, /rail:command:WriteB:missing/u);
  assert.doesNotMatch(first, /capability coverage.*truth/iu);
});

test('System Delivery Status fails closed for unavailable DB facts and duplicate rails', () => {
  assert.throws(
    () =>
      buildSystemDeliveryStatusProjection([], systemDeliveryFacts({ maturity: undefined }), {
        gitSha: 'evaluated-sha',
        release: { version: '1.2.3' },
      }),
    /Required Planning DB fact.*maturity/u
  );
  assert.throws(
    () =>
      buildSystemDeliveryStatusProjection(
        [],
        systemDeliveryFacts({
          rails: [
            {
              rail_id: 'duplicate',
              rail_name: 'ReadA',
              rail_type: 'query',
              rail_status: 'implemented',
              is_duplicate: true,
            },
          ],
        }),
        { gitSha: 'evaluated-sha', release: { version: '1.2.3' } }
      ),
    /Duplicate command\/query rail authority.*ReadA/u
  );
});
