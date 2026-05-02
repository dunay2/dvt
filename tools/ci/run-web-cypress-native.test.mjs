import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  buildCypressInvocation,
  buildSpawnOptions,
  buildWindowsProcessTreeKillInvocation,
  createCypressProcessEnv,
  parseCypressRunnerArgs,
} from './run-web-cypress-native.mjs';

test('native Cypress runner removes ELECTRON_RUN_AS_NODE before spawning Cypress', () => {
  const env = createCypressProcessEnv({
    ELECTRON_RUN_AS_NODE: '1',
    PATH: 'C:/example',
  });

  assert.equal(env.ELECTRON_RUN_AS_NODE, undefined);
  assert.equal(env.PATH, 'C:/example');
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

  const invocation = buildCypressInvocation(parsed, 'win32');

  assert.equal(invocation.command, 'pnpm.cmd');
  assert.deepEqual(invocation.args, [
    'exec',
    'cypress',
    'run',
    '--config-file',
    'cypress.config.ts',
    '--spec',
    'cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
  ]);
});

test('native Cypress runner supports interactive open mode without losing config', () => {
  const parsed = parseCypressRunnerArgs(['open']);
  const invocation = buildCypressInvocation(parsed, 'linux');

  assert.equal(invocation.command, 'pnpm');
  assert.deepEqual(invocation.args, [
    'exec',
    'cypress',
    'open',
    '--config-file',
    'cypress.config.ts',
  ]);
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
