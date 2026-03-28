#!/usr/bin/env node
/**
 * check-pr-size.mjs
 *
 * Enforces a PR size limit. Reads from environment variables set by the caller.
 *
 * Required env vars:
 *   PR_ADDITIONS   — number of lines added
 *   PR_DELETIONS   — number of lines deleted
 *   PR_TITLE       — PR title (checked for skip-size-check override)
 *   PR_LABELS      — JSON array of label names (lower-cased)
 *
 * Exit codes: 0 = pass, 1 = fail (too large), 2 = warning (large but under limit)
 * Note: warnings are printed but the process exits 0 so CI is not blocked.
 */

const MAX_CHANGES = 50_000;
const WARNING_THRESHOLD = 500;

const additions = parseInt(process.env.PR_ADDITIONS ?? '0', 10);
const deletions = parseInt(process.env.PR_DELETIONS ?? '0', 10);
const title = process.env.PR_TITLE ?? '';
const labels = JSON.parse(process.env.PR_LABELS ?? '[]');

const changes = additions + deletions;

if (
  /\[skip-size-check\]/i.test(title) ||
  labels.includes('skip-size-check') ||
  labels.includes('pr-size-exempt')
) {
  console.log('ℹ️ PR size check skipped by override (title or label).');
  process.exit(0);
}

if (changes > MAX_CHANGES) {
  console.error(`❌ PR too large: ${changes} lines changed (max: ${MAX_CHANGES}). Consider splitting into smaller PRs.`);
  process.exit(1);
} else if (changes > WARNING_THRESHOLD) {
  console.warn(`⚠️ Large PR: ${changes} lines changed. Consider splitting if possible.`);
  console.log('✅ PR size within limit.');
  process.exit(0);
} else {
  console.log(`✅ PR size acceptable: ${changes} lines changed.`);
  process.exit(0);
}
