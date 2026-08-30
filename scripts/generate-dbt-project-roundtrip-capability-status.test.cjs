const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const {
  normalizeDbtRoundtripCapabilityRow,
  renderDbtRoundtripCapabilityStatus,
  runDbtRoundtripCapabilityStatusGenerator,
  validateDbtRoundtripCapabilityRows,
  verifyGitCommitAncestry,
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

function completeCurrentRows() {
  return [
    currentRow({
      phase_id: 'phase-2',
      phase_order: 2,
      phase_name: 'dbt analysis and read-only file projection',
      phase_expected_rail_count: 1,
      phase_actual_rail_count: 1,
      rail_name: 'ProjectDbtGraphFromFiles',
    }),
    currentRow({
      phase_id: 'phase-3',
      phase_order: 3,
      phase_name: 'Import and file-backed Source Import',
      phase_expected_rail_count: 2,
      phase_actual_rail_count: 2,
      rail_name: 'ImportDbtProject',
    }),
    currentRow({
      phase_id: 'phase-3',
      phase_order: 3,
      phase_name: 'Import and file-backed Source Import',
      phase_expected_rail_count: 2,
      phase_actual_rail_count: 2,
      rail_name: 'ValidateDbtProjectImport',
    }),
    currentRow({ rail_name: 'BuildDbtPlannerGraphSource' }),
    currentRow({ rail_name: 'ObservePlanRunReadiness' }),
    currentRow(),
    currentRow({ rail_name: 'StartRun' }),
  ];
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
  const rows = completeCurrentRows().map((row) =>
    row.rail_name === 'PreviewExecutionPlan'
      ? { ...row, projection_state: 'rail_status_drift' }
      : row
  );

  await assert.rejects(
    validateDbtRoundtripCapabilityRows(rows, {
      verifyCommit: async () => ({ exists: true, isAncestor: true }),
    }),
    /PreviewExecutionPlan.*rail_status_drift/
  );
});

test('validateDbtRoundtripCapabilityRows fails closed on duplicate evidence rows', async () => {
  await assert.rejects(
    validateDbtRoundtripCapabilityRows([...completeCurrentRows(), currentRow()], {
      verifyCommit: async () => ({ exists: true, isAncestor: true }),
    }),
    /duplicate phase\/rail evidence/i
  );
});

test('validateDbtRoundtripCapabilityRows rejects an incomplete governed phase and rail set', async () => {
  const incompleteRows = completeCurrentRows().filter((row) => row.phase_id !== 'phase-3');

  await assert.rejects(
    validateDbtRoundtripCapabilityRows(incompleteRows, {
      verifyCommit: async () => ({ exists: true, isAncestor: true }),
    }),
    /missing governed capabilities.*phase-3\/ImportDbtProject.*phase-3\/ValidateDbtProjectImport/i
  );
});

test('validateDbtRoundtripCapabilityRows rejects the retired export capability as unexpected', async () => {
  const retiredExportRow = currentRow({
    phase_id: 'phase-6',
    phase_order: 6,
    phase_name: 'Export',
    phase_expected_rail_count: 1,
    phase_actual_rail_count: 1,
    rail_name: 'ExportDbtProject',
  });

  await assert.rejects(
    validateDbtRoundtripCapabilityRows([...completeCurrentRows(), retiredExportRow], {
      verifyCommit: async () => ({ exists: true, isAncestor: true }),
    }),
    /unexpected governed capabilities.*phase-6\/ExportDbtProject/i
  );
});

test('validateDbtRoundtripCapabilityRows rejects missing and non-ancestor commits', async () => {
  await assert.rejects(
    validateDbtRoundtripCapabilityRows(completeCurrentRows(), {
      verifyCommit: async () => ({ exists: false, isAncestor: false }),
    }),
    /does not exist/
  );
  await assert.rejects(
    validateDbtRoundtripCapabilityRows(completeCurrentRows(), {
      verifyCommit: async () => ({ exists: true, isAncestor: false }),
    }),
    /is not an ancestor/
  );
});

