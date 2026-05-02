#!/usr/bin/env node
/**
 * Owned concern: run the web Cypress browser harness with a clean Electron
 * process environment and deterministic argument forwarding.
 */
import http from 'node:http';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const defaultWebDir = path.join(repoRoot, 'apps', 'web');
const defaultPreviewUrl = 'http://127.0.0.1:4173';

export function createCypressProcessEnv(sourceEnv = process.env) {
  const env = { ...sourceEnv };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

export function parseCypressRunnerArgs(argv) {
  const [firstArg, ...remainingArgs] = argv;

  if (firstArg === 'open') {
    return { mode: 'open', extraArgs: remainingArgs };
  }

  if (firstArg === 'run') {
    return { mode: 'run', extraArgs: remainingArgs };
  }

  return { mode: 'run', extraArgs: argv };
}

export function buildCypressInvocation(parsedArgs, platform = process.platform) {
  return {
    command: platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    args: [
      'exec',
      'cypress',
      parsedArgs.mode,
      '--config-file',
      'cypress.config.ts',
      ...parsedArgs.extraArgs,
    ],
  };
}

function resolvePnpmCommand(platform = process.platform) {
  return platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

export function buildSpawnOptions(options = {}, platform = process.platform) {
  return {
    stdio: 'inherit',
    shell: platform === 'win32',
    ...options,
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, buildSpawnOptions(options));

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited from signal ${signal}`));
        return;
      }

      resolve(code ?? 1);
    });
  });
}

function waitForPreview(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 250;
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const poll = () => {
      const request = http.get(url, (response) => {
        response.resume();

        if (
          response.statusCode !== undefined &&
          response.statusCode >= 200 &&
          response.statusCode < 500
        ) {
          resolve();
          return;
        }

        scheduleNext();
      });

      request.on('error', scheduleNext);
      request.setTimeout(intervalMs, () => {
        request.destroy();
        scheduleNext();
      });
    };

    const scheduleNext = () => {
      if (Date.now() >= deadline) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }

      setTimeout(poll, intervalMs);
    };

    poll();
  });
}

function isPreviewReachable(url, timeoutMs = 500) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(
        response.statusCode !== undefined && response.statusCode >= 200 && response.statusCode < 500
      );
    });

    request.on('error', () => {
      resolve(false);
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy();
      resolve(false);
    });
  });
}

export function buildWindowsProcessTreeKillInvocation(pid) {
  return {
    command: 'taskkill',
    args: ['/PID', String(pid), '/T', '/F'],
  };
}

function stopPreview(child, platform = process.platform) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  if (platform === 'win32' && child.pid !== undefined) {
    const invocation = buildWindowsProcessTreeKillInvocation(child.pid);
    spawnSync(invocation.command, invocation.args, { stdio: 'ignore' });
    return;
  }

  child.kill();
}

export async function runWebCypressNative(options = {}) {
  const webDir = options.webDir ?? defaultWebDir;
  const previewUrl = options.previewUrl ?? defaultPreviewUrl;
  const pnpmCommand = resolvePnpmCommand(options.platform);
  const argv = options.argv ?? process.argv.slice(2);

  const buildExitCode = await runCommand(pnpmCommand, ['build:e2e'], { cwd: webDir });
  if (buildExitCode !== 0) {
    return buildExitCode;
  }

  if (await isPreviewReachable(previewUrl)) {
    throw new Error(
      `Preview URL ${previewUrl} already responds before this runner started. Stop the stale preview process and rerun Cypress.`
    );
  }

  const preview = spawn(pnpmCommand, ['preview:e2e'], {
    ...buildSpawnOptions({ cwd: webDir }),
  });

  try {
    await waitForPreview(previewUrl);

    const cypressInvocation = buildCypressInvocation(
      parseCypressRunnerArgs(argv),
      options.platform
    );
    return await runCommand(cypressInvocation.command, cypressInvocation.args, {
      cwd: webDir,
      env: createCypressProcessEnv(process.env),
    });
  } finally {
    stopPreview(preview, options.platform);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runWebCypressNative()
    .then((code) => {
      process.exit(code);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
