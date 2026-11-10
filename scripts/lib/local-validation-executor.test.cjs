/**
 * Owned concern: bounded validation execution and owned-process containment regressions.
 * @baseline RunChangedSliceVerification: timeout or cancellation cannot become successful evidence.
 * @decision Exercise delayed results, inherited deadlines and real owned child trees.
 * @consequence Cleanup completes before receipts, and unrelated processes remain alive.
 * @version 1.0.0
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { executeCommandPlan } = require('./local-validation-executor.cjs');
const { spawnLiveProofProcess, terminateLiveProofProcess } = require('../live-proof-process.cjs');

test('bounded plan awaits cleanup and keeps timeout failed after a zero cleanup exit', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const results = [];
  const starts = [];
  let finish;
  let releaseCleanup;
  const cleanup = new Promise((resolve) => {
    releaseCleanup = resolve;
  });
  const execution = executeCommandPlan(
    [
      { id: 'held', command: 'held' },
      { id: 'later', command: 'later' },
    ],
    {
      env: {},
      processRef: new EventEmitter(),
      stepTimeoutMs: 10,
      totalTimeoutMs: 20,
      spawnProcess: (name, _command, _args, options) => {
        starts.push(name);
        assert.equal(options.env.DVT_VALIDATION_DEADLINE_MS, '1010');
        return {
          name,
          child: {},
          completion: new Promise((resolve) => {
            finish = resolve;
          }),
        };
      },
      terminateProcess: async () => {
        await cleanup;
        finish({ code: 0, signal: null });
      },
      onStepResult: (result) => results.push(result),
      log: () => {},
    }
  );
  await new Promise((resolve) => setImmediate(resolve));
  t.mock.timers.tick(10);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(results.length, 0, 'a result must await cleanup');
  releaseCleanup();
  assert.equal(await execution, 124);
  assert.deepEqual(starts, ['held']);
  assert.equal(results[0].outcome, 'timed-out');
  assert.equal(results[0].durationMs, 10);
});

test('bounded plan rejects invalid limits before spawning', async () => {
  for (const value of [0, -1, Infinity, NaN, 0.5, 2_147_483_648]) {
    await assert.rejects(
      executeCommandPlan([{ id: 'never', command: 'never' }], {
        stepTimeoutMs: value,
        spawnProcess: () => assert.fail('invalid limits must not spawn'),
      }),
      /limit/
    );
  }
});

test('bounded plan stops on caller signals and preserves cleanup failure', async () => {
  for (const [signal, code] of [
    ['SIGINT', 130],
    ['SIGTERM', 143],
  ]) {
    const processRef = new EventEmitter();
    const results = [];
    const execution = executeCommandPlan([{ id: 'held', command: 'held' }], {
      processRef,
      spawnProcess: () => ({ name: 'held', child: {}, completion: new Promise(() => {}) }),
      terminateProcess: async () => {
        throw new Error('cleanup receipt failed');
      },
      onStepResult: (result) => results.push(result),
      log: () => {},
      throwOnError: true,
    });
    processRef.emit(signal);
    await assert.rejects(
      execution,
      (error) =>
        error instanceof AggregateError &&
        error.exitCode === code &&
        error.errors.some((failure) => failure.message === 'cleanup receipt failed')
    );
    assert.equal(results[0].outcome, 'cancelled');
    assert.equal(results[0].cleanupOutcome, 'failed');
    assert.equal(processRef.listenerCount(signal), 0);
  }
});

test('bounded plan rejects spawn failures and expired callers without leaving listeners', async () => {
  const processRef = new EventEmitter();
  const results = [];
  assert.equal(
    await executeCommandPlan([{ id: 'missing', command: 'missing' }], {
      processRef,
      log: () => {},
      spawnProcess: () => {
        throw new Error('spawn unavailable');
      },
      onStepResult: (result) => results.push(result),
    }),
    1
  );
  assert.equal(results[0].outcome, 'failed');
  assert.equal(processRef.listenerCount('SIGINT'), 0);
  assert.equal(
    await executeCommandPlan([{ id: 'expired', command: 'expired' }], {
      env: { DVT_VALIDATION_DEADLINE_MS: String(Date.now() - 1) },
      processRef,
      log: () => {},
      spawnProcess: () => assert.fail('expired caller must not spawn'),
    }),
    124
  );
  assert.equal(processRef.listenerCount('SIGTERM'), 0);
});

test('caller cancellation cannot supply a successful exit code', async () => {
  const controller = new AbortController();
  controller.abort(
    Object.assign(new Error('cancelled with invalid success status'), { exitCode: 0 })
  );
  assert.equal(
    await executeCommandPlan([{ id: 'never', command: 'never' }], {
      signal: controller.signal,
      log: () => {},
      spawnProcess: () => assert.fail('already cancelled caller cannot spawn'),
    }),
    1
  );
});

test('elapsed absolute time rejects a late zero result before delayed timers dispatch', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const results = [];
  const status = await executeCommandPlan([{ id: 'late', command: 'late' }], {
    processRef: new EventEmitter(),
    stepTimeoutMs: 10,
    log: () => {},
    spawnProcess: () => {
      t.mock.timers.setTime(1011);
      return { name: 'late', child: {}, completion: Promise.resolve({ code: 0, signal: null }) };
    },
    terminateProcess: async () => {},
    onStepResult: (result) => results.push(result),
  });
  assert.equal(status, 124);
  assert.equal(results[0].outcome, 'timed-out');
});

test(
  'a blocked real child tree times out without terminating an unrelated process',
  { timeout: 15000 },
  async (t) => {
    const sentinel = spawnLiveProofProcess(
      'sentinel',
      process.execPath,
      ['-e', 'setInterval(() => {}, 1000)'],
      { stdio: 'ignore' }
    );
    let owned;
    let grandchildPid;
    t.after(async () => {
      if (owned) await terminateLiveProofProcess(owned);
      if (grandchildPid) {
        try {
          process.kill(grandchildPid, 'SIGKILL');
        } catch (error) {
          if (error.code !== 'ESRCH') throw error;
        }
      }
      await terminateLiveProofProcess(sentinel);
    });
    const code = [
      "const {spawn} = require('node:child_process');",
      "const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {stdio:'ignore',windowsHide:true});",
      'process.send({pid:child.pid}); setInterval(() => {},1000);',
    ].join('\n');
    const results = [];
    const status = await executeCommandPlan(
      [{ id: 'held-tree', command: process.execPath, args: ['-e', code] }],
      {
        shell: false,
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        stepTimeoutMs: 2500,
        totalTimeoutMs: 5000,
        cleanupTimeoutMs: 50,
        forceTimeoutMs: 2000,
        spawnProcess: (...args) => {
          owned = spawnLiveProofProcess(...args);
          owned.child.on('message', (message) => {
            grandchildPid = message.pid;
          });
          return owned;
        },
        onStepResult: (result) => results.push(result),
        log: () => {},
      }
    );
    assert.equal(status, 124);
    assert.ok(grandchildPid, 'actual descendant must have started');
    assert.equal(results[0].outcome, 'timed-out');
    assert.equal(sentinel.child.exitCode, null, 'unrelated owned fixture remains alive');
    assert.throws(() => process.kill(grandchildPid, 0), { code: 'ESRCH' });
  }
);

test(
  'nested detached validation observes the inherited deadline and finishes its own cleanup',
  { timeout: 15000 },
  async (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-validation-lifetime-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const marker = path.join(root, 'cleanup.json');
    const nested = path.join(root, 'nested.cjs');
    const launcher = path.resolve(__dirname, 'local-validation-executor.cjs');
    fs.writeFileSync(
      nested,
      [
        `const {executeCommandPlan} = require(${JSON.stringify(launcher)});`,
        `executeCommandPlan([{id:'nested-held',command:process.execPath,args:['-e','setInterval(() => {}, 1000)']}],`,
        `{shell:false,stepTimeoutMs:10000,totalTimeoutMs:10000,cleanupTimeoutMs:50,forceTimeoutMs:2000,log:()=>{},`,
        `onStepResult: receipt => require('node:fs').writeFileSync(${JSON.stringify(marker)},JSON.stringify(receipt))})`,
        `.then(code => {process.exitCode=code;}).catch(error=>{console.error(error);process.exitCode=1;});`,
      ].join('\n')
    );
    const status = await executeCommandPlan(
      [{ id: 'nested', command: process.execPath, args: [nested] }],
      {
        shell: false,
        stepTimeoutMs: 2500,
        totalTimeoutMs: 5000,
        cleanupTimeoutMs: 4000,
        forceTimeoutMs: 1000,
        log: () => {},
      }
    );
    assert.equal(status, 124);
    const receipt = JSON.parse(fs.readFileSync(marker, 'utf8'));
    assert.equal(receipt.outcome, 'timed-out');
    assert.notEqual(receipt.cleanupOutcome, 'failed');
  }
);
