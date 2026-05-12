#!/usr/bin/env node
/** Owned concern: run the governed PR closeout rail without pre-commit/prepush duplication. */
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const { listLocalChangedFiles, parseGitLines, toPosix } = require('./git-local-changes.cjs');

const repoRoot = path.resolve(__dirname, '..');

function normalizeChangedFiles(changedFiles) {
  return Array.from(new Set(changedFiles.map(toPosix).filter(Boolean))).sort();
}

function hasDocsChange(changedFiles) {
  return changedFiles.some((filePath) => filePath.startsWith('docs/'));
}

function hasWorkspaceSourceChange(changedFiles) {
  return changedFiles.some(
    (filePath) => filePath.startsWith('apps/') || filePath.startsWith('packages/')
  );
}

function hasGovernanceRefreshChange(changedFiles) {
  return changedFiles.some(
    (filePath) =>
      filePath === 'package.json' ||
      filePath === 'AGENTS.md' ||
      filePath.startsWith('scripts/') ||
      filePath.startsWith('tools/ci/') ||
      filePath.startsWith('tools/docs/') ||
      filePath.startsWith('docs/guides/') ||
      filePath.startsWith('docs/runbooks/') ||
      filePath.startsWith('docs/planning/proposals/mandatory/') ||
      filePath.startsWith('docs/planning/status/system-governance-') ||
      filePath === 'docs/planning/status/governance-document-rule-inventory.md' ||
      filePath === 'docs/generated-docs-policy.json'
  );
}

function pushStepOnce(steps, step) {
  if (!steps.some((candidate) => candidate.id === step.id)) {
    steps.push(step);
  }
}

function quoteLabelArg(value) {
  return /\s/u.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}

function commandLabel(step) {
  if (step.commandLine) {
    return step.commandLine;
  }
  return [step.command, ...step.args.map(quoteLabelArg)].join(' ');
}

function commitArgs(commit) {
  return [commit.type, commit.scope, commit.subject];
}

function buildPrCloseoutPlan(options = {}) {
  const changedFiles = normalizeChangedFiles(options.changedFiles || []);
  const stagedFiles = normalizeChangedFiles(options.stagedFiles || []);
  const steps = [];

  if (changedFiles.length === 0) {
    throw new Error('NO_CHANGED_FILES: pr:closeout requires local changes to close.');
  }
  if (!options.stageAll && stagedFiles.length === 0) {
    throw new Error('NO_STAGED_FILES: stage files first or pass --stage-all.');
  }
  if (!options.commit?.type || !options.commit?.scope || !options.commit?.subject) {
    throw new Error('INVALID_COMMIT: usage is pnpm pr:closeout <type> <scope> "<Subject>".');
  }

  if (hasDocsChange(changedFiles)) {
    pushStepOnce(steps, {
      id: 'docs-sync',
      command: 'pnpm',
      args: ['docs:sync'],
    });
  }

  if (hasWorkspaceSourceChange(changedFiles)) {
    pushStepOnce(steps, {
      id: 'docs-status-generate',
      command: 'pnpm',
      args: ['docs:status:generate'],
    });
  }

  if (hasGovernanceRefreshChange(changedFiles)) {
    pushStepOnce(steps, {
      id: 'governance-refresh',
      command: 'pnpm',
      args: ['governance:refresh'],
    });
  }

  for (const [index, check] of (options.checks || []).entries()) {
    pushStepOnce(steps, {
      id: `custom-check-${index + 1}`,
      commandLine: check,
    });
  }

  if (options.stageAll) {
    pushStepOnce(steps, {
      id: 'stage-all',
      command: 'git',
      args: ['add', '-A'],
    });
  }

  pushStepOnce(steps, {
    id: 'commit',
    command: 'pnpm',
    args: ['commit', ...commitArgs(options.commit)],
  });
  pushStepOnce(steps, {
    id: 'verify-prepush',
    command: 'pnpm',
    args: ['verify:prepush'],
  });

  if (options.push) {
    pushStepOnce(steps, {
      id: 'push',
      command: 'git',
      args: ['push'],
    });
  }

  return steps;
}

