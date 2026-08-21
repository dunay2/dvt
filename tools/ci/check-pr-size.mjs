#!/usr/bin/env node
/**
 * Enforce review-size limits for authored pull-request lines.
 */

import { pathToFileURL } from 'node:url';

export const MAX_LINE_CHANGES = 50_000;

const LINE_WARNING_THRESHOLD = 500;

function parseNonNegativeInteger(value, name) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value ?? '', 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative safe integer.`);
  }
  return parsed;
}

export function classifyPullRequestSize(input) {
  const additions = parseNonNegativeInteger(input.additions, 'PR_ADDITIONS');
  const deletions = parseNonNegativeInteger(input.deletions, 'PR_DELETIONS');
  const totalLineChanges = additions + deletions;

  if (totalLineChanges > MAX_LINE_CHANGES) {
    return {
      status: 'fail',
      message: `PR too large: ${totalLineChanges} lines changed (max: ${MAX_LINE_CHANGES}).`,
      totalLineChanges,
    };
  }

  const status = totalLineChanges > LINE_WARNING_THRESHOLD ? 'warning' : 'pass';
  return {
    status,
    message:
      status === 'warning'
        ? `Large PR: ${totalLineChanges} lines changed.`
        : `PR size acceptable: ${totalLineChanges} lines changed.`,
    totalLineChanges,
  };
}

function parseLabels(rawLabels) {
  let labels;
  try {
    labels = JSON.parse(rawLabels ?? '[]');
  } catch (error) {
    throw new Error(`PR_LABELS must be a JSON array: ${error.message}`, { cause: error });
  }
  if (!Array.isArray(labels)) {
    throw new Error('PR_LABELS must be a JSON array.');
  }
  return labels.map((label) => String(label).toLowerCase());
}

function hasSizeOverride(title, labels) {
  return (
    /\[skip-size-check\]/iu.test(title) ||
    labels.includes('skip-size-check') ||
    labels.includes('pr-size-exempt')
  );
}

export function runPrSizeCheck(env = process.env, deps = {}) {
  const logger = deps.logger ?? console;
  try {
    const title = env.PR_TITLE ?? '';
    const labels = parseLabels(env.PR_LABELS);
    if (hasSizeOverride(title, labels)) {
      logger.log('PR size check skipped by approved override.');
      return 0;
    }

    const result = classifyPullRequestSize({
      additions: env.PR_ADDITIONS ?? '0',
      deletions: env.PR_DELETIONS ?? '0',
    });
    const detail = `Total: ${result.totalLineChanges} lines.`;

    if (result.status === 'fail') {
      logger.error(`${result.message} ${detail}`);
      return 1;
    }
    if (result.status === 'warning') {
      logger.warn(`${result.message} ${detail}`);
      logger.log('PR size within the enforced limit.');
      return 0;
    }
    logger.log(`${result.message} ${detail}`);
    return 0;
  } catch (error) {
    logger.error(`PR size classification failed closed: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runPrSizeCheck();
}
