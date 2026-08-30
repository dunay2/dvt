/** Owned concern: prove the governed PR closeout command plan. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { EventEmitter, once } = require('node:events');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const {
  buildPrCloseoutPlan,
  commandLabel,
  executePrCloseoutPlan,
  parseArgs,
  probePlanningDbActive,
  resolveCloseoutLockEndpoint,
  resolveCommandInvocation,
  runWithCloseoutLock,
} = require('./pr-closeout.cjs');
const { projectName: planningDbProjectName } = require('./planning-db-run.cjs');

function stepIds(plan) {
  return plan.map((step) => step.id);
}

function indexOf(ids, id) {
  const index = ids.indexOf(id);
  assert.ok(index >= 0, `Expected ${id} in ${ids.join(', ')}`);
  return index;
}

const commit = {
  type: 'chore',
  scope: 'ci',
  subject: 'Mechanize PR closeout',
};

test('buildPrCloseoutPlan commits before the only full prepush validation and push', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['package.json', 'scripts/pr-closeout.cjs'],
    stagedFiles: ['package.json', 'scripts/pr-closeout.cjs'],
    commit,
    push: true,
  });
  const ids = stepIds(plan);

  assert.equal(ids.includes('closeout-lease-acquire'), false);
  assert.equal(ids.includes('closeout-lease-release'), false);
  assert.ok(indexOf(ids, 'planning-db-ownership') < indexOf(ids, 'planning-db-up'));
  assert.ok(indexOf(ids, 'planning-db-health') < indexOf(ids, 'governance-refresh'));
  assert.ok(indexOf(ids, 'governance-refresh') < indexOf(ids, 'assert-no-unstaged'));
  assert.equal(ids.includes('planning-db-import'), false);
  assert.equal(ids.filter((id) => id === 'governance-refresh').length, 1);
  assert.ok(indexOf(ids, 'assert-no-unstaged') < indexOf(ids, 'commit'));
  assert.ok(indexOf(ids, 'commit') < indexOf(ids, 'verify-prepush'));
  assert.ok(indexOf(ids, 'verify-prepush') < indexOf(ids, 'planning-db-release'));
  assert.ok(indexOf(ids, 'planning-db-release') < indexOf(ids, 'push'));
  assert.ok(indexOf(ids, 'verify-prepush') < indexOf(ids, 'push'));
  assert.equal(ids.filter((id) => id === 'verify-prepush').length, 1);
  assert.equal(
    commandLabel(plan.find((step) => step.id === 'verify-prepush')),
    'pnpm verify:prepush -- --full'
  );
  assert.equal(
    commandLabel(plan.find((step) => step.id === 'commit')),
    'pnpm commit chore ci "Mechanize PR closeout"'
  );
});

test('OS-owned closeout lock serializes contenders and releases after completion', async () => {
  const endpoint = resolveCloseoutLockEndpoint(`resource:test-${process.pid}-${Date.now()}`);
  let releaseFirst;
  let firstStarted;
  const started = new Promise((resolve) => {
    firstStarted = resolve;
  });
  const hold = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  const first = runWithCloseoutLock(
    async () => {
      firstStarted();
      await hold;
      return 'first-complete';
    },
    { endpoint }
  );
  await started;

  await assert.rejects(
    runWithCloseoutLock(() => 'second-complete', { endpoint }),
    /PR_CLOSEOUT_LEASE_BUSY/u
  );
  releaseFirst();
  assert.equal(await first, 'first-complete');
  assert.equal(await runWithCloseoutLock(() => 'third-complete', { endpoint }), 'third-complete');
});

test('TCP fallback performs real bind, contention, and release', async () => {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen({ host: '127.0.0.1', port: 0 }, resolve);
  });
  const endpoint = { host: '127.0.0.1', port: probe.address().port };
  await new Promise((resolve, reject) => {
    probe.close((error) => (error ? reject(error) : resolve()));
  });
  let releaseFirst;
  let firstStarted;
  const started = new Promise((resolve) => {
    firstStarted = resolve;
  });
  const hold = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  const first = runWithCloseoutLock(
    async () => {
      firstStarted();
      await hold;
    },
    { endpoint }
  );
  await started;

  const contenderError = await runWithCloseoutLock(() => 'contender', { endpoint }).then(
    () => null,
    (error) => error
  );
  releaseFirst();
  await first;
  assert.match(contenderError?.message || '', /PR_CLOSEOUT_LEASE_BUSY/u);
  assert.equal(await runWithCloseoutLock(() => 'released', { endpoint }), 'released');
});

test('closeout endpoint uses OS-released local namespaces where available', () => {
  const scope = process.cwd();
  const windowsEndpoint = resolveCloseoutLockEndpoint(scope, 'win32');
  const linuxEndpoint = resolveCloseoutLockEndpoint(scope, 'linux');
  const fallbackEndpoint = resolveCloseoutLockEndpoint(scope, 'darwin');

  assert.match(windowsEndpoint.path, /^\\\\\.\\pipe\\dvt-pr-closeout-[a-f0-9]{24}$/u);
  assert.equal(linuxEndpoint.path.charCodeAt(0), 0);
  assert.match(linuxEndpoint.path.slice(1), /^dvt-pr-closeout-[a-f0-9]{24}$/u);
  assert.equal(fallbackEndpoint.host, '127.0.0.1');
  assert.ok(fallbackEndpoint.port >= 49_152 && fallbackEndpoint.port <= 65_535);
  assert.deepEqual(
    resolveCloseoutLockEndpoint(scope, process.platform),
    resolveCloseoutLockEndpoint(scope, process.platform)
  );
  assert.deepEqual(
    resolveCloseoutLockEndpoint(),
    resolveCloseoutLockEndpoint(`resource:${planningDbProjectName}`)
  );
});

test('OS-owned closeout lock releases automatically when the guarded task fails', async () => {
  const endpoint = resolveCloseoutLockEndpoint(`resource:failure-${process.pid}-${Date.now()}`);

  await assert.rejects(
    runWithCloseoutLock(
      () => {
        throw new Error('guarded closeout failed');
      },
      { endpoint }
    ),
    /guarded closeout failed/u
  );

  assert.equal(await runWithCloseoutLock(() => 'recovered', { endpoint }), 'recovered');
});

test('OS-owned closeout lock rejects clients that could extend its lifetime', async () => {
  const endpoint = resolveCloseoutLockEndpoint(`resource:client-${process.pid}-${Date.now()}`);
  let releaseTask;
  let taskStarted;
  const started = new Promise((resolve) => {
    taskStarted = resolve;
  });
  const hold = new Promise((resolve) => {
    releaseTask = resolve;
  });
  const guarded = runWithCloseoutLock(
    async () => {
      taskStarted();
      await hold;
    },
    { endpoint }
  );
  await started;

  const client = net.createConnection(endpoint);
  client.on('error', () => {});
  await once(client, 'close');
  releaseTask();
  await guarded;

  assert.equal(await runWithCloseoutLock(() => 'available', { endpoint }), 'available');
});

test('machine-global Planning DB lock serializes separate checkout roots', async (t) => {
  const checkoutRoot = fs.mkdtempSync(path.join(process.cwd(), '.tmp-pr-closeout-checkouts-'));
  const firstCheckout = path.join(checkoutRoot, 'first');
  const secondCheckout = path.join(checkoutRoot, 'second');
  const scope = `resource:test-checkouts-${process.pid}-${Date.now()}`;
  fs.mkdirSync(firstCheckout);
  fs.mkdirSync(secondCheckout);
  t.after(() => fs.rmSync(checkoutRoot, { recursive: true, force: true }));
  let releaseFirst;
  let firstStarted;
  const started = new Promise((resolve) => {
    firstStarted = resolve;
  });
  const hold = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  const first = runWithCloseoutLock(
    async () => {
      firstStarted();
      await hold;
    },
    { repoRootPath: firstCheckout, scope }
  );
  await started;

  try {
    await assert.rejects(
      runWithCloseoutLock(() => 'second-acquired', { repoRootPath: secondCheckout, scope }),
      /PR_CLOSEOUT_LEASE_BUSY/u
    );
  } finally {
    releaseFirst();
    await first;
  }
});

test('explicit path lock scope fails closed when it cannot be canonicalized', () => {
  const missingScope = path.join(process.cwd(), `.missing-closeout-scope-${process.pid}`);
  assert.throws(() => resolveCloseoutLockEndpoint(missingScope), /PR_CLOSEOUT_LOCK_SCOPE_FAILED/u);
});

test('closeout lock preserves task, runtime, and listener-release failures', async () => {
  const releaseError = Object.assign(new Error('listener release failed'), { code: 'EIO' });
  const server = new EventEmitter();
  server.listen = (_endpoint, callback) => queueMicrotask(callback);
  server.close = (callback) => callback(releaseError);

  await assert.rejects(
    runWithCloseoutLock(
      () => {
        server.emit('error', new Error('first listener runtime failed'));
        server.emit('error', new Error('second listener runtime failed'));
        throw new Error('guarded task failed');
      },
      {
        endpoint: { path: `test-double-${process.pid}` },
        createServer: () => server,
      }
    ),
    (error) => {
      assert.ok(error instanceof AggregateError);
      assert.match(error.message, /guarded task failed/u);
      assert.match(error.message, /first listener runtime failed/u);
      assert.match(error.message, /second listener runtime failed/u);
      assert.match(error.message, /listener release failed/u);
      assert.deepEqual(
        error.errors.map((entry) => entry.message),
        [
          'guarded task failed',
          'PR_CLOSEOUT_LEASE_RUNTIME_FAILED: first listener runtime failed',
          'PR_CLOSEOUT_LEASE_RUNTIME_FAILED: second listener runtime failed',
          'PR_CLOSEOUT_LEASE_RELEASE_FAILED: listener release failed',
        ]
      );
      return true;
    }
  );
});

test('runtime listener errors retain exclusion until the async task settles', async () => {
  const endpoint = resolveCloseoutLockEndpoint(
    `resource:runtime-error-${process.pid}-${Date.now()}`
  );
  let server;
  let releaseTask;
  let taskStarted;
  let taskFinished = false;
  const started = new Promise((resolve) => {
    taskStarted = resolve;
  });
  const hold = new Promise((resolve) => {
    releaseTask = resolve;
  });
  const guarded = runWithCloseoutLock(
    async () => {
      taskStarted();
      await hold;
      taskFinished = true;
    },
    {
      endpoint,
      createServer: () => {
        server = net.createServer();
        return server;
      },
    }
  );
  const guardedOutcome = guarded.then(
    (value) => ({ value }),
    (error) => ({ error })
  );
  await started;
  server.emit('error', new Error('listener runtime failed'));

  const contenderError = await runWithCloseoutLock(() => 'contender', { endpoint }).then(
    () => null,
    (error) => error
  );
  releaseTask();
  const outcome = await guardedOutcome;

  assert.match(contenderError?.message || '', /PR_CLOSEOUT_LEASE_BUSY/u);
  assert.equal(taskFinished, true);
  assert.match(outcome.error?.message || '', /PR_CLOSEOUT_LEASE_RUNTIME_FAILED/u);
});

test('queued listener errors survive synchronous task settlement and listener close', async () => {
  const server = new EventEmitter();
  server.listen = (_endpoint, callback) => queueMicrotask(callback);
  server.close = (callback) => setImmediate(callback);

  await assert.rejects(
    runWithCloseoutLock(
      () => {
        setImmediate(() => server.emit('error', new Error('queued listener runtime failed')));
        return 'synchronous task complete';
      },
      {
        endpoint: { path: `test-double-${process.pid}` },
        createServer: () => server,
      }
    ),
    /PR_CLOSEOUT_LEASE_RUNTIME_FAILED: queued listener runtime failed/u
  );
});

test('listener errors emitted during close remain in the final aggregate', async () => {
  const releaseError = Object.assign(new Error('listener close failed'), { code: 'EIO' });
  const server = new EventEmitter();
  server.listen = (_endpoint, callback) => queueMicrotask(callback);
  server.close = (callback) => {
    setImmediate(() => {
      server.emit('error', new Error('first during-close runtime failed'));
      server.emit('error', new Error('second during-close runtime failed'));
      callback(releaseError);
    });
  };

  await assert.rejects(
    runWithCloseoutLock(
      () => {
        throw new Error('synchronous guarded task failed');
      },
      {
        endpoint: { path: `test-double-${process.pid}` },
        createServer: () => server,
      }
    ),
    (error) => {
      assert.ok(error instanceof AggregateError);
      assert.deepEqual(
        error.errors.map((entry) => entry.message),
        [
          'synchronous guarded task failed',
          'PR_CLOSEOUT_LEASE_RUNTIME_FAILED: first during-close runtime failed',
          'PR_CLOSEOUT_LEASE_RUNTIME_FAILED: second during-close runtime failed',
          'PR_CLOSEOUT_LEASE_RELEASE_FAILED: listener close failed',
        ]
      );
      return true;
    }
  );
});

test('OS-owned closeout lock serializes processes and releases after abrupt exit', async (t) => {
  const modulePath = path.join(__dirname, 'pr-closeout.cjs');
  const scope = `resource:test-process-${process.pid}-${Date.now()}`;
  const childScript = [
    'const { runWithCloseoutLock } = require(process.argv[1]);',
    "runWithCloseoutLock(() => { process.stdout.write('locked\\n'); return new Promise(() => {}); }, { scope: process.argv[2] });",
  ].join(' ');
  const child = spawn(process.execPath, ['-e', childScript, modulePath, scope], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => {
    if (child.exitCode === null) child.kill('SIGKILL');
  });
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('child lock acquisition timed out')), 5_000);
  });
  const [startedOutput] = await Promise.race([once(child.stdout, 'data'), timeout]);
  clearTimeout(timeoutId);
  assert.match(String(startedOutput), /locked/u);

  await assert.rejects(
    runWithCloseoutLock(() => 'parent-acquired', { scope }),
    /PR_CLOSEOUT_LEASE_BUSY/u
  );
  const exited = once(child, 'exit');
  child.kill('SIGKILL');
  await exited;
  assert.equal(await runWithCloseoutLock(() => 'recovered', { scope }), 'recovered');
});

test('closeout mutual exclusion has no mutable owner or recovery records', () => {
  const source = fs.readFileSync(path.join(__dirname, 'pr-closeout.cjs'), 'utf8');
  assert.doesNotMatch(source, /owner\.json|recovery\.json|readProcessIdentity/u);
});

test('buildPrCloseoutPlan refuses implicit commits with no staged files', () => {
  assert.throws(
    () =>
      buildPrCloseoutPlan({
        changedFiles: ['scripts/pr-closeout.cjs'],
        stagedFiles: [],
        commit,
      }),
    /NO_STAGED_FILES/
  );
});

test('buildPrCloseoutPlan can stage all local changes explicitly before commit', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['scripts/pr-closeout.cjs'],
    stagedFiles: [],
    commit,
    stageAll: true,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'stage-all') < indexOf(ids, 'commit'));
  assert.equal(ids.includes('assert-no-unstaged'), false);
});

test('buildPrCloseoutPlan prepares generated code status before commit when needed', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['packages/@dvt/engine/src/WorkflowEngine.ts'],
    stagedFiles: ['packages/@dvt/engine/src/WorkflowEngine.ts'],
    commit,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'docs-status-code-state') < indexOf(ids, 'planning-db-ownership'));
  assert.ok(indexOf(ids, 'planning-db-ownership') < indexOf(ids, 'planning-db-up'));
  assert.ok(indexOf(ids, 'planning-db-up') < indexOf(ids, 'planning-db-health'));
  assert.equal(ids.includes('planning-db-import'), false);
  assert.ok(indexOf(ids, 'planning-db-health') < indexOf(ids, 'assert-no-unstaged'));
  assert.ok(indexOf(ids, 'assert-no-unstaged') < indexOf(ids, 'commit'));
  assert.ok(indexOf(ids, 'verify-prepush') < indexOf(ids, 'planning-db-release'));
  assert.equal(ids.includes('docs-status-repository-map'), false);
  assert.equal(
    commandLabel(plan.find((step) => step.id === 'docs-status-code-state')),
    'pnpm docs:status:generate --code-state-only'
  );
  assert.equal(
    commandLabel(plan.find((step) => step.id === 'planning-db-health')),
    'pnpm planning:db:health --wait'
  );
});

test('buildPrCloseoutPlan keeps Planning DB through mixed workspace and governance consumers', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['apps/web/src/main.tsx', 'scripts/governance-refresh.cjs'],
    stagedFiles: ['apps/web/src/main.tsx', 'scripts/governance-refresh.cjs'],
    commit,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'planning-db-ownership') < indexOf(ids, 'planning-db-up'));
  assert.ok(indexOf(ids, 'planning-db-health') < indexOf(ids, 'governance-refresh'));
  assert.ok(indexOf(ids, 'governance-refresh') < indexOf(ids, 'planning-db-release'));
  assert.equal(ids.includes('planning-db-import'), false);
  assert.equal(ids.filter((id) => id === 'governance-refresh').length, 1);
  assert.equal(ids.includes('docs-status-repository-map'), false);
});

test('buildPrCloseoutPlan leaves on-demand publication out of manifest-only closeout', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['pnpm-workspace.yaml'],
    stagedFiles: ['pnpm-workspace.yaml'],
    commit,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'docs-status-code-state') < indexOf(ids, 'planning-db-up'));
  assert.ok(indexOf(ids, 'planning-db-health') < indexOf(ids, 'commit'));
  assert.equal(ids.includes('planning-db-import'), false);
  assert.equal(ids.includes('docs-status-repository-map'), false);
});

test('buildPrCloseoutPlan leaves on-demand publication out of documentation closeout', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['docs/contracts/index.md'],
    stagedFiles: ['docs/contracts/index.md'],
    commit,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'planning-db-ownership') < indexOf(ids, 'planning-db-up'));
  assert.ok(indexOf(ids, 'planning-db-health') < indexOf(ids, 'commit'));
  assert.equal(ids.includes('planning-db-import'), false);
  assert.ok(indexOf(ids, 'verify-prepush') < indexOf(ids, 'planning-db-release'));
  assert.equal(ids.includes('docs-status-repository-map'), false);
});

test('buildPrCloseoutPlan prepares workspace projections for root and non-standard inputs', () => {
  for (const filePath of [
    'README.md',
    'src/index.ts',
    'test/root.test.ts',
    'integrations/example/README.md',
    'integrations/example/package.json',
    'integrations/example/src/index.ts',
    'integrations/example/test/example.test.ts',
  ]) {
    const plan = buildPrCloseoutPlan({
      changedFiles: [filePath],
      stagedFiles: [filePath],
      commit,
    });
    const ids = stepIds(plan);

    assert.ok(ids.includes('docs-status-code-state'), filePath);
    assert.equal(ids.includes('docs-status-repository-map'), false, filePath);
    assert.ok(indexOf(ids, 'verify-prepush') < indexOf(ids, 'planning-db-release'), filePath);
  }
});

test('buildPrCloseoutPlan validates against existing Planning DB without rebuilding it', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['eslint.config.cjs'],
    stagedFiles: ['eslint.config.cjs'],
    commit,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'planning-db-ownership') < indexOf(ids, 'planning-db-up'));
  assert.ok(indexOf(ids, 'planning-db-up') < indexOf(ids, 'planning-db-health'));
  assert.ok(indexOf(ids, 'planning-db-health') < indexOf(ids, 'commit'));
  assert.equal(ids.includes('planning-db-import'), false);
  assert.ok(indexOf(ids, 'commit') < indexOf(ids, 'verify-prepush'));
  assert.ok(indexOf(ids, 'verify-prepush') < indexOf(ids, 'planning-db-release'));
  assert.equal(ids.includes('governance-refresh'), false);
  assert.equal(ids.includes('docs-status-repository-map'), false);
});

test('buildPrCloseoutPlan prepares Planning DB before DB-first docs sync', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['docs/guides/testing-and-ci-capabilities.md'],
    stagedFiles: ['docs/guides/testing-and-ci-capabilities.md'],
    commit,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'planning-db-ownership') < indexOf(ids, 'planning-db-up'));
  assert.ok(indexOf(ids, 'planning-db-up') < indexOf(ids, 'planning-db-health'));
  assert.ok(indexOf(ids, 'planning-db-health') < indexOf(ids, 'governance-refresh'));
  assert.ok(indexOf(ids, 'governance-refresh') < indexOf(ids, 'docs-sync'));
});

test('buildPrCloseoutPlan refreshes governance for mandatory planning proposals', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: [
      'docs/planning/proposals/mandatory/governance-and-docs/governed-changed-slice-closeout-plan-20260506.md',
    ],
    stagedFiles: [
      'docs/planning/proposals/mandatory/governance-and-docs/governed-changed-slice-closeout-plan-20260506.md',
    ],
    commit,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'planning-db-ownership') < indexOf(ids, 'governance-refresh'));
  assert.ok(indexOf(ids, 'governance-refresh') < indexOf(ids, 'commit'));
  assert.equal(ids.includes('planning-db-import'), false);
  assert.equal(ids.filter((id) => id === 'governance-refresh').length, 1);
  assert.ok(indexOf(ids, 'verify-prepush') < indexOf(ids, 'planning-db-release'));
});

test('executePrCloseoutPlan fails staged-file mode if prep leaves unstaged files', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['docs/runbooks/governed-changed-slice-closeout-20260506.md'],
    stagedFiles: ['docs/runbooks/governed-changed-slice-closeout-20260506.md'],
    commit,
  });
  const calls = [];
  let unstagedFiles = [];

  assert.throws(
    () =>
      executePrCloseoutPlan(plan, {
        spawnCommand: (command, args) => {
          calls.push([command, ...args].join(' '));
          if (args.includes('docs:sync')) {
            unstagedFiles = ['docs/index.md'];
          }
          return { status: 0 };
        },
        listUnstagedFiles: () => unstagedFiles,
      }),
    /UNSTAGED_CHANGES_AFTER_PREP[\s\S]*docs\/index\.md/u
  );

  const refreshIndex = calls.findIndex((call) => call.endsWith(' governance:refresh'));
  const docsSyncIndex = calls.findIndex((call) => call.endsWith(' docs:sync'));
  assert.ok(refreshIndex >= 0);
  assert.ok(docsSyncIndex >= 0);
  assert.ok(refreshIndex < docsSyncIndex);
  assert.equal(
    calls.some((call) => call.includes(' commit ')),
    false
  );
});

test('executePrCloseoutPlan preserves a Planning DB that was already active', () => {
  const calls = [];

  executePrCloseoutPlan(
    [
      {
        id: 'planning-db-ownership',
        internal: 'capturePlanningDbOwnership',
        label: 'detect Planning DB ownership',
      },
      { id: 'planning-db-up', command: 'pnpm', args: ['planning:db:up'] },
      {
        id: 'planning-db-release',
        internal: 'releasePlanningDbIfOwned',
        label: 'release owned Planning DB',
      },
    ],
    {
      probePlanningDbActive: () => true,
      spawnCommand: (command, args) => {
        calls.push([command, ...args].join(' '));
        return { status: 0 };
      },
    }
  );

  assert.equal(
    calls.some((call) => call.includes('planning:db:down')),
    false
  );
});

test('executePrCloseoutPlan releases an owned Planning DB even when closeout fails', () => {
  const calls = [];

  assert.throws(
    () =>
      executePrCloseoutPlan(
        [
          {
            id: 'planning-db-ownership',
            internal: 'capturePlanningDbOwnership',
            label: 'detect Planning DB ownership',
          },
          { id: 'planning-db-up', command: 'pnpm', args: ['planning:db:up'] },
          { id: 'failing-step', command: 'pnpm', args: ['failing-step'] },
          {
            id: 'planning-db-release',
            internal: 'releasePlanningDbIfOwned',
            label: 'release owned Planning DB',
          },
        ],
        {
          probePlanningDbActive: () => false,
          spawnCommand: (command, args) => {
            const label = [command, ...args].join(' ');
            calls.push(label);
            return { status: args.includes('failing-step') ? 1 : 0 };
          },
        }
      ),
    /failing-step failed with exit code 1/
  );

  assert.equal(calls.filter((call) => call.includes('planning:db:down')).length, 1);
});

test('executePrCloseoutPlan fails closed when Planning DB ownership cannot be probed', () => {
  const calls = [];

  assert.throws(
    () =>
      executePrCloseoutPlan(
        [
          {
            id: 'planning-db-ownership',
            internal: 'capturePlanningDbOwnership',
            label: 'detect Planning DB ownership',
          },
          { id: 'planning-db-up', command: 'pnpm', args: ['planning:db:up'] },
        ],
        {
          probePlanningDbActive: () => {
            throw new Error('PLANNING_DB_OWNERSHIP_PROBE_FAILED: Docker unavailable');
          },
          spawnCommand: (command, args) => {
            calls.push([command, ...args].join(' '));
            return { status: 0 };
          },
        }
      ),
    /PLANNING_DB_OWNERSHIP_PROBE_FAILED/
  );

  assert.deepEqual(calls, []);
});

test('probePlanningDbActive distinguishes inactive from probe failure', () => {
  assert.equal(
    probePlanningDbActive({
      spawnCommand: () => ({ status: 3 }),
      platform: 'linux',
    }),
    false
  );
  assert.throws(
    () =>
      probePlanningDbActive({
        spawnCommand: () => ({ status: 2 }),
        platform: 'linux',
      }),
    /PLANNING_DB_OWNERSHIP_PROBE_FAILED/
  );
});

test('parseArgs exposes commit, stage, push, dry-run, and custom check intent', () => {
  assert.deepEqual(
    parseArgs([
      'chore',
      'ci',
      'Mechanize PR closeout',
      '--stage-all',
      '--push',
      '--dry-run',
      '--check',
      'pnpm test:pr-closeout',
    ]),
    {
      commit,
      dryRun: true,
      push: true,
      stageAll: true,
      checks: ['pnpm test:pr-closeout'],
    }
  );
});

test('executePrCloseoutPlan preserves commit subjects with spaces as one argv item', () => {
  const calls = [];

  executePrCloseoutPlan(
    [
      {
        id: 'commit',
        command: 'pnpm',
        args: ['commit', 'chore', 'ci', 'Mechanize PR closeout rail'],
      },
    ],
    {
      spawnCommand: (command, args, options) => {
        calls.push({ command, args, options });
        return { status: 0 };
      },
    }
  );

  const commitArgIndex = calls[0].args.indexOf('commit');
  assert.ok(commitArgIndex >= 0, `Expected commit argv in ${calls[0].args.join(' ')}`);
  assert.deepEqual(calls[0].args.slice(commitArgIndex), [
    'commit',
    'chore',
    'ci',
    'Mechanize PR closeout rail',
  ]);
  assert.equal(calls[0].options.shell, false);
});

test('resolveCommandInvocation launches pnpm through node on Windows', () => {
  const invocation = resolveCommandInvocation(
    'pnpm',
    ['commit', 'chore', 'ci', 'Mechanize PR closeout rail'],
    {
      platform: 'win32',
      pnpmCliPath: 'C:/tools/pnpm/bin/pnpm.cjs',
    }
  );

  assert.equal(invocation.command, process.execPath);
  assert.deepEqual(invocation.args, [
    'C:/tools/pnpm/bin/pnpm.cjs',
    'commit',
    'chore',
    'ci',
    'Mechanize PR closeout rail',
  ]);
  assert.equal(invocation.shell, false);
});

test('package scripts expose the PR closeout rail and its regression suite', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8')
  );

  assert.equal(packageJson.scripts['pr:closeout'], 'node scripts/pr-closeout.cjs');
  assert.equal(packageJson.scripts['test:pr-closeout'], 'node --test scripts/pr-closeout.test.cjs');
});
