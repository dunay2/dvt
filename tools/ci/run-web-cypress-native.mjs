#!/usr/bin/env node
/**
 * Owned concern: provision the controlled Web preview and require complete Cypress evidence.
 * @baseline GH-3578/GH-3696: complete browser evidence includes retirement of the owned preview.
 * @decision Reuse strict result validation and the existing process-tree lifetime owner.
 * @consequence Acceptance follows awaited cleanup; cancellation and cleanup failures stay visible.
 * @version 1.0.1
 */
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import {
  spawnLiveProofProcess,
  terminateLiveProofProcess,
} from '../../scripts/live-proof-process.cjs';
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

export async function runCypressProof(cypress, options, specs, signal) {
  const keys = ['ELECTRON_RUN_AS_NODE', ...Object.keys(evidenceEnv)];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const clean = createCypressProcessEnv();
  let result;
  try {
    signal?.throwIfAborted();
    for (const key of keys) {
      if (clean[key] === undefined) delete process.env[key];
      else process.env[key] = clean[key];
    }
    const execution = Promise.resolve().then(async () => {
      signal?.throwIfAborted();
      try {
        return await cypress.run(options);
      } catch {
        // Module exceptions may include credentials; cancellation retains its own reason.
        throw new Error('Cypress native execution failed');
      }
    });
    result = await awaitWithSignal(execution, signal);
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

class NativeCommandExitError extends Error {
  constructor(command, exitCode) {
    super(`${command} exited with code ${exitCode}`);
    this.exitCode = exitCode;
  }
}

export function buildSpawnOptions(options = {}, platform = process.platform) {
  return {
    stdio: 'inherit',
    shell: platform === 'win32',
    ...options,
  };
}

async function awaitWithSignal(operation, signal) {
  if (!signal) return operation;
  let onAbort;
  const interrupted = new Promise((_resolve, reject) => {
    onAbort = () => reject(signal.reason);
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([interrupted, operation]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}

async function runOwnedCommand(name, command, args, spawnOptions, options, runtime) {
  options.signal?.throwIfAborted();
  const handle = runtime.spawnLiveProofProcess(
    name,
    command,
    args,
    buildSpawnOptions(spawnOptions, options.platform),
    { platform: options.platform }
  );
  return withOwnedProcess(handle, options, runtime, async () => {
    const { code, signal } = await awaitWithSignal(handle.completion, options.signal);
    if (signal) throw new Error(`${command} exited from signal ${signal}`);
    if (code !== 0) throw new NativeCommandExitError(command, code ?? 1);
    return 0;
  });
}

async function waitForPreview(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 250;
  const deadline = Date.now() + timeoutMs;

  while (!(await isPreviewReachable(url, intervalMs, options.signal))) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${url}`);
    await delay(intervalMs, undefined, { signal: options.signal });
  }
}

function isPreviewReachable(url, timeoutMs = 500, signal) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { signal }, (response) => {
      response.resume();
      resolve(
        response.statusCode !== undefined && response.statusCode >= 200 && response.statusCode < 500
      );
    });

    request.on('error', () => {
      if (signal?.aborted) reject(signal.reason);
      else resolve(false);
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function withOwnedPreview(preview, options, runtime, work) {
  const lifetime = new AbortController();
  const signal = options.signal
    ? AbortSignal.any([options.signal, lifetime.signal])
    : lifetime.signal;
  let observing = true;
  void preview.completion.then(
    ({ code, signal: exitSignal }) => {
      if (observing)
        lifetime.abort(
          new Error(`Native preview exited before completion: exit ${code}, signal ${exitSignal}`)
        );
    },
    (error) => {
      if (observing) lifetime.abort(error);
    }
  );
  return withOwnedProcess(preview, options, runtime, async () => {
    try {
      signal.throwIfAborted();
      const result = await work(signal);
      signal.throwIfAborted();
      return result;
    } finally {
      observing = false;
      lifetime.abort();
    }
  });
}

async function withOwnedProcess(handle, options, runtime, work) {
  let outcome;
  try {
    options.signal?.throwIfAborted();
    outcome = { ok: true, value: await work() };
  } catch (error) {
    outcome = { ok: false, error };
  }
  let cleanup;
  try {
    await runtime.terminateLiveProofProcess(handle, { platform: options.platform });
    cleanup = { ok: true };
  } catch (error) {
    cleanup = { ok: false, error };
  }
  if (outcome.ok && options.signal?.aborted) {
    outcome = { ok: false, error: options.signal.reason };
  }
  if (!cleanup.ok) {
    if (!outcome.ok) {
      throw new AggregateError(
        [outcome.error, cleanup.error],
        'Native operation and process cleanup failed'
      );
    }
    throw cleanup.error;
  }
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}

export async function runWebCypressNative(options = {}, deps = {}) {
  try {
    return await executeNativeCypress(options, deps);
  } catch (error) {
    if (error instanceof NativeCommandExitError) return error.exitCode;
    throw error;
  }
}

async function executeNativeCypress(options, deps) {
  const runtime = {
    spawnLiveProofProcess,
    terminateLiveProofProcess,
    isPreviewReachable,
    waitForPreview,
    ...deps,
  };
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

  options.signal?.throwIfAborted();
  await runOwnedCommand(
    'native-web-build',
    pnpmCommand,
    ['build:e2e'],
    { cwd: webDir },
    options,
    runtime
  );
  options.signal?.throwIfAborted();

  if (await runtime.isPreviewReachable(previewUrl, 500, options.signal)) {
    throw new Error(
      `Preview URL ${previewUrl} already responds before this runner started. Stop the stale preview process and rerun Cypress.`
    );
  }

  options.signal?.throwIfAborted();
  const preview = runtime.spawnLiveProofProcess(
    'native-web-preview',
    pnpmCommand,
    ['preview:e2e'],
    buildSpawnOptions({ cwd: webDir }, options.platform),
    { platform: options.platform }
  );

  const result = await withOwnedPreview(preview, options, runtime, async (signal) => {
    await awaitWithSignal(runtime.waitForPreview(previewUrl, { signal }), signal);
    signal.throwIfAborted();
    if (proof === null) {
      const code = await runOwnedCommand(
        'native-web-open',
        pnpmCommand,
        ['exec', 'cypress', 'open', '--config-file', 'cypress.config.ts', ...parsed.extraArgs],
        { cwd: webDir, env: createCypressProcessEnv() },
        { ...options, signal },
        runtime
      );
      return { code };
    }
    const evidence = await runCypressProof(
      cypress,
      {
        ...proof.options,
        project: webDir,
        configFile: path.join(webDir, 'cypress.config.ts'),
        spec: proof.specs.map((spec) => path.resolve(webDir, spec)).join(','),
      },
      proof.specs,
      signal
    );
    return { code: 0, evidence };
  });
  options.signal?.throwIfAborted();
  if (result.evidence) {
    (deps.log ?? console.log)(
      `[web-cypress-native] Cypress proof: ${result.evidence.passed} passed (${result.evidence.specs.join(',')})`
    );
  }
  return result.code;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const lifetime = new AbortController();
  const interrupt = (signal, exitCode) =>
    lifetime.abort(
      Object.assign(new Error(`Native Cypress interrupted by ${signal}`), { exitCode })
    );
  const onSigint = () => interrupt('SIGINT', 130);
  const onSigterm = () => interrupt('SIGTERM', 143);
  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);
  runWebCypressNative({ signal: lifetime.signal })
    .finally(() => {
      process.off('SIGINT', onSigint);
      process.off('SIGTERM', onSigterm);
    })
    .then((code) => {
      process.exit(code);
    })
    .catch((error) => {
      console.error(error);
      process.exit(error?.exitCode ?? 1);
    });
}
