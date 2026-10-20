/**
 * Owned concern: prove native browser orchestration accepts only complete structured evidence.
 * @baseline GH-3578: CLI success does not exclude skipped or omitted browser tests.
 * @decision Reuse exact result validation and inject only process/module boundaries.
 * @consequence Tests prove cleanup and environment restoration without booting a browser.
 * @version 1.0.0
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { getEventListeners, once } from 'node:events';
import path from 'node:path';
import test from 'node:test';

import {
  buildSpawnOptions,
  createCypressProcessEnv,
  parseCypressRunnerArgs,
  runCypressProof,
  runWebCypressNative,
} from './run-web-cypress-native.mjs';
import {
  spawnLiveProofProcess,
  terminateLiveProofProcess,
} from '../../scripts/live-proof-process.cjs';

test('native Cypress runner removes ELECTRON_RUN_AS_NODE before spawning Cypress', () => {
  const source = Object.freeze({
    ELECTRON_RUN_AS_NODE: '1',
    PATH: 'C:/example',
  });
  const env = createCypressProcessEnv(source);

  assert.equal(env.ELECTRON_RUN_AS_NODE, undefined);
  assert.equal(env.PATH, 'C:/example');
  assert.equal(source.ELECTRON_RUN_AS_NODE, '1');
  for (const kind of ['screenshots', 'downloads', 'videos']) {
    assert.equal(
      env[`CYPRESS_${kind.toUpperCase()}_FOLDER`],
      path.resolve('.dvt/evidence/selected-closure', kind)
    );
  }
  assert.equal(
    createCypressProcessEnv({ CYPRESS_SCREENSHOTS_FOLDER: 'custom' }).CYPRESS_SCREENSHOTS_FOLDER,
    'custom'
  );
});

test('native Cypress runner forwards spec args to Cypress run', () => {
  const parsed = parseCypressRunnerArgs([
    '--spec',
    'cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
  ]);

  assert.deepEqual(parsed, {
    mode: 'run',
    extraArgs: ['--spec', 'cypress/e2e/canvas/canvas-draft-access-posture.cy.ts'],
  });

  assert.deepEqual(parseCypressRunnerArgs(['--', ...parsed.extraArgs]), parsed);
});

test('native Cypress runner supports interactive open without claiming test evidence', async () => {
  const fixture = runnerFixture();
  const code = await runWebCypressNative(
    { argv: ['open', '--browser', 'chrome'], platform: 'linux' },
    fixture.deps
  );
  assert.equal(code, 0);
  assert.deepEqual(fixture.events, [
    'build',
    'build-stop',
    'probe',
    'spawn',
    'ready',
    'open',
    'open-stop',
    'stop',
  ]);
  assert.deepEqual(fixture.commands[1].args, [
    'exec',
    'cypress',
    'open',
    '--config-file',
    'cypress.config.ts',
    '--browser',
    'chrome',
  ]);
  assert.equal(fixture.messages.length, 0);
});

const specs = [
  'cypress/e2e/canvas/canvas-model-session.cy.ts',
  'cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
];
const proof = () => ({
  totalTests: 2,
  totalPassed: 2,
  totalFailed: 0,
  totalPending: 0,
  totalSkipped: 0,
  runs: specs.map((relative) => ({
    spec: { relative },
    error: null,
    stats: { tests: 1, passes: 1, failures: 0, pending: 0, skipped: 0 },
    tests: [{ state: 'passed' }],
  })),
  config: { env: { token: 'must-not-escape' } },
});

function runnerFixture(parsedOptions = { spec: specs.join(',') }, execute = async () => proof()) {
  const events = [],
    commands = [],
    messages = [];
  const lifecycle = deferred();
  const preview = { child: {}, completion: lifecycle.promise };
  const build = { child: {}, completion: Promise.resolve({ code: 0, signal: null }) };
  const open = { child: {}, completion: Promise.resolve({ code: 0, signal: null }) };
  const deps = {
    cypress: {
      cli: {
        parseRunArguments: async (args) => {
          events.push('parse');
          assert.deepEqual(args.slice(0, 2), ['cypress', 'run']);
          return parsedOptions;
        },
      },
      run: async (options) => {
        events.push('run');
        return execute(options);
      },
    },
    isPreviewReachable: async () => {
      events.push('probe');
      return false;
    },
    spawnLiveProofProcess: (name, command, args, options) => {
      if (name === 'native-web-preview') {
        events.push('spawn');
        return preview;
      }
      commands.push({ command, args, options });
      events.push(name === 'native-web-build' ? 'build' : 'open');
      return name === 'native-web-build' ? build : open;
    },
    waitForPreview: async () => {
      events.push('ready');
    },
    terminateLiveProofProcess: (child) => {
      assert.ok([build, open, preview].includes(child));
      events.push(child === build ? 'build-stop' : child === open ? 'open-stop' : 'stop');
    },
    log: (message) => messages.push(message),
  };
  return { deps, events, commands, messages, lifecycle, preview, build, open };
}

test('native run validates a complete literal batch independently of caller cwd and always cleans preview', async () => {
  const originalCwd = process.cwd();
  const webDir = path.resolve('apps/web');
  const parsed = {
    spec: specs.join(','),
    browser: 'chrome',
    headed: true,
    config: 'video=false,screenshotsFolder=custom',
  };
  try {
    for (const cwd of [originalCwd, webDir]) {
      process.chdir(cwd);
      const fixture = runnerFixture(parsed, async (options) => {
        assert.equal(options.project, webDir);
        assert.equal(options.configFile, path.join(webDir, 'cypress.config.ts'));
        assert.equal(options.config, parsed.config, 'explicit config is not replaced');
        assert.equal(options.browser, 'chrome');
        assert.equal(options.headed, true);
        assert.equal(options.spec, specs.map((spec) => path.resolve(webDir, spec)).join(','));
        return proof();
      });
      assert.equal(
        await runWebCypressNative({ argv: ['run', '--spec', parsed.spec] }, fixture.deps),
        0
      );
      assert.deepEqual(fixture.events, [
        'parse',
        'build',
        'build-stop',
        'probe',
        'spawn',
        'ready',
        'run',
        'stop',
      ]);
      assert.match(fixture.messages[0], /2 passed/);
      assert.doesNotMatch(JSON.stringify(fixture.messages), /must-not-escape|token/);
    }
  } finally {
    process.chdir(originalCwd);
  }
});

test('native run rejects malformed or missing spec selection before build or browser', async () => {
  for (const value of [
    undefined,
    '',
    `${specs[0]},${specs[0]}`,
    `${specs[0]},`,
    'cypress/e2e/**/*.cy.ts',
  ]) {
    const fixture = runnerFixture({ spec: value });
    await assert.rejects(runWebCypressNative({ argv: [] }, fixture.deps), /literal Cypress spec/);
    assert.deepEqual(fixture.events, ['parse']);
  }
  const fixture = runnerFixture();
  fixture.deps.cypress.cli.parseRunArguments = async () => {
    throw new Error('unknown option secret');
  };
  await assert.rejects(
    runWebCypressNative({ argv: ['--unknown'] }, fixture.deps),
    /^Error: Cypress native arguments are invalid$/
  );
  assert.equal(fixture.commands.length, 0);
});

