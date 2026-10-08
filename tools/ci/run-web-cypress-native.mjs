#!/usr/bin/env node
/**
 * Owned concern: provision the controlled Web preview and require complete Cypress evidence.
 * @baseline GH-3578: browser exit zero alone cannot prove the requested specs ran.
 * @decision Reuse the Module API and shared validator; keep interactive open outside evidence.
 * @consequence Exact batches reject omissions and always restore environment and preview ownership.
 * @version 1.0.0
 */
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  validateCypressProofSpecs,
  validateCypressProofResult,
} from '../../scripts/run-selected-closure-cypress.cjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const defaultWebDir = path.join(repoRoot, 'apps', 'web');
const defaultPreviewUrl = 'http://127.0.0.1:4173';
const require = createRequire(import.meta.url);
const evidenceEnv = Object.fromEntries(
  ['screenshots', 'downloads', 'videos'].map((kind) => [
    `CYPRESS_${kind.toUpperCase()}_FOLDER`,
    path.join(repoRoot, '.dvt/evidence/selected-closure', kind),
  ])
);

export function createCypressProcessEnv(sourceEnv = process.env) {
  const env = { ...evidenceEnv, ...sourceEnv };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

export function parseCypressRunnerArgs(argv) {
  if (argv[0] === '--') argv = argv.slice(1);
  const [firstArg, ...remainingArgs] = argv;

  if (firstArg === 'open') {
    return { mode: 'open', extraArgs: remainingArgs };
  }

  if (firstArg === 'run') {
    return { mode: 'run', extraArgs: remainingArgs };
  }

  return { mode: 'run', extraArgs: argv };
}

async function readCypressProofOptions(cypress, args) {
  let options;
  try {
    options = await cypress.cli.parseRunArguments(['cypress', 'run', ...args]);
  } catch {
    throw new Error('Cypress native arguments are invalid');
  }
  const specs = validateCypressProofSpecs(options.spec?.split(','));
  return { options, specs };
}

export async function runCypressProof(cypress, options, specs) {
  const keys = ['ELECTRON_RUN_AS_NODE', ...Object.keys(evidenceEnv)];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const clean = createCypressProcessEnv();
  let result;
  try {
    for (const key of keys) {
      if (clean[key] === undefined) delete process.env[key];
      else process.env[key] = clean[key];
    }
    result = await cypress.run(options);
  } catch {
    // Module results and exceptions may include credentials; export bounded evidence only.
    throw new Error('Cypress native execution failed');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
  return validateCypressProofResult(result, specs);
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

export async function runWebCypressNative(options = {}, deps = {}) {
  const runtime = { runCommand, spawn, isPreviewReachable, waitForPreview, stopPreview, ...deps };
  const webDir = options.webDir ?? defaultWebDir;
  const previewUrl = options.previewUrl ?? defaultPreviewUrl;
  const pnpmCommand = resolvePnpmCommand(options.platform);
  const argv = options.argv ?? process.argv.slice(2);
  const parsed = parseCypressRunnerArgs(argv);
  const cypress =
    parsed.mode === 'run'
      ? (deps.cypress ?? require(require.resolve('cypress', { paths: [webDir] })))
      : null;
  const proof = cypress === null ? null : await readCypressProofOptions(cypress, parsed.extraArgs);

  const buildExitCode = await runtime.runCommand(pnpmCommand, ['build:e2e'], { cwd: webDir });
  if (buildExitCode !== 0) {
    return buildExitCode;
  }

  if (await runtime.isPreviewReachable(previewUrl)) {
    throw new Error(
      `Preview URL ${previewUrl} already responds before this runner started. Stop the stale preview process and rerun Cypress.`
    );
  }

  const preview = runtime.spawn(pnpmCommand, ['preview:e2e'], {
    ...buildSpawnOptions({ cwd: webDir }),
  });

  try {
    await runtime.waitForPreview(previewUrl);
    if (proof === null) {
      return await runtime.runCommand(
        pnpmCommand,
        ['exec', 'cypress', 'open', '--config-file', 'cypress.config.ts', ...parsed.extraArgs],
        { cwd: webDir, env: createCypressProcessEnv() }
      );
    }
    const evidence = await runCypressProof(
      cypress,
      {
        ...proof.options,
        project: webDir,
        configFile: path.join(webDir, 'cypress.config.ts'),
        spec: proof.specs.map((spec) => path.resolve(webDir, spec)).join(','),
      },
      proof.specs
    );
    (deps.log ?? console.log)(
      `[web-cypress-native] Cypress proof: ${evidence.passed} passed (${evidence.specs.join(',')})`
    );
    return 0;
  } finally {
    runtime.stopPreview(preview, options.platform);
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runWebCypressNative()
    .then((code) => {
      process.exit(code);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