function resolveExecutable(command) {
  if (process.platform === 'win32' && command === 'pnpm') {
    return 'pnpm.cmd';
  }
  return command;
}

function runCommand(step, options = {}) {
  const spawnCommand = options.spawnCommand || spawnSync;
  const result = step.commandLine
    ? spawnCommand(step.commandLine, [], {
        cwd: options.repoRootPath || repoRoot,
        shell: true,
        stdio: 'inherit',
      })
    : spawnCommand(resolveExecutable(step.command), step.args, {
        cwd: options.repoRootPath || repoRoot,
        shell: false,
        stdio: 'inherit',
      });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${commandLabel(step)} failed with exit code ${result.status || 1}`);
  }
}

function executePrCloseoutPlan(plan, options = {}) {
  for (const step of plan) {
    console.log(`[pr:closeout] ${commandLabel(step)}`);
    runCommand(step, options);
  }
}

function defaultRunGitLines(args, options = {}) {
  const output = execFileSync('git', args, {
    cwd: options.repoRootPath || repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return parseGitLines(output);
}

function listPrCloseoutChangedFiles(options = {}) {
  return listLocalChangedFiles({
    ...options,
    repoRootPath: options.repoRootPath || repoRoot,
    diffFilter: 'ACMRD',
  });
}

function listPrCloseoutStagedFiles(options = {}) {
  const runGitLines = options.runGitLines || defaultRunGitLines;
  try {
    return normalizeChangedFiles(
      runGitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMRD'], {
        repoRootPath: options.repoRootPath || repoRoot,
      })
    );
  } catch {
    return [];
  }
}

function parseArgs(argv) {
  const positional = [];
  const checks = [];
  let dryRun = false;
  let push = false;
  let stageAll = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run' || arg === '--plan') {
      dryRun = true;
      continue;
    }
    if (arg === '--push') {
      push = true;
      continue;
    }
    if (arg === '--stage-all') {
      stageAll = true;
      continue;
    }
    if (arg === '--check') {
      const check = argv[index + 1];
      if (!check) {
        throw new Error('INVALID_CHECK: --check requires a command string.');
      }
      checks.push(check);
      index += 1;
      continue;
    }
    positional.push(arg);
  }

  return {
    commit: {
      type: positional[0],
      scope: positional[1],
      subject: positional[2],
    },
    dryRun,
    push,
    stageAll,
    checks,
  };
}

function printUsage() {
  console.error(`
Usage: pnpm pr:closeout <type> <scope> "<Subject>" [--stage-all] [--push] [--dry-run] [--check "<command>"]

Examples:
  pnpm pr:closeout chore ci "Mechanize PR closeout" --stage-all --push
  pnpm pr:closeout docs docs "Document PR closeout rail" --check "pnpm test:pr-closeout"
`);
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const changedFiles = listPrCloseoutChangedFiles({ repoRootPath: repoRoot });
  const stagedFiles = listPrCloseoutStagedFiles({ repoRootPath: repoRoot });
  const plan = buildPrCloseoutPlan({
    changedFiles,
    stagedFiles,
    commit: args.commit,
    stageAll: args.stageAll,
    push: args.push,
    checks: args.checks,
  });

  console.log('[pr:closeout] changed files:');
  for (const filePath of changedFiles) {
    console.log(`- ${filePath}`);
  }
  console.log('[pr:closeout] staged files:');
  if (stagedFiles.length === 0) {
    console.log('- none');
  } else {
    for (const filePath of stagedFiles) {
      console.log(`- ${filePath}`);
    }
  }
  console.log('[pr:closeout] planned steps:');
  for (const step of plan) {
    console.log(`- ${step.id}: ${commandLabel(step)}`);
  }

  if (args.dryRun) {
    return;
  }

  executePrCloseoutPlan(plan, { repoRootPath: repoRoot });
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[pr:closeout] ${error.message}`);
    if (error.message.startsWith('INVALID_')) {
      printUsage();
    }
    process.exit(1);
  }
}

module.exports = {
  buildPrCloseoutPlan,
  commandLabel,
  executePrCloseoutPlan,
  listPrCloseoutChangedFiles,
  listPrCloseoutStagedFiles,
  parseArgs,
  runCommand,
};
