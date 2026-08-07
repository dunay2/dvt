#!/usr/bin/env node
/** Owned concern: run the governed PR closeout rail without pre-commit/prepush duplication. */
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
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
    (filePath) =>
      filePath === 'pnpm-workspace.yaml' ||
      filePath.startsWith('apps/') ||
      filePath.startsWith('packages/')
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
  if (step.internal) {
    return step.label || step.id;
  }
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
      id: 'docs-status-code-state',
      command: 'pnpm',
      args: ['docs:status:generate', '--code-state-only'],
    });
    pushStepOnce(steps, {
      id: 'planning-db-ownership',
      internal: 'capturePlanningDbOwnership',
      label: 'detect Planning DB ownership',
    });
    pushStepOnce(steps, {
      id: 'planning-db-up',
      command: 'pnpm',
      args: ['planning:db:up'],
    });
    pushStepOnce(steps, {
      id: 'planning-db-health',
      command: 'pnpm',
      args: ['planning:db:health', '--wait'],
    });
    pushStepOnce(steps, {
      id: 'planning-db-migrate',
      command: 'pnpm',
      args: ['planning:db:migrate'],
    });
    pushStepOnce(steps, {
      id: 'planning-db-import',
      command: 'pnpm',
      args: ['planning:db:import', '--', '--if-stale'],
    });
    pushStepOnce(steps, {
      id: 'docs-status-repository-map',
      command: 'pnpm',
      args: ['docs:status:generate', '--repository-map-only'],
    });
    pushStepOnce(steps, {
      id: 'planning-db-release',
      internal: 'releasePlanningDbIfOwned',
      label: 'release owned Planning DB',
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
  } else {
    pushStepOnce(steps, {
      id: 'assert-no-unstaged',
      internal: 'assertNoUnstagedChanges',
      label: 'assert no unstaged changes before commit',
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
    args: ['verify:prepush', '--', '--full'],
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

function resolvePnpmCliPath(options = {}) {
  if (options.pnpmCliPath) {
    return options.pnpmCliPath;
  }

  const pathEntries = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  for (const pathEntry of pathEntries) {
    const candidate = path.join(pathEntry, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveCommandInvocation(command, args, options = {}) {
  const platform = options.platform || process.platform;

  if (platform === 'win32' && command === 'pnpm') {
    const pnpmCliPath = resolvePnpmCliPath(options);
    if (!pnpmCliPath) {
      throw new Error('PNPM_CLI_NOT_FOUND: unable to locate pnpm.cjs on PATH.');
    }

    return {
      command: process.execPath,
      args: [pnpmCliPath, ...args],
      shell: false,
    };
  }

  return {
    command: platform === 'win32' ? resolveExecutable(command) : command,
    args,
    shell: false,
  };
}

function listPrCloseoutUnstagedFiles(options = {}) {
  const runGitLines = options.runGitLines || defaultRunGitLines;
  const repoOptions = { repoRootPath: options.repoRootPath || repoRoot };
  const files = new Set();

  for (const filePath of runGitLines(['diff', '--name-only', '--diff-filter=ACMRD'], repoOptions)) {
    files.add(filePath);
  }
  for (const filePath of runGitLines(['ls-files', '--others', '--exclude-standard'], repoOptions)) {
    files.add(filePath);
  }

  return normalizeChangedFiles(Array.from(files));
}

function assertNoUnstagedChanges(options = {}) {
  const listUnstagedFiles = options.listUnstagedFiles || listPrCloseoutUnstagedFiles;
  const unstagedFiles = normalizeChangedFiles(listUnstagedFiles(options));

  if (unstagedFiles.length > 0) {
    throw new Error(
      [
        'UNSTAGED_CHANGES_AFTER_PREP: staged-files mode cannot commit while prep or checks left unstaged files.',
        'Stage the listed files or rerun with --stage-all:',
        ...unstagedFiles.map((filePath) => `- ${filePath}`),
      ].join('\n')
    );
  }
}

function probePlanningDbActive(options = {}) {
  const spawnCommand = options.spawnCommand || spawnSync;
  const invocation = resolveCommandInvocation('pnpm', ['planning:db:health', '--active'], options);
  const result = spawnCommand(invocation.command, invocation.args, {
    cwd: options.repoRootPath || repoRoot,
    shell: invocation.shell,
    stdio: 'ignore',
  });

  return !result.error && result.status === 0;
}

function releasePlanningDbIfOwned(options, runtime) {
  if (!runtime.planningDbOwned || runtime.planningDbReleaseAttempted) {
    return;
  }

  runtime.planningDbReleaseAttempted = true;
  runCommand(
    {
      id: 'planning-db-down',
      command: 'pnpm',
      args: ['planning:db:down'],
    },
    options,
    runtime
  );
}

function runCommand(step, options = {}, runtime = {}) {
  if (step.internal === 'assertNoUnstagedChanges') {
    assertNoUnstagedChanges(options);
    return;
  }
  if (step.internal === 'capturePlanningDbOwnership') {
    const activeProbe = options.probePlanningDbActive || probePlanningDbActive;
    runtime.planningDbOwned = !activeProbe(options);
    runtime.planningDbOwnershipKnown = true;
    return;
  }
  if (step.internal === 'releasePlanningDbIfOwned') {
    releasePlanningDbIfOwned(options, runtime);
    return;
  }

  const spawnCommand = options.spawnCommand || spawnSync;
  const invocation = resolveCommandInvocation(step.command, step.args, options);
  const result = step.commandLine
    ? spawnCommand(step.commandLine, [], {
        cwd: options.repoRootPath || repoRoot,
        shell: true,
        stdio: 'inherit',
      })
    : spawnCommand(invocation.command, invocation.args, {
        cwd: options.repoRootPath || repoRoot,
        shell: invocation.shell,
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
  const runtime = {};
  let executionError;

  try {
    for (const step of plan) {
      console.log(`[pr:closeout] ${commandLabel(step)}`);
      runCommand(step, options, runtime);
    }
  } catch (error) {
    executionError = error;
  }

  let cleanupError;
  if (runtime.planningDbOwned && !runtime.planningDbReleaseAttempted) {
    console.log('[pr:closeout] release owned Planning DB after interrupted closeout');
    try {
      releasePlanningDbIfOwned(options, runtime);
    } catch (error) {
      cleanupError = error;
    }
  }

  if (executionError && cleanupError) {
    throw new AggregateError(
      [executionError, cleanupError],
      `${executionError.message}; Planning DB cleanup also failed: ${cleanupError.message}`
    );
  }
  if (executionError) {
    throw executionError;
  }
  if (cleanupError) {
    throw cleanupError;
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
  listPrCloseoutUnstagedFiles,
  listPrCloseoutChangedFiles,
  listPrCloseoutStagedFiles,
  parseArgs,
  probePlanningDbActive,
  resolveCommandInvocation,
  runCommand,
};
