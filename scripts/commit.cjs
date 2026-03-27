#!/usr/bin/env node
'use strict';

/**
 * Usage: node scripts/commit.cjs <type> <scope> "<Subject>" [-- <extra git commit args>]
 * Or:   pnpm commit <type> <scope> "<Subject>"
 *
 * Builds a Conventional Commits message and delegates to `git commit`.
 * Designed for both human and AI agent use — no interactive prompts.
 *
 * Examples:
 *   pnpm commit fix api "Prevent plan-URI leakage to unauthorized callers"
 *   pnpm commit feat engine "Add cancellation support to WorkflowEngine"
 *   pnpm commit chore ci "Upgrade Node to 22.x in workflow files"
 */

const { spawnSync } = require('node:child_process');

const TYPES = [
  'feat', 'fix', 'docs', 'style', 'refactor',
  'perf', 'test', 'build', 'ci', 'chore', 'revert',
];

const SCOPES = [
  'engine', 'adapters', 'temporal', 'conductor', 'state-store',
  'contracts', 'planner', 'docs', 'ci', 'deps', 'release', 'api', 'web',
];

function usage() {
  console.error(`
Usage: pnpm commit <type> <scope> "<Subject>"

  type   — one of: ${TYPES.join(' | ')}
  scope  — one of: ${SCOPES.join(' | ')}
  Subject — sentence-case, no trailing dot, max 100 chars total header

Examples:
  pnpm commit fix api "Prevent plan-URI leakage to unauthorized callers"
  pnpm commit feat engine "Add cancellation support to WorkflowEngine"
  pnpm commit chore ci "Upgrade Node to 22.x in workflow files"
  pnpm commit docs docs "Add how-to-add-tasks guide"
`);
  process.exit(1);
}

const args = process.argv.slice(2);
const extraSep = args.indexOf('--');
const commitArgs = extraSep !== -1 ? args.slice(extraSep + 1) : [];
const positional = extraSep !== -1 ? args.slice(0, extraSep) : args;

const [type, scope, subject] = positional;

if (!type || !scope || !subject) {
  console.error('Error: type, scope and subject are all required.');
  usage();
}

if (!TYPES.includes(type)) {
  console.error(`Error: "${type}" is not a valid type.\nValid types: ${TYPES.join(', ')}`);
  usage();
}

if (!SCOPES.includes(scope)) {
  console.error(`Error: "${scope}" is not a valid scope.\nValid scopes: ${SCOPES.join(', ')}`);
  usage();
}

// Sentence-case: first letter uppercase, rest unchanged
const normalized = subject.charAt(0).toUpperCase() + subject.slice(1);

// Strip trailing dot if present
const clean = normalized.endsWith('.') ? normalized.slice(0, -1) : normalized;

const header = `${type}(${scope}): ${clean}`;

if (header.length > 100) {
  console.error(`Error: header is ${header.length} chars (max 100):\n  ${header}`);
  process.exit(1);
}

console.log(`Committing: ${header}`);

const result = spawnSync('git', ['commit', '-m', header, ...commitArgs], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

process.exit(result.status ?? 1);