test('verifyGitCommitAncestry hydrates shallow history before rejecting valid evidence', async () => {
  const calls = [];
  let hydrated = false;
  const runGit = (args) => {
    calls.push(args);
    if (args[0] === 'cat-file') {
      return { status: hydrated ? 0 : 1, stdout: '', stderr: '' };
    }
    if (args[0] === 'rev-parse') {
      return { status: 0, stdout: hydrated ? 'false\n' : 'true\n', stderr: '' };
    }
    if (args[0] === 'fetch') {
      hydrated = true;
      return { status: 0, stdout: '', stderr: '' };
    }
    if (args[0] === 'merge-base') {
      return { status: 0, stdout: '', stderr: '' };
    }
    throw new Error(`Unexpected Git command: ${args.join(' ')}`);
  };

  const result = await verifyGitCommitAncestry(currentRow().reviewed_commit_sha, { runGit });

  assert.deepEqual(result, { exists: true, isAncestor: true });
  assert.ok(calls.some((args) => args.join(' ') === 'fetch --no-tags --unshallow origin'));
});

test('verifyGitCommitAncestry fails closed when shallow history cannot be hydrated', async () => {
  const runGit = (args) => {
    if (args[0] === 'cat-file') {
      return { status: 1, stdout: '', stderr: '' };
    }
    if (args[0] === 'rev-parse') {
      return { status: 0, stdout: 'true\n', stderr: '' };
    }
    if (args[0] === 'fetch') {
      return { status: 128, stdout: '', stderr: 'remote unavailable' };
    }
    throw new Error(`Unexpected Git command: ${args.join(' ')}`);
  };

  await assert.rejects(
    verifyGitCommitAncestry(currentRow().reviewed_commit_sha, { runGit }),
    /Unable to hydrate shallow Git history from origin: remote unavailable/
  );
});

test('verifyGitCommitAncestry uses isolated full-history evidence for a credential-free shallow checkout', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dbt-roundtrip-git-evidence-'));
  const sourceRoot = path.join(tempRoot, 'source');
  const evidenceRoot = path.join(tempRoot, 'evidence');
  const shallowRoot = path.join(tempRoot, 'shallow');
  const git = (cwd, args) =>
    childProcess.spawnSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

  try {
    fs.mkdirSync(sourceRoot);
    assert.equal(git(sourceRoot, ['init']).status, 0);
    assert.equal(git(sourceRoot, ['config', 'user.email', 'ci@dvt.local']).status, 0);
    assert.equal(git(sourceRoot, ['config', 'user.name', 'DVT CI']).status, 0);

    fs.writeFileSync(path.join(sourceRoot, 'evidence.txt'), 'reviewed\n', 'utf8');
    assert.equal(git(sourceRoot, ['add', 'evidence.txt']).status, 0);
    assert.equal(git(sourceRoot, ['commit', '-m', 'reviewed']).status, 0);
    const reviewedCommitSha = git(sourceRoot, ['rev-parse', 'HEAD']).stdout.trim();

    fs.appendFileSync(path.join(sourceRoot, 'evidence.txt'), 'current\n', 'utf8');
    assert.equal(git(sourceRoot, ['add', 'evidence.txt']).status, 0);
    assert.equal(git(sourceRoot, ['commit', '-m', 'current']).status, 0);

    assert.equal(git(tempRoot, ['clone', sourceRoot, evidenceRoot]).status, 0);
    assert.equal(
      git(tempRoot, ['clone', '--depth=1', pathToFileURL(sourceRoot).href, shallowRoot]).status,
      0
    );
    assert.equal(git(shallowRoot, ['rev-parse', '--is-shallow-repository']).stdout.trim(), 'true');
    assert.notEqual(
      git(shallowRoot, ['cat-file', '-e', `${reviewedCommitSha}^{commit}`]).status,
      0
    );
    assert.equal(git(shallowRoot, ['remote', 'remove', 'origin']).status, 0);

    const result = await verifyGitCommitAncestry(reviewedCommitSha, {
      repoRoot: shallowRoot,
      gitEvidenceRepoRoot: evidenceRoot,
    });

    assert.deepEqual(result, { exists: true, isAncestor: true });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
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
  const client = { query: async () => ({ rows: completeCurrentRows() }) };
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

test('check validates governed truth when the ignored local artifact is absent', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dbt-roundtrip-status-'));
  const outputPath = path.join(tempRoot, 'status.md');
  const messages = [];

  try {
    const result = await runDbtRoundtripCapabilityStatusGenerator({
      check: true,
      client: { query: async () => ({ rows: completeCurrentRows() }) },
      outputPath,
      verifyCommit: async () => ({ exists: true, isAncestor: true }),
      logger: { log: (message) => messages.push(message) },
    });

    assert.deepEqual(result, { changed: false, outputPath, rowCount: 7 });
    assert.equal(fs.existsSync(outputPath), false);
    assert.match(messages.join('\n'), /governed truth is current/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
