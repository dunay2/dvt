#!/usr/bin/env node
/** Owned concern: validate and render DBT round-trip capability truth from Planning DB and Git evidence. */
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const {
  readDbtProjectRoundtripCapabilityStatusRows,
} = require('./planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs');

const repoRoot = path.resolve(__dirname, '..');
const defaultOutputPath = path.join(
  repoRoot,
  '.generated-docs',
  'planning',
  'status',
  'generated-dbt-project-roundtrip-capability-status.md'
);
const sourceView = 'planning_query_store.dbt_project_roundtrip_capability_status_query';
const governedCapabilityKeys = Object.freeze([
  'phase-2/ProjectDbtGraphFromFiles',
  'phase-3/ImportDbtProject',
  'phase-3/ValidateDbtProjectImport',
  'phase-4/BuildDbtPlannerGraphSource',
  'phase-4/ObservePlanRunReadiness',
  'phase-4/PreviewExecutionPlan',
  'phase-4/StartRun',
]);

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function toBoolean(value) {
  return value === true || value === 'true';
}

function toNumber(value) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function normalizeDbtRoundtripCapabilityRow(row) {
  return {
    phaseId: String(row.phase_id ?? row.phaseId ?? ''),
    phaseOrder: toNumber(row.phase_order ?? row.phaseOrder),
    phaseName: String(row.phase_name ?? row.phaseName ?? ''),
    phaseExpectedRailCount: toNumber(row.phase_expected_rail_count ?? row.phaseExpectedRailCount),
    phaseActualRailCount: toNumber(row.phase_actual_rail_count ?? row.phaseActualRailCount),
    railType: String(row.rail_type ?? row.railType ?? ''),
    railName: String(row.rail_name ?? row.railName ?? ''),
    dddOwner: String(row.ddd_owner ?? row.dddOwner ?? ''),
    expectedRailStatus: String(row.expected_rail_status ?? row.expectedRailStatus ?? ''),
    railStatus: String(row.rail_status ?? row.railStatus ?? ''),
    expectedMechanizationStatus: String(
      row.expected_mechanization_status ?? row.expectedMechanizationStatus ?? ''
    ),
    mechanizationStatus: String(row.mechanization_status ?? row.mechanizationStatus ?? ''),
    expectedIsGap: toBoolean(row.expected_is_gap ?? row.expectedIsGap),
    isGap: toBoolean(row.is_gap ?? row.isGap),
    expectedImplemented: toBoolean(row.expected_implemented ?? row.expectedImplemented),
    implementationRefCount: toNumber(row.implementation_ref_count ?? row.implementationRefCount),
    isDuplicate: toBoolean(row.is_duplicate ?? row.isDuplicate),
    projectionState: String(row.projection_state ?? row.projectionState ?? ''),
    reviewedPrUrl: String(row.reviewed_pr_url ?? row.reviewedPrUrl ?? ''),
    reviewedCommitSha: String(row.reviewed_commit_sha ?? row.reviewedCommitSha ?? ''),
    evidenceSummary: String(row.evidence_summary ?? row.evidenceSummary ?? ''),
  };
}

function sortRows(rows) {
  return [...rows].map(normalizeDbtRoundtripCapabilityRow).sort((left, right) => {
    return left.phaseOrder - right.phaseOrder || left.railName.localeCompare(right.railName);
  });
}

