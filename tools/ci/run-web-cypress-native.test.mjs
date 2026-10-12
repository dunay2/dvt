/**
 * Owned concern: prove native browser orchestration accepts only complete structured evidence.
 * @baseline GH-3578: CLI success does not exclude skipped or omitted browser tests.
 * @decision Reuse exact result validation and inject only process/module boundaries.
 * @consequence Tests prove cleanup and environment restoration without booting a browser.
 * @version 1.0.0
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';

import {
  buildSpawnOptions,
  buildWindowsProcessTreeKillInvocation,
  createCypressProcessEnv,
  parseCypressRunnerArgs,
  runCypressProof,
  runWebCypressNative,
} from './run-web-cypress-native.mjs';

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
  assert.deepEqual(fixture.events, ['build', 'probe', 'spawn', 'ready', 'open', 'stop']);
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
  const preview = {};
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
    runCommand: async (command, args, options) => {
      commands.push({ command, args, options });
      events.push(args[0] === 'build:e2e' ? 'build' : 'open');
      return 0;
    },
    isPreviewReachable: async () => {
      events.push('probe');
      return false;
    },
    spawn: () => {
      events.push('spawn');
      return preview;
    },
    waitForPreview: async () => {
      events.push('ready');
    },
    stopPreview: (child) => {
      assert.equal(child, preview);
      events.push('stop');
    },
    log: (message) => messages.push(message),
  };
  return { deps, events, commands, messages };
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

test('native Cypress runner kills the Windows preview process tree', () => {
  assert.deepEqual(buildWindowsProcessTreeKillInvocation(4173), {
    command: 'taskkill',
    args: ['/PID', '4173', '/T', '/F'],
  });
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