test('native run rejects incomplete evidence and cleans preview on module or readiness failure', async () => {
  for (const failure of ['result', 'execution', 'readiness']) {
    const fixture = runnerFixture();
    if (failure === 'result')
      fixture.deps.cypress.run = async () => ({ ...proof(), totalSkipped: 1 });
    if (failure === 'execution')
      fixture.deps.cypress.run = async () => {
        throw new Error('secret');
      };
    if (failure === 'readiness')
      fixture.deps.waitForPreview = async () => {
        throw new Error('not ready');
      };
    await assert.rejects(
      runWebCypressNative({ argv: ['--spec', specs.join(',')] }, fixture.deps),
      failure === 'result'
        ? /Cypress proof/
        : failure === 'execution'
          ? /^Error: Cypress native execution failed$/
          : /not ready/
    );
    assert.equal(fixture.events.at(-1), 'stop');
    assert.equal(fixture.messages.length, 0);
  }
});

test('native module restores scoped process environment after success, rejection and execution failure', async (t) => {
  const keys = [
    'ELECTRON_RUN_AS_NODE',
    'CYPRESS_SCREENSHOTS_FOLDER',
    'CYPRESS_DOWNLOADS_FOLDER',
    'CYPRESS_VIDEOS_FOLDER',
  ];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  process.env.ELECTRON_RUN_AS_NODE = '1';
  delete process.env.CYPRESS_SCREENSHOTS_FOLDER;
  process.env.CYPRESS_DOWNLOADS_FOLDER = 'custom-downloads';
  const before = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const outcome of ['pass', 'skip', 'throw']) {
    const execute = runCypressProof(
      {
        run: async () => {
          assert.equal(process.env.ELECTRON_RUN_AS_NODE, undefined);
          assert.equal(
            process.env.CYPRESS_SCREENSHOTS_FOLDER,
            path.resolve('.dvt/evidence/selected-closure/screenshots')
          );
          assert.equal(process.env.CYPRESS_DOWNLOADS_FOLDER, 'custom-downloads');
          if (outcome === 'throw') throw new Error('secret');
          return { ...proof(), totalSkipped: outcome === 'skip' ? 1 : 0 };
        },
      },
      {},
      specs
    );
    if (outcome === 'pass') assert.deepEqual(await execute, { specs, tests: 2, passed: 2 });
    else
      await assert.rejects(
        execute,
        outcome === 'skip' ? /Cypress proof/ : /^Error: Cypress native execution failed$/
      );
    assert.deepEqual(Object.fromEntries(keys.map((key) => [key, process.env[key]])), before);
  }
});

