#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const DEFAULT_FILTER = '...[origin/main]';
const SUPPORTED_TASKS = new Set(['build', 'test', 'typecheck']);

function parseArgs(argv) {
  const [task, ...rest] = argv;

  if (!task || !SUPPORTED_TASKS.has(task)) {
    throw new Error(
      `Unsupported Turbo workspace task "${task ?? ''}". Expected one of: ${[
        ...SUPPORTED_TASKS,
      ].join(', ')}`
    );
  }

  let filter = DEFAULT_FILTER;

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
    parsed = parseArgs(argv);
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
  DEFAULT_FILTER,
  SUPPORTED_TASKS,
  buildTurboArgs,
  main,
  parseArgs,
};
