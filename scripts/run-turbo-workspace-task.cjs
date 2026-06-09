#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const DEFAULT_BASE_REF = 'origin/main';
const DEFAULT_FILTER = `...[${DEFAULT_BASE_REF}]`;
const SUPPORTED_TASKS = new Set(['build', 'lint', 'test', 'typecheck']);
const SAFE_GIT_REF_PATTERN = /^[A-Za-z0-9._/@:+,{}~^-]+$/u;

function resolveDefaultFilter(env = {}) {
  const baseRef = String(env.GIT_BASE || '').trim() || DEFAULT_BASE_REF;
  if (!SAFE_GIT_REF_PATTERN.test(baseRef)) {
    throw new Error(`Unsafe GIT_BASE value for Turbo affected filter: ${baseRef}`);
  }

  return `...[${baseRef}]`;
}

function parseArgs(argv, env = {}) {
  const [task, ...rest] = argv;

  if (!task || !SUPPORTED_TASKS.has(task)) {
    throw new Error(
      `Unsupported Turbo workspace task "${task ?? ''}". Expected one of: ${[
        ...SUPPORTED_TASKS,
      ].join(', ')}`
    );
  }

  let filter = resolveDefaultFilter(env);

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === '--filter') {
      const next = rest[index + 1];
      if (!next) {
        throw new Error('Missing value for --filter');
      }

      filter = next;
      index += 1;
      continue;
    }

    if (arg.startsWith('--filter=')) {
      filter = arg.slice('--filter='.length);
      if (!filter) {
        throw new Error('Missing value for --filter');
      }
      continue;
    }

    throw new Error(`Unsupported argument "${arg}"`);
  }

  return { task, filter };
}

function buildTurboArgs(task, filter) {
  return ['exec', 'turbo', 'run', task, `--filter=${filter}`];
}

function main(argv = process.argv.slice(2), env = process.env) {
  let parsed;

  try {
    parsed = parseArgs(argv, env);
  } catch (error) {
    console.error(`[run-turbo-workspace-task] ${error.message}`);
    return 1;
  }

  const result = spawnSync('pnpm', buildTurboArgs(parsed.task, parsed.filter), {
    shell: true,
    stdio: 'inherit',
    env,
  });

  if (result.error) {
    console.error(`[run-turbo-workspace-task] ${result.error.message}`);
    return 1;
  }

  return result.status ?? 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  DEFAULT_BASE_REF,
  DEFAULT_FILTER,
  SUPPORTED_TASKS,
  buildTurboArgs,
  main,
  parseArgs,
  resolveDefaultFilter,
};