function runGit(args, options = {}) {
  return childProcess.spawnSync('git', args, {
    cwd:
      options.gitEvidenceRepoRoot ||
      process.env.DVT_GIT_EVIDENCE_REPO ||
      options.repoRoot ||
      repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function verifyGitCommitAncestry(commitSha, options = {}) {
  if (!/^[a-f0-9]{40}$/.test(commitSha)) {
    return { exists: false, isAncestor: false };
  }
  const git = options.runGit || runGit;
  const checkedRef = options.checkedRef || 'HEAD';
  const remote = options.remote || 'origin';
  let hydrated = false;
  const isShallowRepository = () => {
    const result = git(['rev-parse', '--is-shallow-repository'], options);
    if (result.status !== 0) {
      throw new Error(
        `Git shallow-repository detection failed: ${result.stderr || 'unknown error'}`
      );
    }
    return result.stdout.trim() === 'true';
  };
  const hydrateShallowHistory = () => {
    const result = git(['fetch', '--no-tags', '--unshallow', remote], options);
    if (result.status !== 0) {
      throw new Error(
        `Unable to hydrate shallow Git history from ${remote}: ${result.stderr || 'unknown error'}`
      );
    }
    hydrated = true;
  };
  let exists = git(['cat-file', '-e', `${commitSha}^{commit}`], options).status === 0;

  if (!exists && isShallowRepository()) {
    hydrateShallowHistory();
    exists = git(['cat-file', '-e', `${commitSha}^{commit}`], options).status === 0;
  }
  if (!exists) {
    return { exists: false, isAncestor: false };
  }

  let ancestorResult = git(['merge-base', '--is-ancestor', commitSha, checkedRef], options);
  if (ancestorResult.status === 1 && !hydrated && isShallowRepository()) {
    hydrateShallowHistory();
    ancestorResult = git(['merge-base', '--is-ancestor', commitSha, checkedRef], options);
  }
  if (ancestorResult.status !== 0 && ancestorResult.status !== 1) {
    throw new Error(
      `Git ancestry verification failed for ${commitSha}: ${ancestorResult.stderr || 'unknown error'}`
    );
  }
  return { exists: true, isAncestor: ancestorResult.status === 0 };
}

async function validateDbtRoundtripCapabilityRows(rows, options = {}) {
  const normalizedRows = sortRows(rows);
  if (normalizedRows.length === 0) {
    throw new Error('DBT round-trip capability projection returned no governed phases.');
  }

  const projectedKeys = new Set(normalizedRows.map((row) => `${row.phaseId}/${row.railName}`));
  const missingKeys = governedCapabilityKeys.filter((key) => !projectedKeys.has(key));
  const unexpectedKeys = [...projectedKeys].filter((key) => !governedCapabilityKeys.includes(key));
  if (missingKeys.length > 0) {
    throw new Error(`Missing governed capabilities: ${missingKeys.join(', ')}.`);
  }
  if (unexpectedKeys.length > 0) {
    throw new Error(`Unexpected governed capabilities: ${unexpectedKeys.join(', ')}.`);
  }

  const seen = new Set();
  const verifiedCommits = new Map();
  const verifyCommit = options.verifyCommit || ((sha) => verifyGitCommitAncestry(sha, options));

  for (const row of normalizedRows) {
    const key = `${row.phaseId}/${row.railName || '<missing>'}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate phase/rail evidence: ${key}.`);
    }
    seen.add(key);

    if (row.projectionState !== 'current') {
      throw new Error(
        `DBT round-trip capability ${row.railName || row.phaseId} is ${row.projectionState}.`
      );
    }
    if (row.phaseActualRailCount !== row.phaseExpectedRailCount) {
      throw new Error(
        `${row.phaseId} expects ${row.phaseExpectedRailCount} rails but projects ${row.phaseActualRailCount}.`
      );
    }
    if (!/^https:\/\/github\.com\/dunay2\/dvt\/pull\/\d+$/.test(row.reviewedPrUrl)) {
      throw new Error(`DBT round-trip capability ${key} has an invalid reviewed PR URL.`);
    }
    if (!/^[a-f0-9]{40}$/.test(row.reviewedCommitSha)) {
      throw new Error(`DBT round-trip capability ${key} has an invalid reviewed commit SHA.`);
    }

    if (!verifiedCommits.has(row.reviewedCommitSha)) {
      verifiedCommits.set(row.reviewedCommitSha, await verifyCommit(row.reviewedCommitSha));
    }
    const verification = verifiedCommits.get(row.reviewedCommitSha);
    if (!verification.exists) {
      throw new Error(`Reviewed commit ${row.reviewedCommitSha} does not exist.`);
    }
    if (!verification.isAncestor) {
      throw new Error(
        `Reviewed commit ${row.reviewedCommitSha} is not an ancestor of the checked repository ref.`
      );
    }
  }
  return normalizedRows;
}

function markdownCell(value) {
  return String(value ?? '').replace(/[\\|]/g, '\\$&');
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.map(markdownCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
}

function reviewedPrLabel(url) {
  return `PR #${url.split('/').at(-1)}`;
}

function renderDbtRoundtripCapabilityStatus(rows) {
  const sortedRows = sortRows(rows);
  const currentCount = sortedRows.filter((row) => row.projectionState === 'current').length;
  return [
    '---',
    'title: Generated DBT Project Round-Trip Capability Status',
    'status: Active',
    'owner: Architecture / Planning DB',
    'planning_type: status',
    '---',
    '',
    '# Generated DBT Project Round-Trip Capability Status',
    '',
    '> This page is auto-generated by `pnpm docs:dbt-roundtrip-capabilities:generate`. Do not edit manually.',
    '',
    `Source view: \`${sourceView}\`.`,
    '',
    `Current rails: ${currentCount}/${sortedRows.length}.`,
    '',
    markdownTable(
      [
        'Phase',
        'Rail',
        'Type',
        'Expected',
        'Current',
        'Mechanization',
        'Refs',
        'State',
        'Reviewed evidence',
      ],
      sortedRows.map((row) => [
        `${row.phaseOrder}. ${row.phaseName}`,
        `\`${row.railName}\``,
        row.railType,
        `${row.expectedRailStatus}/${row.expectedMechanizationStatus}`,
        `${row.railStatus}/${row.mechanizationStatus}`,
        row.expectedImplemented ? 'implemented' : 'deferred',
        String(row.implementationRefCount),
        row.projectionState,
        `[${reviewedPrLabel(row.reviewedPrUrl)}](${row.reviewedPrUrl}) · \`${row.reviewedCommitSha.slice(0, 12)}\``,
      ])
    ),
    '',
    'Operator query:',
    '',
    '`pnpm planning:db:query dbt-roundtrip-capabilities --limit 20`',
    '',
  ].join('\n');
}

function relativeOutputPath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

async function runDbtRoundtripCapabilityStatusGenerator(options = {}) {
  const outputPath = path.resolve(options.outputPath || defaultOutputPath);
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;
  const logger = options.logger || console;

  if (ownsClient) {
    await client.connect();
  }
  try {
    const rows = await readDbtProjectRoundtripCapabilityStatusRows(client, { limit: 100 });
    const validatedRows = await validateDbtRoundtripCapabilityRows(rows, options);
    const content = renderDbtRoundtripCapabilityStatus(validatedRows);
    const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : null;
    if (options.check) {
      if (current === null) {
        logger.log(
          `[docs:dbt-roundtrip-capabilities:check] governed truth is current; ignored local artifact ${relativeOutputPath(outputPath)} is absent.`
        );
        return { changed: false, outputPath, rowCount: validatedRows.length };
      }
      if (current !== content) {
        throw new Error(
          `${relativeOutputPath(outputPath)} is stale. Run pnpm docs:dbt-roundtrip-capabilities:generate.`
        );
      }
      logger.log(
        `[docs:dbt-roundtrip-capabilities:check] ${relativeOutputPath(outputPath)} is current.`
      );
      return { changed: false, outputPath, rowCount: validatedRows.length };
    }
    if (current !== content) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, content, 'utf8');
      logger.log(
        `[docs:dbt-roundtrip-capabilities:generate] Updated ${relativeOutputPath(outputPath)}`
      );
      return { changed: true, outputPath, rowCount: validatedRows.length };
    }
    logger.log(
      `[docs:dbt-roundtrip-capabilities:generate] ${relativeOutputPath(outputPath)} is current.`
    );
    return { changed: false, outputPath, rowCount: validatedRows.length };
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--check') {
      options.check = true;
      continue;
    }
    if (arg === '--output' || arg === '--ref') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a value.`);
      }
      options[arg === '--output' ? 'outputPath' : 'checkedRef'] = value;
      index += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown DBT round-trip capability status option "${arg}".`);
  }
  return options;
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(
      'Usage: pnpm docs:dbt-roundtrip-capabilities:generate [--check] [--ref <git-ref>] [--output <path>]'
    );
    return;
  }
  await runDbtRoundtripCapabilityStatusGenerator(options);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[docs:dbt-roundtrip-capabilities] ${error.message || error}`);
    process.exit(1);
  });
}

module.exports = {
  defaultOutputPath,
  governedCapabilityKeys,
  normalizeDbtRoundtripCapabilityRow,
  parseArgs,
  renderDbtRoundtripCapabilityStatus,
  runDbtRoundtripCapabilityStatusGenerator,
  validateDbtRoundtripCapabilityRows,
  verifyGitCommitAncestry,
};