test('native Cypress runner uses a Windows shell for pnpm command shims', () => {
  assert.deepEqual(buildSpawnOptions({ cwd: 'apps/web' }, 'win32'), {
    stdio: 'inherit',
    shell: true,
    cwd: 'apps/web',
  });

  assert.deepEqual(buildSpawnOptions({ cwd: 'apps/web' }, 'linux'), {
    stdio: 'inherit',
    shell: false,
    cwd: 'apps/web',
  });
});

test('native Cypress runner delegates Windows command and preview ownership to the shared process gateway', async () => {
  const fixture = runnerFixture();
  const spawnOwned = fixture.deps.spawnLiveProofProcess;
  fixture.deps.spawnLiveProofProcess = (name, command, args, options, dependencies) => {
    assert.equal(command, 'pnpm.cmd');
    assert.deepEqual(args, name === 'native-web-build' ? ['build:e2e'] : ['preview:e2e']);
    assert.equal(options.shell, true);
    assert.equal(options.stdio, 'inherit');
    assert.equal(dependencies.platform, 'win32');
    return spawnOwned(name, command, args, options);
  };
  fixture.deps.terminateLiveProofProcess = async (handle, options) => {
    assert.ok([fixture.build, fixture.preview].includes(handle));
    assert.equal(options.platform, 'win32');
  };
  assert.equal(await runWebCypressNative({ platform: 'win32' }, fixture.deps), 0);
});

