const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  normalizeDbtRoundtripCapabilityRow,
  renderDbtRoundtripCapabilityStatus,
  runDbtRoundtripCapabilityStatusGenerator,
  validateDbtRoundtripCapabilityRows,
} = require('./generate-dbt-project-roundtrip-capability-status.cjs');

function currentRow(overrides = {}) {
  return {
    phase_id: 'phase-4',
    phase_order: 4,
    phase_name: 'File-backed Preview and Run',
    phase_expected_rail_count: 4,
    phase_actual_rail_count: 4,
    rail_type: 'command',
    rail_name: 'PreviewExecutionPlan',
    ddd_owner: 'Canvas execution preview/readiness presentation',
    expected_rail_status: 'implemented',
    rail_status: 'implemented',
    expected_mechanization_status: 'implemented',
    mechanization_status: 'implemented',
    expected_is_gap: false,
    is_gap: false,
    expected_implemented: true,
    implementation_ref_count: 3,
    is_duplicate: false,
    projection_state: 'current',
    reviewed_pr_url: 'https://github.com/dunay2/dvt/pull/1962',
    reviewed_commit_sha: 'f65d187319db03651c000e7907f4ddb8f3b0ea17',
    evidence_summary: 'Phase 4 merged evidence.',
    ...overrides,
  };
}

test('normalizeDbtRoundtripCapabilityRow preserves relational phase and rail facts', () => {
  assert.deepEqual(normalizeDbtRoundtripCapabilityRow(currentRow()), {
    phaseId: 'phase-4',
    phaseOrder: 4,
    phaseName: 'File-backed Preview and Run',
    phaseExpectedRailCount: 4,
    phaseActualRailCount: 4,
    railType: 'command',
    railName: 'PreviewExecutionPlan',
    dddOwner: 'Canvas execution preview/readiness presentation',
    expectedRailStatus: 'implemented',
    railStatus: 'implemented',
    expectedMechanizationStatus: 'implemented',
    mechanizationStatus: 'implemented',
    expectedIsGap: false,
    isGap: false,
    expectedImplemented: true,
    implementationRefCount: 3,
    isDuplicate: false,
    projectionState: 'current',
    reviewedPrUrl: 'https://github.com/dunay2/dvt/pull/1962',
    reviewedCommitSha: 'f65d187319db03651c000e7907f4ddb8f3b0ea17',
    evidenceSummary: 'Phase 4 merged evidence.',
  });
});

test('validateDbtRoundtripCapabilityRows fails closed on DB projection drift', async () => {
  await assert.rejects(
    validateDbtRoundtripCapabilityRows([currentRow({ projection_state: 'rail_status_drift' })], {
      verifyCommit: async () => ({ exists: true, isAncestor: true }),
    }),
    /PreviewExecutionPlan.*rail_status_drift/
  );
});

test('validateDbtRoundtripCapabilityRows fails closed on duplicate evidence rows', async () => {
  await assert.rejects(
    validateDbtRoundtripCapabilityRows([currentRow(), currentRow()], {
      verifyCommit: async () => ({ exists: true, isAncestor: true }),
    }),
    /duplicate phase\/rail evidence/i
  );
});

test('validateDbtRoundtripCapabilityRows rejects missing and non-ancestor commits', async () => {
  await assert.rejects(
    validateDbtRoundtripCapabilityRows([currentRow()], {
      verifyCommit: async () => ({ exists: false, isAncestor: false }),
    }),
    /does not exist/
  );
  await assert.rejects(
    validateDbtRoundtripCapabilityRows([currentRow()], {
      verifyCommit: async () => ({ exists: true, isAncestor: false }),
    }),
    /is not an ancestor/
  );
});

test('renderDbtRoundtripCapabilityStatus is deterministic and links reviewed evidence', () => {
  const first = renderDbtRoundtripCapabilityStatus([
    currentRow({ rail_name: 'StartRun' }),
    currentRow(),
  ]);
  const second = renderDbtRoundtripCapabilityStatus([
    currentRow(),
    currentRow({ rail_name: 'StartRun' }),
  ]);

  assert.equal(first, second);
  assert.match(first, /Generated DBT Project Round-Trip Capability Status/);
  assert.match(first, /\[PR #1962\]\(https:\/\/github\.com\/dunay2\/dvt\/pull\/1962\)/);
  assert.match(first, /`f65d187319db`/);
  assert.doesNotMatch(first, /Generated at|2026-07-17T/);
});

test('generator detects stale local output after validating DB and Git evidence', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dbt-roundtrip-status-'));
  const outputPath = path.join(tempRoot, 'status.md');
  const client = { query: async () => ({ rows: [currentRow()] }) };
  const verifyCommit = async () => ({ exists: true, isAncestor: true });

  try {
    await runDbtRoundtripCapabilityStatusGenerator({
      client,
      outputPath,
      verifyCommit,
      logger: { log() {} },
    });
    assert.match(fs.readFileSync(outputPath, 'utf8'), /PreviewExecutionPlan/);

    fs.writeFileSync(outputPath, 'stale\n', 'utf8');
    await assert.rejects(
      runDbtRoundtripCapabilityStatusGenerator({
        check: true,
        client,
        outputPath,
        verifyCommit,
        logger: { log() {} },
      }),
      /is stale/
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
