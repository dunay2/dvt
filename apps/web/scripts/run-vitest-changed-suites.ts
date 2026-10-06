/**
 * Owned concern: adapt changed files into governed Web evidence execution.
 * @baseline GH-3540: one router owns both independent evidence obligations.
 * @decision GH-3583: select an execution phase only after resolving the complete plan.
 * @consequence Local execution remains complete; CI phases cannot hide invalid paths.
 * @version 1.0.0
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { resolveWebVitestChangedSuitePlan } from '../vitest.suites';

type GitOutputRunner = (args: readonly string[], cwd: string) => string[];
type WebEvidencePhase = 'all' | 'vitest' | 'browser';

type ChangedSuiteArgs = Readonly<{
  plan: boolean;
  full: boolean;
  phase: WebEvidencePhase;
  files: readonly string[];
}>;

const WEB_EVIDENCE_PHASES: ReadonlyMap<string, WebEvidencePhase> = new Map([
  ['--phase=vitest', 'vitest'],
  ['--phase=browser', 'browser'],
]);

type ReadChangedFilesOptions = Readonly<{
  env?: Readonly<Record<string, string | undefined>>;
  gitOutput?: GitOutputRunner;
}>;

export function parseChangedSuiteArgs(argv: readonly string[]): ChangedSuiteArgs {
  const flags = new Set<string>();
  const files: string[] = [];
  let phase: WebEvidencePhase = 'all';
  for (const arg of argv) {
    if (arg === '--') continue;
    if (!arg.startsWith('--')) {
      files.push(arg);
      continue;
    }
    const selectedPhase = WEB_EVIDENCE_PHASES.get(arg);
    const flag = selectedPhase === undefined ? arg : '--phase';
    if (
      (selectedPhase === undefined && !['--plan', '--full', '--files'].includes(arg)) ||
      flags.has(flag)
    ) {
      throw new Error(`Invalid or repeated changed-suite argument: ${arg}`);
    }
    flags.add(flag);
    phase = selectedPhase ?? phase;
  }
  const plan = flags.has('--plan');
  const full = flags.has('--full');
  if ((full && !plan && phase !== 'browser') || (flags.has('--files') && files.length === 0)) {
    throw new Error(
      'Use --phase=browser with --full alongside the full Vitest gate; --files requires paths.'
    );
  }
  return { plan, full, phase, files };
}

function gitOutput(args: readonly string[], cwd: string): string[] {
  const output = execFileSync('git', [...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  return output.split('\0').filter((line) => line.length > 0);
}

export function readChangedFiles(
  repoRoot: string,
  options: ReadChangedFilesOptions = {}
): string[] {
  const runGitOutput = options.gitOutput ?? gitOutput;
  const env = options.env ?? process.env;
  const baseRef = env.GIT_BASE || 'origin/main';
  const headRef = env.GIT_HEAD || 'HEAD';
  const diffArgs = ['diff', '--name-only', '--no-renames', '-z'] as const;
  const files = new Set([
    ...runGitOutput([...diffArgs, baseRef, headRef], repoRoot),
    ...runGitOutput([...diffArgs, '--cached'], repoRoot),
    ...runGitOutput(diffArgs, repoRoot),
    ...runGitOutput(['ls-files', '-z', '--others', '--exclude-standard'], repoRoot),
  ]);
  return [...files].sort((left, right) => left.localeCompare(right));
}

function runCommand(command: string, cwd: string, env = process.env): void {
  const result = spawnSync(command, {
    cwd,
    shell: true,
    stdio: 'inherit',
    env,
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

export function main(argv: readonly string[] = process.argv.slice(2)): void {
  const repoRoot = resolveRepositoryRoot();
  const webRoot = resolve(repoRoot, 'apps/web');
  if (!existsSync(webRoot)) {
    throw new Error(`Unable to resolve web workspace at ${webRoot}.`);
  }

  const args = parseChangedSuiteArgs(argv);
  const changedFiles = args.files.length > 0 ? args.files : readChangedFiles(repoRoot);
  const plan = resolveWebVitestChangedSuitePlan(changedFiles, { full: args.full });
  for (const path of plan.browserFiles) {
    if (!existsSync(resolve(repoRoot, path))) {
      throw new Error(`Browser evidence requires an existing consumer or helper: ${path}`);
    }
  }
  for (const path of plan.retiredBrowserFiles) {
    if (existsSync(resolve(repoRoot, path))) {
      throw new Error(`Retired browser evidence must remain absent: ${path}`);
    }
  }

  if (args.plan) {
    process.stdout.write(`${JSON.stringify(plan)}\n`);
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `browser_required=${plan.browserCommands.length > 0}\n`
      );
    }
    return;
  }

  if (plan.commands.length === 0 && plan.browserCommands.length === 0) {
    process.stdout.write('[web:test:changed] no web test obligation selected.\n');
    return;
  }

  process.stdout.write(`[web:test:changed] suites=${plan.suites.join(',')}\n`);
  if (
    args.phase !== 'browser' &&
    plan.commands.length > 0 &&
    shouldRunTestDeps(plan.requiresDependencies)
  ) {
    runCommand('pnpm run test:deps', webRoot);
  }
  for (const entry of args.phase === 'browser' ? [] : plan.commandPlan) {
    if (entry.kind === 'shell') {
      runCommand(entry.command, webRoot);
    } else {
      runVitestFilesCommand(entry.config, entry.filePaths, webRoot);
    }
  }
  for (const entry of args.phase === 'vitest' ? [] : plan.browserCommands) {
    runCommand(entry.command, webRoot, {
      ...process.env,
      ...entry.env,
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
