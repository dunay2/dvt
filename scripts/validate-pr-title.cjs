#!/usr/bin/env node
/**
 * Validates that a PR title follows the Conventional Commits format enforced
 * by the `Check PR title follows Conventional Commits` step in pr-quality-gate.yml
 * (amannn/action-semantic-pull-request v6).
 *
 * Usage:
 *   node scripts/validate-pr-title.cjs "<title>"
 *   pnpm pr:validate-title "<title>"
 *
 * Exit 0 — title is valid, safe to pass to `gh pr create --title`.
 * Exit 1 — title is invalid, prints reason and examples.
 *
 * Rules mirror pr-quality-gate.yml exactly:
 *   - type is required, must be one of TYPES
 *   - scope is optional: (scope) or omitted
 *   - subject must start with an uppercase character
 *   - total header must not exceed 100 characters
 */

'use strict';

// Must match pr-quality-gate.yml `types` list.
const TYPES = [
  'feat', 'fix', 'docs', 'style', 'refactor',
  'perf', 'test', 'chore', 'ci', 'build', 'revert',
];

const MAX_HEADER_LENGTH = 100;

// Conventional Commits header: type(scope?): Subject
// scope is optional; subject must start with uppercase.
const HEADER_RE = /^([a-z]+)(?:\(([^)]+)\))?!?: ([A-Z].+)$/;

function validate(title) {
  const errors = [];

  if (!title || !title.trim()) {
    errors.push('Title is empty.');
    return errors;
  }

  if (title.length > MAX_HEADER_LENGTH) {
    errors.push(
      `Title is ${title.length} chars (max ${MAX_HEADER_LENGTH}): "${title}"`
    );
  }

  const match = HEADER_RE.exec(title.trim());
  if (!match) {
    errors.push(
      'Title does not match Conventional Commits format: <type>(scope?): <Subject starting with uppercase>'
    );
    return errors;
  }

  const [, type, , subject] = match;

  if (!TYPES.includes(type)) {
    errors.push(
      `Unknown type "${type}". Allowed: ${TYPES.join(', ')}`
    );
  }

  if (!/^[A-Z]/.test(subject)) {
    errors.push('Subject must start with an uppercase character.');
  }

  return errors;
}

function usage() {
  console.error(`
Usage: node scripts/validate-pr-title.cjs "<title>"
       pnpm pr:validate-title "<title>"

  type    — one of: ${TYPES.join(' | ')}
  scope   — optional, e.g. (api) or (adapters)
  Subject — must start with uppercase, total header max ${MAX_HEADER_LENGTH} chars

Examples:
  pnpm pr:validate-title "fix(api): Resolve staleness alias mismatch"
  pnpm pr:validate-title "feat(engine): Add cancellation support"
  pnpm pr:validate-title "chore: Upgrade pnpm action to v5"
`);
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const title = args[0];

if (!title) {
  console.error('Error: PR title argument is required.');
  usage();
  process.exit(1);
}

const errors = validate(title);

if (errors.length > 0) {
  console.error('PR title validation failed:');
  for (const err of errors) {
    console.error(`  • ${err}`);
  }
  usage();
  process.exit(1);
}

console.log(`✓ PR title is valid: "${title}"`);
process.exit(0);