test('native Cypress runner can be imported when Node does not provide argv[1]', () => {
  const result = spawnSync(
    process.execPath,
    ['-e', "process.argv.splice(1); import('./tools/ci/run-web-cypress-native.mjs')"],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    }
  );

  assert.equal(result.status, 0, result.stderr);
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const nextTurn = () => new Promise((resolve) => setImmediate(resolve));

test('native run awaits preview cleanup before resolving or publishing acceptance', async () => {
  const fixture = runnerFixture();
  const cleanup = deferred();
  fixture.deps.terminateLiveProofProcess = (handle) =>
    handle === fixture.preview ? cleanup.promise : undefined;
  let settled = false;
  const result = runWebCypressNative({}, fixture.deps).finally(() => {
    settled = true;
  });
  try {
    await nextTurn();
    assert.equal(settled, false);
    assert.deepEqual(fixture.messages, []);
  } finally {
    cleanup.resolve();
  }
  assert.equal(await result, 0);
  assert.match(fixture.messages[0], /2 passed/);
});

test('native run rejects cleanup failure instead of publishing success', async () => {
  const fixture = runnerFixture();
  const failure = new Error('owned preview remains alive');
  fixture.deps.terminateLiveProofProcess = (handle) =>
    handle === fixture.preview ? { then: (_resolve, reject) => reject(failure) } : undefined;
  await assert.rejects(runWebCypressNative({}, fixture.deps), (error) => error === failure);
  assert.deepEqual(fixture.messages, []);
});

test('native run retains readiness and cleanup failures together', async () => {
  const fixture = runnerFixture();
  const readinessFailure = new Error('preview unavailable');
  const cleanupFailure = new Error('preview cannot be terminated');
  fixture.deps.waitForPreview = async () => {
    throw readinessFailure;
  };
  fixture.deps.terminateLiveProofProcess = (handle) =>
    handle === fixture.preview ? { then: (_resolve, reject) => reject(cleanupFailure) } : undefined;
  await assert.rejects(runWebCypressNative({}, fixture.deps), (error) => {
    assert.ok(error instanceof AggregateError);
    assert.deepEqual(error.errors, [readinessFailure, cleanupFailure]);
    return true;
  });
  assert.deepEqual(fixture.messages, []);
});

test('native run preserves a sanitized browser failure alongside cleanup failure', async () => {
  const fixture = runnerFixture(undefined, async () => {
    throw new Error('private browser configuration');
  });
  const cleanupFailure = new Error('preview cleanup failed');
  fixture.deps.terminateLiveProofProcess = async (handle) => {
    if (handle === fixture.preview) throw cleanupFailure;
  };
  await assert.rejects(runWebCypressNative({}, fixture.deps), (error) => {
    assert.ok(error instanceof AggregateError);
    assert.equal(error.errors[0].message, 'Cypress native execution failed');
    assert.equal(error.errors[1], cleanupFailure);
    return true;
  });
  assert.deepEqual(fixture.messages, []);
});

test('native run observes early preview exit and spawn rejection without waiting for readiness', async () => {
  for (const event of ['exit', 'error']) {
    const fixture = runnerFixture();
    let readinessSignal;
    fixture.deps.waitForPreview = async (_url, { signal }) => {
      readinessSignal = signal;
      await new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      );
    };
    const failure = new Error('preview executable unavailable');
    const result = runWebCypressNative({}, fixture.deps);
    const assertion = assert.rejects(
      result,
      event === 'error' ? (error) => error === failure : /Native preview exited.*exit 1/
    );
    await nextTurn();
    if (event === 'error') fixture.lifecycle.reject(failure);
    else fixture.lifecycle.resolve({ code: 1, signal: null });
    await assertion;
    assert.equal(readinessSignal.aborted, true);
    assert.equal(fixture.events.at(-1), 'stop');
    assert.deepEqual(fixture.messages, []);
  }
});

test('native run never cleans an unowned preview on build, stale preview or synchronous spawn failure', async () => {
  for (const phase of ['build', 'stale', 'spawn']) {
    const fixture = runnerFixture();
    const failure = new Error('spawn failed synchronously');
    if (phase === 'build') fixture.build.completion = Promise.resolve({ code: 17, signal: null });
    if (phase === 'stale') fixture.deps.isPreviewReachable = async () => true;
    if (phase === 'spawn') {
      const spawnOwned = fixture.deps.spawnLiveProofProcess;
      fixture.deps.spawnLiveProofProcess = (name, ...args) => {
        if (name === 'native-web-preview') throw failure;
        return spawnOwned(name, ...args);
      };
    }
    if (phase === 'build') assert.equal(await runWebCypressNative({}, fixture.deps), 17);
    else
      await assert.rejects(
        runWebCypressNative({}, fixture.deps),
        phase === 'spawn' ? (error) => error === failure : /already responds/
      );
    assert.equal(fixture.events.includes('stop'), false);
    assert.deepEqual(fixture.messages, []);
  }
});

test('native run cancellation retires owned preview and cannot publish late browser acceptance', async () => {
  for (const phase of ['readiness', 'browser']) {
    const pending = deferred();
    const fixture = runnerFixture(undefined, () => pending.promise);
    if (phase === 'readiness') fixture.deps.waitForPreview = () => pending.promise;
    const controller = new AbortController();
    const failure = new Error(`interrupted during ${phase}`);
    const result = runWebCypressNative({ signal: controller.signal }, fixture.deps);
    const assertion = assert.rejects(result, (error) => error === failure);
    await nextTurn();
    controller.abort(failure);
    await assertion;
    assert.equal(fixture.events.at(-1), 'stop');
    assert.equal(fixture.events.filter((event) => event === 'stop').length, 1);
    assert.deepEqual(fixture.messages, []);
    pending.resolve(proof());
    await nextTurn();
    assert.deepEqual(fixture.messages, []);
    if (phase === 'readiness') assert.equal(fixture.events.includes('run'), false);
  }
});

