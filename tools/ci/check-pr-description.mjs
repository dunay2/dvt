#!/usr/bin/env node
/**
 * check-pr-description.mjs
 *
 * Enforces a minimum PR description length.
 *
 * Required env vars:
 *   PR_BODY — the pull request body text
 *
 * Exit codes: 0 = pass, 1 = fail
 */

const MIN_LENGTH = 50;
const body = process.env.PR_BODY ?? '';

if (!body || body.trim().length < MIN_LENGTH) {
  console.error(
    `❌ PR description is too short. Please provide a detailed description (min ${MIN_LENGTH} characters).`
  );
  process.exit(1);
}

console.log(`✅ PR description present (${body.trim().length} characters).`);
process.exit(0);
