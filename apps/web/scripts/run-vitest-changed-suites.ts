/**
 * @ownedConcern Adapt changed-file inputs into WebVitestChangedSuiteRouter
 * commands without owning suite taxonomy or CI merge-gate semantics.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { resolveWebVitestChangedSuitePlan } from '../vitest.suites';

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

function readChangedFiles(repoRoot: string): string[] {
  const baseRef = process.env.GIT_BASE || 'origin/main';
  const mergeBase = gitOutput(['merge-base', baseRef, 'HEAD'], repoRoot)[0] ?? baseRef;
  const files = new Set<string>();

  for (const filePath of gitOutput(
    ['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD'],
    repoRoot
  )) {
    files.add(filePath);
  }
  for (const filePath of gitOutput(
    ['diff', '--name-only', '--diff-filter=ACMR', '--cached'],
    repoRoot
  )) {
    files.add(filePath);
  }
  for (const filePath of gitOutput(['diff', '--name-only', '--diff-filter=ACMR'], repoRoot)) {
    files.add(filePath);
  }
  for (const filePath of gitOutput(['ls-files', '--others', '--exclude-standard'], repoRoot)) {
    files.add(filePath);
  }

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

function shouldRunTestDeps(requiresDependencies: boolean): boolean {
  return process.env.CI === 'true' || requiresDependencies;
}

function main(): void {
  const repoRoot = gitOutput(['rev-parse', '--show-toplevel'], process.cwd())[0];
  if (!repoRoot) {
    throw new Error('Unable to resolve repository root.');
  }

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
  for (const command of plan.commands) {
    runCommand(command, webRoot);
  }
}

main();