test('native cancellation restores scoped environment immediately and late browser completion cannot overwrite it', async (t) => {
  const keys = [
    'ELECTRON_RUN_AS_NODE',
    'CYPRESS_SCREENSHOTS_FOLDER',
    'CYPRESS_DOWNLOADS_FOLDER',
    'CYPRESS_VIDEOS_FOLDER',
  ];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  process.env.ELECTRON_RUN_AS_NODE = '1';
  delete process.env.CYPRESS_SCREENSHOTS_FOLDER;
  process.env.CYPRESS_DOWNLOADS_FOLDER = 'before-cancellation';
  const before = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const pending = deferred();
  const fixture = runnerFixture(undefined, () => pending.promise);
  let browserSignal;
  fixture.deps.waitForPreview = async (_url, { signal }) => {
    browserSignal = signal;
  };
  const controller = new AbortController();
  const reason = new Error('cancel pending browser');
  const result = runWebCypressNative({ signal: controller.signal }, fixture.deps);
  const assertion = assert.rejects(result, (error) => error === reason);
  try {
    await nextTurn();
    assert.equal(process.env.ELECTRON_RUN_AS_NODE, undefined);
    controller.abort(reason);
    await assertion;
    assert.equal(getEventListeners(browserSignal, 'abort').length, 0);
    assert.deepEqual(Object.fromEntries(keys.map((key) => [key, process.env[key]])), before);
    for (const key of keys) process.env[key] = `new-owner:${key}`;
    const after = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    pending.resolve(proof());
    await nextTurn();
    assert.deepEqual(Object.fromEntries(keys.map((key) => [key, process.env[key]])), after);
    assert.deepEqual(fixture.messages, []);
  } finally {
    pending.resolve(proof());
    await nextTurn();
  }
});

test('native run rejects interruption received while cleanup is pending and retains cleanup errors', async () => {
  for (const cleanupFails of [false, true]) {
    const fixture = runnerFixture();
    const cleanup = deferred();
    fixture.deps.terminateLiveProofProcess = (handle) =>
      handle === fixture.preview ? cleanup.promise : undefined;
    const controller = new AbortController();
    const interrupted = new Error('interrupted during cleanup');
    const cleanupFailure = new Error('preview still alive');
    const result = runWebCypressNative({ signal: controller.signal }, fixture.deps);
    const assertion = assert.rejects(result, (error) => {
      if (cleanupFails) {
        assert.ok(error instanceof AggregateError);
        assert.deepEqual(error.errors, [interrupted, cleanupFailure]);
      } else assert.equal(error, interrupted);
      return true;
    });
    await nextTurn();
    controller.abort(interrupted);
    if (cleanupFails) cleanup.reject(cleanupFailure);
    else cleanup.resolve();
    await assertion;
    assert.deepEqual(fixture.messages, []);
  }
});

test('native run does not acquire processes after cancellation before build', async () => {
  const fixture = runnerFixture();
  const controller = new AbortController();
  const failure = new Error('cancelled before process ownership');
  controller.abort(failure);
  await assert.rejects(
    runWebCypressNative({ signal: controller.signal }, fixture.deps),
    (error) => error === failure
  );
  assert.deepEqual(fixture.events, ['parse']);
});

