/**
 * @ownedConcern Adapt changed-file inputs into WebVitestChangedSuiteRouter
 * commands without owning suite taxonomy or CI merge-gate semantics.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { resolveWebVitestChangedSuitePlan } from '../vitest.suites';

type GitOutputRunner = (args: readonly string[], cwd: string) => string[];

type ReadChangedFilesOptions = Readonly<{
  env?: Readonly<Record<string, string | undefined>>;
  gitOutput?: GitOutputRunner;
}>;

function parseExplicitFiles(argv: readonly string[]): string[] {
  const filesFlagIndex = argv.indexOf('--files');
  if (filesFlagIndex === -1) {
    return argv.filter((arg) => !arg.startsWith('--'));
  }

  return argv.slice(filesFlagIndex + 1).filter((arg) => !arg.startsWith('--'));
}

function gitOutput(args: readonly string[], cwd: string): string[] {
  const output = execFileSync('git', [...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function tryGitOutput(
  runGitOutput: GitOutputRunner,
  args: readonly string[],
  cwd: string
): string[] | null {
  try {
    return runGitOutput(args, cwd);
  } catch {
    return null;
  }
}

function addChangedFiles(files: Set<string>, filePaths: readonly string[] | null): void {
  for (const filePath of filePaths ?? []) {
    files.add(filePath);
  }
}

export function readChangedFiles(
  repoRoot: string,
  options: ReadChangedFilesOptions = {}
): string[] {
  const runGitOutput = options.gitOutput ?? gitOutput;
  const env = options.env ?? process.env;
  const baseRef = env.GIT_BASE || 'origin/main';
  const headRef = env.GIT_HEAD || 'HEAD';
  const files = new Set<string>();
  const diffArgs = ['diff', '--name-only', '--diff-filter=ACMR'] as const;
  const directDiffFiles = tryGitOutput(runGitOutput, [...diffArgs, baseRef, headRef], repoRoot);

  if (directDiffFiles !== null) {
    addChangedFiles(files, directDiffFiles);
  } else {
    const mergeBase = tryGitOutput(runGitOutput, ['merge-base', baseRef, headRef], repoRoot)?.[0];
    addChangedFiles(
      files,
      mergeBase === undefined
        ? tryGitOutput(runGitOutput, [...diffArgs, baseRef, 'HEAD'], repoRoot)
        : tryGitOutput(runGitOutput, [...diffArgs, mergeBase, headRef], repoRoot)
    );
  }

  addChangedFiles(files, tryGitOutput(runGitOutput, [...diffArgs, '--cached'], repoRoot));
  addChangedFiles(files, tryGitOutput(runGitOutput, diffArgs, repoRoot));
  addChangedFiles(
    files,
    tryGitOutput(runGitOutput, ['ls-files', '--others', '--exclude-standard'], repoRoot)
  );

  return [...files].sort((left, right) => left.localeCompare(right));
}

function runCommand(command: string, cwd: string): void {
  const result = spawnSync(command, {
    cwd,
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function pnpmInvocation(): { command: string; argsPrefix: string[] } {
  if (process.platform !== 'win32') {
    return { command: 'pnpm', argsPrefix: [] };
  }

  const pnpmHome = process.env.PNPM_HOME || resolve(process.env.APPDATA ?? '', 'npm');
  const pnpmScript = resolve(pnpmHome, 'pnpm.ps1');
  if (existsSync(pnpmScript)) {
    return {
      command: 'powershell.exe',
      argsPrefix: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', pnpmScript],
    };
  }

  return { command: 'pnpm.cmd', argsPrefix: [] };
}

function runVitestFilesCommand(config: string, filePaths: readonly string[], cwd: string): void {
  if (filePaths.length === 0) {
    throw new Error(`Cannot run Vitest config ${config} without file filters.`);
  }

  const pnpm = pnpmInvocation();
  const result = spawnSync(
    pnpm.command,
    [...pnpm.argsPrefix, 'exec', 'vitest', 'run', '--config', config, ...filePaths],
    {
      cwd,
      shell: false,
      stdio: 'inherit',
      env: process.env,
    }
  );

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function shouldRunTestDeps(requiresDependencies: boolean): boolean {
  return process.env.CI === 'true' || requiresDependencies;
}

export function resolveRepositoryRoot(scriptPath: string = fileURLToPath(import.meta.url)): string {
  return resolve(dirname(scriptPath), '..', '..', '..');
}

function main(): void {
  const repoRoot = resolveRepositoryRoot();
  const webRoot = resolve(repoRoot, 'apps/web');
  if (!existsSync(webRoot)) {
    throw new Error(`Unable to resolve web workspace at ${webRoot}.`);
  }

  const explicitFiles = parseExplicitFiles(process.argv.slice(2));
  const changedFiles = explicitFiles.length > 0 ? explicitFiles : readChangedFiles(repoRoot);
  const plan = resolveWebVitestChangedSuitePlan(changedFiles);

  if (plan.commands.length === 0) {
    process.stdout.write('[web:test:changed] no web Vitest suite selected.\n');
    return;
  }

  process.stdout.write(`[web:test:changed] suites=${plan.suites.join(',')}\n`);
  if (shouldRunTestDeps(plan.requiresDependencies)) {
    runCommand('pnpm run test:deps', webRoot);
  }
  for (const entry of plan.commandPlan) {
    if (entry.kind === 'shell') {
      runCommand(entry.command, webRoot);
    } else {
      runVitestFilesCommand(entry.config, entry.filePaths, webRoot);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
