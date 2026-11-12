/**
 * Owned concern: adapt changed files into governed Web evidence execution.
 * @baseline GH-3540: one router owns both independent evidence obligations.
 * @decision GH-3578/GH-3656: select phase, capability and shard after validating the complete plan.
 * @consequence Every local or hosted execution projection retains complete path admission.
 * @version 1.0.1
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { WEB_CYPRESS_CATALOG_PATH } from '../cypress.catalog';
import { selectWebCypressShard, selectWebCypressLocalReadiness } from '../cypress.changed';
import { resolveWebVitestChangedSuitePlan } from '../vitest/changedPlan';

import { parseChangedSuiteArgs } from './changed-suite-args';
import {
  readChangedFiles,
  readBrowserCatalogSnapshots,
  readGitComparison,
} from './changed-suite-git';
import { selectWebVitestExecutionPartition } from './vitest-execution-partitions';
import { resolveWebEvidenceEnvironment } from './web-evidence-environment';

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
  const comparison = args.files.length > 0 ? undefined : readGitComparison(repoRoot);
  const changedFiles =
    args.files.length > 0 ? args.files : readChangedFiles(repoRoot, { env: comparison });
  const catalogChanged = changedFiles.some((path) => {
    const normalized = path.replaceAll('\\', '/').replace(/^\.\//, '');
    return normalized === WEB_CYPRESS_CATALOG_PATH || normalized === 'cypress.catalog.json';
  });
  const plan = resolveWebVitestChangedSuitePlan(changedFiles, {
    full: args.full,
    catalogSnapshots: catalogChanged
      ? readBrowserCatalogSnapshots(repoRoot, { env: comparison })
      : undefined,
  });
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
  const vitestCommands =
    args.phase === 'browser'
      ? []
      : selectWebVitestExecutionPartition(plan.commandPlan, args.vitestGroup);
  const fullLocal =
    args.phase === 'all' ||
    (args.phase === 'push-readiness' && !['win32', 'linux'].includes(process.platform));
  const browserCommands = plan.browserCommands
    .filter(
      (entry) =>
        args.phase !== 'vitest' &&
        (args.browserCapability === undefined || entry.capability === args.browserCapability)
    )
    .flatMap((entry) =>
      fullLocal && entry.capability === 'controlled'
        ? [1, 2, 3].map((index) => selectWebCypressShard(entry, { index, count: 3 }))
        : args.phase === 'push-readiness'
          ? [selectWebCypressLocalReadiness(entry, process.platform, changedFiles)]
          : [selectWebCypressShard(entry, args.browserShard)]
    )
    .filter((entry) => entry !== undefined);

  if (args.plan) {
    process.stdout.write(`${JSON.stringify({ ...plan, vitestCommands, browserCommands })}\n`);
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `vitest_required=${vitestCommands.length > 0}\n` +
          `browser_required=${browserCommands.length > 0}\n` +
          `provider_required=${browserCommands.some((entry) => entry.capability !== 'controlled')}\n`
      );
    }
    return;
  }

  if (args.phase === 'push-readiness') {
    process.stdout.write(
      `[web:test:changed] admitted ${plan.browserCommands.length} complete browser capabilities; ` +
        `retained ${browserCommands.flatMap((entry) => entry.specPaths).length} local browser specs; hosted acceptance required.\n`
    );
  }

  if (vitestCommands.length === 0 && browserCommands.length === 0) {
    process.stdout.write('[web:test:changed] no web test obligation selected.\n');
    return;
  }

  const browserEnv = resolveWebEvidenceEnvironment(browserCommands, process.env);
  process.stdout.write(`[web:test:changed] suites=${plan.suites.join(',')}\n`);
  if (vitestCommands.length > 0 && shouldRunTestDeps(plan.requiresDependencies)) {
    runCommand('pnpm run test:deps', webRoot);
  }
  for (const entry of vitestCommands) {
    if (entry.kind === 'shell') {
      runCommand(entry.command, webRoot);
    } else {
      runVitestFilesCommand(entry.config, entry.filePaths, webRoot);
    }
  }
  for (const entry of browserCommands) {
    runCommand(entry.command, webRoot, {
      ...browserEnv,
      ...entry.env,
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