for (const phase of ['build', 'open']) {
  for (const failedCleanup of [null, phase, ...(phase === 'open' ? ['preview'] : [])]) {
    test(`native ${phase} retains unsuccessful exit with ${failedCleanup ?? 'successful'} cleanup`, async () => {
      const fixture = runnerFixture();
      const cleanupFailure = new Error(`${phase} cleanup failed after exit 17`);
      fixture[phase].completion = Promise.resolve({ code: 17, signal: null });
      const terminateOwned = fixture.deps.terminateLiveProofProcess;
      fixture.deps.terminateLiveProofProcess = async (handle) => {
        if (handle === fixture[failedCleanup]) throw cleanupFailure;
        terminateOwned(handle);
      };
      const result = runWebCypressNative({ argv: phase === 'open' ? ['open'] : [] }, fixture.deps);
      if (failedCleanup)
        await assert.rejects(result, (error) => {
          assert.ok(error instanceof AggregateError);
          assert.equal(error.errors[0].exitCode, 17);
          assert.match(error.errors[0].message, /exited with code 17/);
          assert.equal(error.errors[1], cleanupFailure);
          return true;
        });
      else assert.equal(await result, 17);
      if (phase === 'open' && failedCleanup !== 'preview')
        assert.equal(fixture.events.at(-1), 'stop');
      assert.deepEqual(fixture.messages, []);
    });
  }

  test(`native cancellation waits for pending ${phase} command cleanup before returning`, async () => {
    for (const cleanupFails of [false, true]) {
      const fixture = runnerFixture();
      const pending = deferred();
      const cleanup = deferred();
      const controller = new AbortController();
      const reason = new Error(`cancel pending ${phase}`);
      const cleanupFailure = new Error(`${phase} cleanup failed`);
      const command = { child: {}, completion: pending.promise };
      const retired = [];
      let cleanupStarted = false;
      let settled = false;
      fixture.deps.spawnLiveProofProcess = (name) => {
        if (name === `native-web-${phase}`) return command;
        if (name === 'native-web-build')
          return { child: {}, completion: Promise.resolve({ code: 0, signal: null }) };
        return fixture.preview;
      };
      fixture.deps.terminateLiveProofProcess = async (handle) => {
        if (handle === command) {
          cleanupStarted = true;
          await cleanup.promise;
        }
        retired.push(handle);
      };
      const result = runWebCypressNative(
        { argv: phase === 'open' ? ['open'] : [], signal: controller.signal },
        fixture.deps
      ).finally(() => {
        settled = true;
      });
      const assertion = assert.rejects(result, (error) => {
        if (cleanupFails) {
          assert.ok(error instanceof AggregateError);
          assert.deepEqual(error.errors, [reason, cleanupFailure]);
        } else assert.equal(error, reason);
        return true;
      });
      try {
        await nextTurn();
        controller.abort(reason);
        await nextTurn();
        assert.equal(cleanupStarted, true, 'pending command enters owned cleanup on cancellation');
        assert.equal(settled, false, 'runner waits for command cleanup before returning');
        assert.equal(
          retired.includes(fixture.preview),
          false,
          'preview remains until open cleanup'
        );
      } finally {
        if (cleanupFails) cleanup.reject(cleanupFailure);
        else cleanup.resolve();
        pending.resolve({ code: 0, signal: null });
        await assertion;
      }
      if (phase === 'open') assert.equal(retired.at(-1), fixture.preview);
      assert.deepEqual(fixture.messages, []);
    }
  });
}

test(
  'native POSIX preview canary retires descendants and releases stdout after the leader exits',
  { skip: process.platform === 'win32', timeout: 15_000 },
  async (t) => {
    const fixture = runnerFixture();
    let handle;
    let closed;
    t.after(async () => {
      if (handle) await terminateLiveProofProcess(handle);
    });
    const spawnOwned = fixture.deps.spawnLiveProofProcess;
    fixture.deps.spawnLiveProofProcess = (name, ...args) => {
      if (name !== 'native-web-preview') return spawnOwned(name, ...args);
      const descendant = `
        process.stdout.write('owned descendant ready\\n');
        process.send('ready');
        setInterval(() => {}, 1000);
      `;
      const leader = `
        const { spawn } = require('node:child_process');
        const child = spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], {
          stdio: ['ignore', 'inherit', 'inherit', 'ipc']
        });
        child.once('message', () => process.exit(0));
      `;
      handle = spawnLiveProofProcess('native-preview-canary', process.execPath, ['-e', leader], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      handle.child.stdout.resume();
      handle.child.stderr.resume();
      closed = once(handle.child, 'close');
      return handle;
    };
    fixture.deps.waitForPreview = async (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      );
    fixture.deps.terminateLiveProofProcess = terminateLiveProofProcess;
    await assert.rejects(runWebCypressNative({}, fixture.deps), /Native preview exited.*exit 0/);
    await closed;
    assert.throws(() => process.kill(-handle.child.pid, 0), { code: 'ESRCH' });
    assert.deepEqual(fixture.messages, []);
  }
);
