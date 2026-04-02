import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const SUCCESS_CONCLUSIONS = new Set(['SUCCESS', 'NEUTRAL']);
const PENDING_STATES = new Set([
  'PENDING',
  'IN_PROGRESS',
  'QUEUED',
  'EXPECTED',
  'WAITING',
  'REQUESTED',
]);

function compareIsoAscending(left, right) {
  const leftTime = Date.parse(left ?? '');
  const rightTime = Date.parse(right ?? '');

  if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
    return 0;
  }
  if (Number.isNaN(leftTime)) {
    return 1;
  }
  if (Number.isNaN(rightTime)) {
    return -1;
  }
  return leftTime - rightTime;
}

function runGh(args) {
  const result = spawnSync('gh', args, {
    encoding: 'utf8',
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  const stdout = result.stdout?.trim() ?? '';
  const stderr = result.stderr?.trim() ?? '';

  if (result.status !== 0) {
    const error = new Error(stderr || stdout || `gh ${args.join(' ')} failed`);
    error.code = 'GH_COMMAND_FAILED';
    error.stderr = stderr;
    error.stdout = stdout;
    throw error;
  }

  return stdout;
}

function ghFailureMeansNoPr(error) {
  const text = `${error?.stderr ?? ''}\n${error?.stdout ?? ''}`.toLowerCase();
  return text.includes('no pull requests found');
}

export function parseActionsJobDetailsUrl(detailsUrl) {
  if (typeof detailsUrl !== 'string' || detailsUrl.length === 0) {
    return null;
  }

  const match = detailsUrl.match(/\/actions\/runs\/(\d+)\/job\/(\d+)(?:[/?#]|$)/);
  if (!match) {
    return null;
  }

  return {
    runId: match[1],
    jobId: match[2],
  };
}

export function normalizeStatusCheck(rawCheck) {
  const typename = rawCheck?.__typename ?? 'Unknown';
  const detailsUrl = rawCheck?.detailsUrl ?? rawCheck?.targetUrl ?? null;
  const status = String(rawCheck?.status ?? rawCheck?.state ?? '').toUpperCase();
  const conclusion = String(rawCheck?.conclusion ?? rawCheck?.state ?? '').toUpperCase();
  const workflowName = rawCheck?.workflowName ?? null;
  const name = rawCheck?.name ?? rawCheck?.context ?? 'unknown-check';
  const startedAt = rawCheck?.startedAt ?? rawCheck?.createdAt ?? null;
  const completedAt = rawCheck?.completedAt ?? rawCheck?.updatedAt ?? null;

  return {
    typename,
    name,
    status,
    conclusion,
    workflowName,
    detailsUrl,
    startedAt,
    completedAt,
    isGitHubActions: Boolean(workflowName) || parseActionsJobDetailsUrl(detailsUrl) !== null,
  };
}

export function classifyStatusChecks(statusCheckRollup) {
  const buckets = {
    failed: [],
    pending: [],
    successful: [],
    skipped: [],
    external: [],
  };

  for (const rawCheck of statusCheckRollup ?? []) {
    const check = normalizeStatusCheck(rawCheck);

    if (!check.isGitHubActions) {
      buckets.external.push(check);
      continue;
    }

    if (PENDING_STATES.has(check.status)) {
      buckets.pending.push(check);
      continue;
    }

    if (check.status !== 'COMPLETED') {
      buckets.pending.push(check);
      continue;
    }

    if (check.conclusion === 'SKIPPED') {
      buckets.skipped.push(check);
      continue;
    }

    if (SUCCESS_CONCLUSIONS.has(check.conclusion)) {
      buckets.successful.push(check);
      continue;
    }

    buckets.failed.push(check);
  }

  return buckets;
}

export function pickFirstFailingGitHubActionsCheck(statusCheckRollup) {
  const failing = classifyStatusChecks(statusCheckRollup).failed;
  if (failing.length === 0) {
    return null;
  }

  return [...failing].sort((left, right) => {
    const completedDelta = compareIsoAscending(left.completedAt, right.completedAt);
    if (completedDelta !== 0) {
      return completedDelta;
    }

    const startedDelta = compareIsoAscending(left.startedAt, right.startedAt);
    if (startedDelta !== 0) {
      return startedDelta;
    }

    return left.name.localeCompare(right.name);
  })[0];
}

export function extractFailureSnippet(logText, options = {}) {
  const maxLines = options.maxLines ?? 12;
  const lines = String(logText ?? '')
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return null;
  }

  const failureIndex = lines.findIndex((line) =>
    /(error|failed|exception|assert|traceback|not ok)/iu.test(line)
  );
  const start = failureIndex >= 0 ? failureIndex : 0;

  return lines.slice(start, start + maxLines).join('\n');
}

async function resolvePrContext(prRef) {
  try {
    const args = ['pr', 'view'];
    if (prRef) {
      args.push(prRef);
    }
    args.push('--json', 'number,url,headRefName,statusCheckRollup');

    const output = runGh(args);
    return JSON.parse(output);
  } catch (error) {
    if (ghFailureMeansNoPr(error)) {
      return null;
    }
    throw error;
  }
}

function buildSummaryPayload(prData) {
  const buckets = classifyStatusChecks(prData.statusCheckRollup);
  return {
    status: 'ok',
    pr: {
      number: prData.number,
      url: prData.url,
      headRefName: prData.headRefName,
    },
    counts: {
      failed: buckets.failed.length,
      pending: buckets.pending.length,
      successful: buckets.successful.length,
      skipped: buckets.skipped.length,
      external: buckets.external.length,
    },
    failed: buckets.failed,
    pending: buckets.pending,
    external: buckets.external,
    successful: buckets.successful,
    skipped: buckets.skipped,
  };
}

function fetchJobLog(jobId) {
  const failedLog = runGh(['run', 'view', '--job', jobId, '--log-failed']);
  if (failedLog.trim().length > 0) {
    return failedLog;
  }
  return runGh(['run', 'view', '--job', jobId, '--log']);
}

async function buildFirstFailurePayload(prData) {
  const summary = buildSummaryPayload(prData);
  const failingCheck = pickFirstFailingGitHubActionsCheck(prData.statusCheckRollup);

  if (!failingCheck) {
    return {
      status: 'no_failing_actions_check',
      pr: summary.pr,
      counts: summary.counts,
    };
  }

  const parsedUrl = parseActionsJobDetailsUrl(failingCheck.detailsUrl);
  if (!parsedUrl) {
    return {
      status: 'unloggable_failure',
      pr: summary.pr,
      check: failingCheck,
    };
  }

  const logText = fetchJobLog(parsedUrl.jobId);
  return {
    status: 'ok',
    pr: summary.pr,
    check: failingCheck,
    job: parsedUrl,
    snippet: extractFailureSnippet(logText),
  };
}

function parseArgs(argv) {
  const args = {
    command: null,
    pr: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!args.command && !current.startsWith('--')) {
      args.command = current;
      continue;
    }

    if (current === '--pr') {
      args.pr = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.command || !['summary', 'first-failure'].includes(args.command)) {
    throw new Error(
      'Usage: node tools/ci/pr-check-triage.mjs <summary|first-failure> [--pr <ref>]'
    );
  }

  const prData = await resolvePrContext(args.pr);
  if (!prData) {
    process.stdout.write(
      `${JSON.stringify({ status: 'no_pr', message: 'No pull request found for the selected branch.' }, null, 2)}\n`
    );
    return;
  }

  const payload =
    args.command === 'summary'
      ? buildSummaryPayload(prData)
      : await buildFirstFailurePayload(prData);

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
