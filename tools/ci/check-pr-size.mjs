#!/usr/bin/env node
/**
 * Enforce independent review-size limits for authored lines and the canonical Planning DB snapshot.
 */

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const MAX_LINE_CHANGES = 50_000;
export const MAX_CANONICAL_RECORD_CHANGES = 500;

const LINE_WARNING_THRESHOLD = 500;
const CANONICAL_RECORD_WARNING_THRESHOLD = 100;
const CANONICAL_STATE_PATH = 'tools/planning-db/state/canonical-state.json';

function parseNonNegativeInteger(value, name) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value ?? '', 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative safe integer.`);
  }
  return parsed;
}

function stableJsonStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJsonStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function collectCanonicalRecords(snapshot) {
  if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('The canonical Planning DB state must be an object.');
  }

  const records = new Map();
  const visit = (value, path) => {
    if (Array.isArray(value)) {
      for (const record of value) {
        if (record === null || typeof record !== 'object' || Array.isArray(record)) {
          throw new Error(`Canonical record ${path} must be an object.`);
        }
        const key = `${path}\0${stableJsonStringify(record)}`;
        records.set(key, (records.get(key) ?? 0) + 1);
      }
      return;
    }
    if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        visit(child, path ? `${path}.${key}` : key);
      }
    }
  };

  visit(snapshot, '');
  return records;
}

export function countCanonicalRecordChanges(baseSnapshot, headSnapshot) {
  const baseRecords = collectCanonicalRecords(baseSnapshot);
  const headRecords = collectCanonicalRecords(headSnapshot);
  const keys = new Set([...baseRecords.keys(), ...headRecords.keys()]);
  let changes = 0;

  for (const key of keys) {
    changes += Math.abs((baseRecords.get(key) ?? 0) - (headRecords.get(key) ?? 0));
  }
  return changes;
}

export function classifyPullRequestSize(input) {
  const additions = parseNonNegativeInteger(input.additions, 'PR_ADDITIONS');
  const deletions = parseNonNegativeInteger(input.deletions, 'PR_DELETIONS');
  const canonicalAdditions = parseNonNegativeInteger(
    input.canonicalAdditions,
    'canonical additions'
  );
  const canonicalDeletions = parseNonNegativeInteger(
    input.canonicalDeletions,
    'canonical deletions'
  );
  const totalLineChanges = additions + deletions;
  const canonicalRawLineChanges = canonicalAdditions + canonicalDeletions;

  if (canonicalRawLineChanges > totalLineChanges) {
    throw new Error('Canonical line changes cannot exceed total pull request changes.');
  }

  const canonicalRecordChanges =
    canonicalRawLineChanges === 0
      ? 0
      : countCanonicalRecordChanges(input.baseCanonicalState, input.headCanonicalState);
  const nonCanonicalLineChanges = totalLineChanges - canonicalRawLineChanges;

  if (nonCanonicalLineChanges > MAX_LINE_CHANGES) {
    return {
      status: 'fail',
      message: `PR too large: ${nonCanonicalLineChanges} non-canonical lines changed (max: ${MAX_LINE_CHANGES}).`,
      totalLineChanges,
      canonicalRawLineChanges,
      canonicalRecordChanges,
      nonCanonicalLineChanges,
    };
  }
  if (canonicalRecordChanges > MAX_CANONICAL_RECORD_CHANGES) {
    return {
      status: 'fail',
      message: `PR canonical Planning DB delta is too large: ${canonicalRecordChanges} canonical records changed (max: ${MAX_CANONICAL_RECORD_CHANGES}).`,
      totalLineChanges,
      canonicalRawLineChanges,
      canonicalRecordChanges,
      nonCanonicalLineChanges,
    };
  }

  const status =
    nonCanonicalLineChanges > LINE_WARNING_THRESHOLD ||
    canonicalRecordChanges > CANONICAL_RECORD_WARNING_THRESHOLD
      ? 'warning'
      : 'pass';
  return {
    status,
    message:
      status === 'warning'
        ? `Large PR: ${nonCanonicalLineChanges} non-canonical lines and ${canonicalRecordChanges} canonical records changed.`
        : `PR size acceptable: ${nonCanonicalLineChanges} non-canonical lines and ${canonicalRecordChanges} canonical records changed.`,
    totalLineChanges,
    canonicalRawLineChanges,
    canonicalRecordChanges,
    nonCanonicalLineChanges,
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

function requireRef(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} is required to classify canonical Planning DB changes.`);
  }
  return value.trim();
}

function runGit(args, exec = execFileSync) {
  return exec('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function readCanonicalDiff(baseRef, headRef, exec = execFileSync) {
  const range = `${baseRef}...${headRef}`;
  const numstat = runGit(['diff', '--numstat', range, '--', CANONICAL_STATE_PATH], exec).trim();
  if (numstat.length === 0) {
    return { canonicalAdditions: 0, canonicalDeletions: 0 };
  }

  const lines = numstat.split(/\r?\n/u);
  if (lines.length !== 1) {
    throw new Error(`Expected one numstat row for ${CANONICAL_STATE_PATH}.`);
  }
  const [rawAdditions, rawDeletions, changedPath] = lines[0].split('\t');
  if (changedPath !== CANONICAL_STATE_PATH) {
    throw new Error(`Unexpected canonical numstat path ${changedPath ?? '<missing>'}.`);
  }
  const canonicalAdditions = parseNonNegativeInteger(rawAdditions, 'canonical additions');
  const canonicalDeletions = parseNonNegativeInteger(rawDeletions, 'canonical deletions');

  let baseCanonicalState;
  let headCanonicalState;
  try {
    baseCanonicalState = JSON.parse(runGit(['show', `${baseRef}:${CANONICAL_STATE_PATH}`], exec));
    headCanonicalState = JSON.parse(runGit(['show', `${headRef}:${CANONICAL_STATE_PATH}`], exec));
  } catch (error) {
    throw new Error(`Cannot read canonical Planning DB state from both refs: ${error.message}`, {
      cause: error,
    });
  }

  return {
    canonicalAdditions,
    canonicalDeletions,
    baseCanonicalState,
    headCanonicalState,
  };
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

    const baseRef = requireRef(env.GIT_BASE, 'GIT_BASE');
    const headRef = requireRef(env.GIT_HEAD, 'GIT_HEAD');
    const canonicalDiff = readCanonicalDiff(baseRef, headRef, deps.execFileSync);
    const result = classifyPullRequestSize({
      additions: env.PR_ADDITIONS ?? '0',
      deletions: env.PR_DELETIONS ?? '0',
      ...canonicalDiff,
    });
    const detail = `Raw total: ${result.totalLineChanges}; non-canonical lines: ${result.nonCanonicalLineChanges}; canonical raw lines: ${result.canonicalRawLineChanges}; canonical records: ${result.canonicalRecordChanges}.`;

    if (result.status === 'fail') {
      logger.error(`${result.message} ${detail}`);
      return 1;
    }
    if (result.status === 'warning') {
      logger.warn(`${result.message} ${detail}`);
      logger.log('PR size within both enforced limits.');
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
