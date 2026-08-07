/** Owned concern: prove the governed PR closeout command plan. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  acquireCloseoutLease,
  buildPrCloseoutPlan,
  commandLabel,
  executePrCloseoutPlan,
  parseArgs,
  probePlanningDbActive,
  readProcessIdentity,
  releaseCloseoutLease,
  resolveCommandInvocation,
} = require('./pr-closeout.cjs');

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
const testProcessIdentity = 'test:process-start';
const getTestProcessIdentity = () => testProcessIdentity;

test('buildPrCloseoutPlan commits before the only full prepush validation and push', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['package.json', 'scripts/pr-closeout.cjs'],
    stagedFiles: ['package.json', 'scripts/pr-closeout.cjs'],
    commit,
    push: true,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'closeout-lease-acquire') < indexOf(ids, 'planning-db-ownership'));
  assert.ok(indexOf(ids, 'planning-db-ownership') < indexOf(ids, 'planning-db-up'));
  assert.ok(indexOf(ids, 'planning-db-health') < indexOf(ids, 'planning-db-migrate'));
  assert.ok(indexOf(ids, 'planning-db-migrate') < indexOf(ids, 'governance-refresh'));
  assert.ok(indexOf(ids, 'governance-refresh') < indexOf(ids, 'assert-no-unstaged'));
  assert.ok(indexOf(ids, 'assert-no-unstaged') < indexOf(ids, 'commit'));
  assert.ok(indexOf(ids, 'commit') < indexOf(ids, 'verify-prepush'));
  assert.ok(indexOf(ids, 'verify-prepush') < indexOf(ids, 'planning-db-release'));
  assert.ok(indexOf(ids, 'planning-db-release') < indexOf(ids, 'push'));
  assert.ok(indexOf(ids, 'push') < indexOf(ids, 'closeout-lease-release'));
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

test('closeout lease rejects a concurrent owner and transfers only after release', (t) => {
  const leaseRoot = fs.mkdtempSync(path.join(process.cwd(), '.tmp-pr-closeout-lease-'));
  const leaseDir = path.join(leaseRoot, 'lease');
  t.after(() => fs.rmSync(leaseRoot, { recursive: true, force: true }));
  const first = {};
  const second = {};

  acquireCloseoutLease(
    {
      closeoutLeaseDir: leaseDir,
      processId: 101,
      createLeaseToken: () => 'first-token',
      getProcessIdentity: getTestProcessIdentity,
      isProcessActive: (pid) => pid === 101,
    },
    first
  );

  assert.throws(
    () =>
      acquireCloseoutLease(
        {
          closeoutLeaseDir: leaseDir,
          processId: 202,
          createLeaseToken: () => 'second-token',
          getProcessIdentity: getTestProcessIdentity,
          isProcessActive: (pid) => pid === 101,
        },
        second
      ),
    /PR_CLOSEOUT_LEASE_BUSY.*101/u
  );
  assert.equal(second.closeoutLeaseOwned, undefined);

  releaseCloseoutLease({}, first);
  acquireCloseoutLease(
    {
      closeoutLeaseDir: leaseDir,
      processId: 202,
      createLeaseToken: () => 'second-token',
      getProcessIdentity: getTestProcessIdentity,
      isProcessActive: () => false,
    },
    second
  );
  releaseCloseoutLease({}, second);
});

test('executePrCloseoutPlan releases its lease after an interrupted closeout', (t) => {
  const leaseRoot = fs.mkdtempSync(path.join(process.cwd(), '.tmp-pr-closeout-cleanup-'));
  const leaseDir = path.join(leaseRoot, 'lease');
  t.after(() => fs.rmSync(leaseRoot, { recursive: true, force: true }));

  assert.throws(
    () =>
      executePrCloseoutPlan(
        [
          {
            id: 'closeout-lease-acquire',
            internal: 'acquireCloseoutLease',
            label: 'acquire exclusive PR closeout lease',
          },
          { id: 'failing-step', command: 'pnpm', args: ['failing-step'] },
        ],
        {
          closeoutLeaseDir: leaseDir,
          createLeaseToken: () => 'cleanup-token',
          spawnCommand: () => ({ status: 1 }),
        }
      ),
    /failing-step failed with exit code 1/u
  );
  assert.equal(fs.existsSync(leaseDir), false);
});

test('closeout lease recovers a stale owner without deleting a live successor', (t) => {
  const leaseRoot = fs.mkdtempSync(path.join(process.cwd(), '.tmp-pr-closeout-stale-'));
  const leaseDir = path.join(leaseRoot, 'lease');
  const runtime = {};
  t.after(() => fs.rmSync(leaseRoot, { recursive: true, force: true }));
  fs.mkdirSync(leaseDir);
  fs.writeFileSync(
    path.join(leaseDir, 'owner.json'),
    `${JSON.stringify({ pid: 101, token: 'stale-token' })}\n`,
    'utf8'
  );

  acquireCloseoutLease(
    {
      closeoutLeaseDir: leaseDir,
      processId: 202,
      createLeaseToken: () => 'successor-token',
      getProcessIdentity: getTestProcessIdentity,
      isProcessActive: () => false,
    },
    runtime
  );
  const owner = JSON.parse(fs.readFileSync(path.join(leaseDir, 'owner.json'), 'utf8'));
  assert.equal(owner.pid, 202);
  assert.equal(owner.token, 'successor-token');
  releaseCloseoutLease({}, runtime);
});

test('process identity supports Windows and fails closed on unreadable state', () => {
  assert.equal(
    readProcessIdentity(101, {
      platform: 'win32',
      processIdentitySpawnCommand: () => ({ status: 0, stdout: '1786100400123' }),
    }),
    'win32:1786100400123'
  );

  assert.throws(
    () =>
      readProcessIdentity(101, {
        platform: 'linux',
        processIdentityReadFileSync: () => {
          const error = new Error('access denied');
          error.code = 'EACCES';
          throw error;
        },
      }),
    /PR_CLOSEOUT_PROCESS_IDENTITY_FAILED: access denied/u
  );
});

test('Linux process identity uses boot ID and start ticks without wall-clock time', () => {
  const processFields = [
    'S',
    '1',
    '1',
    '1',
    '0',
    '-1',
    '4194304',
    '0',
    '0',
    '0',
    '0',
    '0',
    '0',
    '0',
    '0',
    '20',
    '0',
    '1',
    '0',
    '250',
  ];
  const readIdentity = (bootTime) =>
    readProcessIdentity(101, {
      platform: 'linux',
      processIdentityReadFileSync: (filePath) => {
        if (filePath === '/proc/101/stat') {
          return `101 (worker with spaces) ${processFields.join(' ')}`;
        }
        if (filePath === '/proc/sys/kernel/random/boot_id') return 'boot-identity\n';
        if (filePath === '/proc/stat') return `btime ${bootTime}\n`;
        throw new Error(`unexpected path ${filePath}`);
      },
    });

  assert.equal(readIdentity(1_000), 'linux:boot-identity:250');
  assert.equal(readIdentity(1_100), 'linux:boot-identity:250');
});

test('closeout lease recovers a stale owner after its PID is reused', (t) => {
  const leaseRoot = fs.mkdtempSync(path.join(process.cwd(), '.tmp-pr-closeout-reused-pid-'));
  const leaseDir = path.join(leaseRoot, 'lease');
  const ownerPath = path.join(leaseDir, 'owner.json');
  const runtime = {};
  const originalProcessIdentity = 'linux:boot-identity:100';
  const reusedProcessIdentity = 'linux:boot-identity:200';
  const successorProcessIdentity = 'linux:boot-identity:300';
  t.after(() => fs.rmSync(leaseRoot, { recursive: true, force: true }));
  fs.mkdirSync(leaseDir);
  fs.writeFileSync(
    ownerPath,
    `${JSON.stringify({
      pid: 101,
      token: 'stale-token',
      startedAt: '2026-08-07T10:05:00.000Z',
      processIdentity: originalProcessIdentity,
    })}\n`,
    'utf8'
  );

  acquireCloseoutLease(
    {
      closeoutLeaseDir: leaseDir,
      processId: 202,
      createLeaseToken: () => 'successor-token',
      isProcessActive: (pid) => pid === 101,
      getProcessIdentity: (pid) => (pid === 101 ? reusedProcessIdentity : successorProcessIdentity),
    },
    runtime
  );

  const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
  assert.equal(owner.pid, 202);
  assert.equal(owner.token, 'successor-token');
  assert.equal(owner.processIdentity, successorProcessIdentity);
  releaseCloseoutLease({}, runtime);
});

test('closeout lease releases recovery when process identity becomes unreadable', (t) => {
  const leaseRoot = fs.mkdtempSync(path.join(process.cwd(), '.tmp-pr-closeout-identity-read-'));
  const leaseDir = path.join(leaseRoot, 'lease');
  const ownerPath = path.join(leaseDir, 'owner.json');
  const runtime = {};
  const originalProcessIdentity = 'linux:boot-identity:100';
  const reusedProcessIdentity = 'linux:boot-identity:200';
  const successorProcessIdentity = 'linux:boot-identity:300';
  let ownerIdentityReads = 0;
  t.after(() => fs.rmSync(leaseRoot, { recursive: true, force: true }));
  fs.mkdirSync(leaseDir);
  fs.writeFileSync(
    ownerPath,
    `${JSON.stringify({
      pid: 101,
      token: 'original-token',
      startedAt: '2026-08-07T10:05:00.000Z',
      processIdentity: originalProcessIdentity,
    })}\n`,
    'utf8'
  );

  assert.throws(
    () =>
      acquireCloseoutLease(
        {
          closeoutLeaseDir: leaseDir,
          processId: 202,
          createLeaseToken: () => 'successor-token',
          isProcessActive: (pid) => pid === 101,
          getProcessIdentity: (pid) => {
            if (pid === 202) return successorProcessIdentity;
            ownerIdentityReads += 1;
            if (ownerIdentityReads === 1) return reusedProcessIdentity;
            throw new Error('identity access denied');
          },
        },
        runtime
      ),
    /identity access denied/u
  );

  const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
  assert.equal(owner.pid, 101);
  assert.equal(owner.token, 'original-token');
  assert.equal(runtime.closeoutLeaseOwned, undefined);
  assert.equal(fs.existsSync(path.join(leaseDir, 'recovery.json')), false);
});

test('closeout lease recovers an ownerless directory after the initialization grace', (t) => {
  const leaseRoot = fs.mkdtempSync(path.join(process.cwd(), '.tmp-pr-closeout-ownerless-'));
  const leaseDir = path.join(leaseRoot, 'lease');
  const runtime = {};
  const commonOptions = {
    closeoutLeaseDir: leaseDir,
    processId: 202,
    createLeaseToken: () => 'successor-token',
    getProcessIdentity: getTestProcessIdentity,
    closeoutLeaseInitializationGraceMs: 30_000,
    statSync: () => ({ mtimeMs: 1_000 }),
  };
  t.after(() => fs.rmSync(leaseRoot, { recursive: true, force: true }));
  fs.mkdirSync(leaseDir);

  assert.throws(
    () => acquireCloseoutLease({ ...commonOptions, now: () => 30_999 }, runtime),
    /PR_CLOSEOUT_LEASE_BUSY/u
  );

  acquireCloseoutLease({ ...commonOptions, now: () => 31_000 }, runtime);
  const owner = JSON.parse(fs.readFileSync(path.join(leaseDir, 'owner.json'), 'utf8'));
  assert.equal(owner.pid, 202);
  assert.equal(owner.token, 'successor-token');
  releaseCloseoutLease({}, runtime);
});

test('closeout lease recovers a stale recovery reservation', (t) => {
  const leaseRoot = fs.mkdtempSync(path.join(process.cwd(), '.tmp-pr-closeout-reservation-'));
  const leaseDir = path.join(leaseRoot, 'lease');
  const recoveryPath = path.join(leaseDir, 'recovery.json');
  const runtime = {};
  t.after(() => fs.rmSync(leaseRoot, { recursive: true, force: true }));
  fs.mkdirSync(leaseDir);
  fs.writeFileSync(
    recoveryPath,
    `${JSON.stringify({
      pid: 101,
      token: 'stale-recovery-token',
      processIdentity: 'test:stale-process',
    })}\n`,
    'utf8'
  );

  acquireCloseoutLease(
    {
      closeoutLeaseDir: leaseDir,
      processId: 202,
      createLeaseToken: () => 'successor-token',
      getProcessIdentity: () => 'test:successor-process',
      isProcessActive: () => false,
      closeoutLeaseInitializationGraceMs: 0,
    },
    runtime
  );

  const owner = JSON.parse(fs.readFileSync(path.join(leaseDir, 'owner.json'), 'utf8'));
  const reservation = JSON.parse(fs.readFileSync(recoveryPath, 'utf8'));
  assert.equal(owner.token, 'successor-token');
  assert.equal(reservation.token, 'successor-token');
  assert.equal(runtime.closeoutLeaseOwned, true);
  releaseCloseoutLease({}, runtime);
});

test('closeout lease bounds recovery of partially written owner files by the initialization grace', (t) => {
  const leaseRoot = fs.mkdtempSync(path.join(process.cwd(), '.tmp-pr-closeout-partial-owner-'));
  const ownerContents = ['', '{"pid":101', `${JSON.stringify({ pid: 101 })}\n`];
  t.after(() => fs.rmSync(leaseRoot, { recursive: true, force: true }));

  for (const [index, ownerContent] of ownerContents.entries()) {
    const leaseDir = path.join(leaseRoot, `lease-${index}`);
    const ownerPath = path.join(leaseDir, 'owner.json');
    const runtime = {};
    const commonOptions = {
      closeoutLeaseDir: leaseDir,
      processId: 202,
      createLeaseToken: () => `successor-token-${index}`,
      getProcessIdentity: getTestProcessIdentity,
      closeoutLeaseInitializationGraceMs: 30_000,
      isProcessActive: () => false,
      statSync: (target) => {
        assert.equal(target, ownerPath);
        return { mtimeMs: 1_000 };
      },
    };
    fs.mkdirSync(leaseDir);
    fs.writeFileSync(ownerPath, ownerContent, 'utf8');

    assert.throws(
      () => acquireCloseoutLease({ ...commonOptions, now: () => 30_999 }, runtime),
      /PR_CLOSEOUT_LEASE_BUSY/u
    );

    acquireCloseoutLease({ ...commonOptions, now: () => 31_000 }, runtime);
    const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
    assert.equal(owner.pid, 202);
    assert.equal(owner.token, `successor-token-${index}`);
    releaseCloseoutLease({}, runtime);
  }
});

test('closeout lease releases recovery when a live owner appears after reservation', (t) => {
  const leaseRoot = fs.mkdtempSync(path.join(process.cwd(), '.tmp-pr-closeout-interleave-'));
  const leaseDir = path.join(leaseRoot, 'lease');
  const recoveryPath = path.join(leaseDir, 'recovery.json');
  const runtime = {};
  t.after(() => fs.rmSync(leaseRoot, { recursive: true, force: true }));
  fs.mkdirSync(leaseDir);

  assert.throws(
    () =>
      acquireCloseoutLease(
        {
          closeoutLeaseDir: leaseDir,
          processId: 202,
          createLeaseToken: () => 'successor-token',
          getProcessIdentity: getTestProcessIdentity,
          closeoutLeaseInitializationGraceMs: 30_000,
          statSync: () => ({ mtimeMs: 1_000 }),
          now: () => 31_000,
          isProcessActive: (pid) => pid === 101,
          writeFileSync: (filePath, value, options) => {
            fs.writeFileSync(filePath, value, options);
            if (filePath === recoveryPath) {
              fs.writeFileSync(
                path.join(leaseDir, 'owner.json'),
                `${JSON.stringify({ pid: 101, token: 'live-token' })}\n`,
                'utf8'
              );
            }
          },
        },
        runtime
      ),
    /PR_CLOSEOUT_LEASE_BUSY/u
  );

  const owner = JSON.parse(fs.readFileSync(path.join(leaseDir, 'owner.json'), 'utf8'));
  assert.equal(owner.pid, 101);
  assert.equal(owner.token, 'live-token');
  assert.equal(runtime.closeoutLeaseOwned, undefined);
});

test('closeout lease keeps its public path reserved while a live owner appears', (t) => {
  const leaseRoot = fs.mkdtempSync(path.join(process.cwd(), '.tmp-pr-closeout-reserved-'));
  const leaseDir = path.join(leaseRoot, 'lease');
  const ownerPath = path.join(leaseDir, 'owner.json');
  const recoveryPath = path.join(leaseDir, 'recovery.json');
  const recovererRuntime = {};
  const thirdRuntime = {};
  let thirdError;
  let interleavingInjected = false;
  t.after(() => fs.rmSync(leaseRoot, { recursive: true, force: true }));
  fs.mkdirSync(leaseDir);

  const attemptThirdCloseout = () => {
    try {
      acquireCloseoutLease(
        {
          closeoutLeaseDir: leaseDir,
          processId: 303,
          createLeaseToken: () => 'third-token',
          getProcessIdentity: (pid) =>
            pid === 202 ? 'test:recoverer-process' : 'test:third-process',
          isProcessActive: (pid) => pid === 101 || pid === 202,
        },
        thirdRuntime
      );
    } catch (error) {
      thirdError = error;
    }
  };

  assert.throws(
    () =>
      acquireCloseoutLease(
        {
          closeoutLeaseDir: leaseDir,
          processId: 202,
          createLeaseToken: () => 'recoverer-token',
          getProcessIdentity: () => 'test:recoverer-process',
          closeoutLeaseInitializationGraceMs: 30_000,
          statSync: () => ({ mtimeMs: 1_000 }),
          now: () => 31_000,
          isProcessActive: (pid) => pid === 101,
          writeFileSync: (filePath, value, options) => {
            fs.writeFileSync(filePath, value, options);
            if (filePath === recoveryPath && !interleavingInjected) {
              interleavingInjected = true;
              attemptThirdCloseout();
              fs.writeFileSync(
                ownerPath,
                `${JSON.stringify({ pid: 101, token: 'live-token' })}\n`,
                'utf8'
              );
            }
          },
          renameSync: (source, target) => {
            if (source === leaseDir && !interleavingInjected) {
              interleavingInjected = true;
              fs.writeFileSync(
                ownerPath,
                `${JSON.stringify({ pid: 101, token: 'live-token' })}\n`,
                'utf8'
              );
              fs.renameSync(source, target);
              attemptThirdCloseout();
              return;
            }
            fs.renameSync(source, target);
          },
        },
        recovererRuntime
      ),
    /PR_CLOSEOUT_LEASE_BUSY/u
  );

  assert.match(thirdError?.message || '', /PR_CLOSEOUT_LEASE_BUSY/u);
  const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
  assert.equal(owner.pid, 101);
  assert.equal(owner.token, 'live-token');
  assert.equal(recovererRuntime.closeoutLeaseOwned, undefined);
  assert.equal(thirdRuntime.closeoutLeaseOwned, undefined);
});

test('closeout lease verifies its visible token before claiming ownership', (t) => {
  const leaseRoot = fs.mkdtempSync(path.join(process.cwd(), '.tmp-pr-closeout-visible-'));
  const leaseDir = path.join(leaseRoot, 'lease');
  const ownerPath = path.join(leaseDir, 'owner.json');
  const runtime = {};
  t.after(() => fs.rmSync(leaseRoot, { recursive: true, force: true }));

  assert.throws(
    () =>
      acquireCloseoutLease(
        {
          closeoutLeaseDir: leaseDir,
          processId: 101,
          createLeaseToken: () => 'initializer-token',
          getProcessIdentity: getTestProcessIdentity,
          writeFileSync: (filePath, value, options) => {
            fs.writeFileSync(filePath, value, options);
            if (filePath === ownerPath) {
              fs.writeFileSync(
                filePath,
                `${JSON.stringify({ pid: 202, token: 'visible-successor-token' })}\n`,
                'utf8'
              );
            }
          },
        },
        runtime
      ),
    /PR_CLOSEOUT_LEASE_OWNERSHIP_LOST/u
  );

  const owner = JSON.parse(fs.readFileSync(path.join(leaseDir, 'owner.json'), 'utf8'));
  assert.equal(owner.token, 'visible-successor-token');
  assert.equal(runtime.closeoutLeaseOwned, undefined);
});

test('closeout lease retries a vanished ownerless directory and fails closed on stat errors', (t) => {
  const leaseRoot = fs.mkdtempSync(path.join(process.cwd(), '.tmp-pr-closeout-stat-'));
  const vanishedLeaseDir = path.join(leaseRoot, 'vanished-lease');
  const unreadableLeaseDir = path.join(leaseRoot, 'unreadable-lease');
  const runtime = {};
  let mkdirAttempts = 0;
  t.after(() => fs.rmSync(leaseRoot, { recursive: true, force: true }));

  acquireCloseoutLease(
    {
      closeoutLeaseDir: vanishedLeaseDir,
      processId: 101,
      createLeaseToken: () => 'retry-token',
      getProcessIdentity: getTestProcessIdentity,
      mkdirSync: (target) => {
        mkdirAttempts += 1;
        if (mkdirAttempts === 1) {
          const error = new Error('already existed before it vanished');
          error.code = 'EEXIST';
          throw error;
        }
        fs.mkdirSync(target);
      },
      statSync: () => {
        const error = new Error('vanished');
        error.code = 'ENOENT';
        throw error;
      },
    },
    runtime
  );
  assert.equal(runtime.closeoutLeaseOwned, true);
  releaseCloseoutLease({}, runtime);

  fs.mkdirSync(unreadableLeaseDir);
  assert.throws(
    () =>
      acquireCloseoutLease({
        closeoutLeaseDir: unreadableLeaseDir,
        createLeaseToken: () => 'unreadable-token',
        statSync: () => {
          const error = new Error('access denied');
          error.code = 'EACCES';
          throw error;
        },
      }),
    /PR_CLOSEOUT_LEASE_READ_FAILED: access denied/u
  );
  assert.equal(fs.existsSync(unreadableLeaseDir), true);
});

test('closeout lease refuses to delete a successor token', (t) => {
  const leaseRoot = fs.mkdtempSync(path.join(process.cwd(), '.tmp-pr-closeout-token-'));
  const leaseDir = path.join(leaseRoot, 'lease');
  const runtime = {};
  t.after(() => fs.rmSync(leaseRoot, { recursive: true, force: true }));

  acquireCloseoutLease(
    {
      closeoutLeaseDir: leaseDir,
      processId: 101,
      createLeaseToken: () => 'original-token',
      getProcessIdentity: getTestProcessIdentity,
    },
    runtime
  );
  fs.writeFileSync(
    path.join(leaseDir, 'owner.json'),
    `${JSON.stringify({ pid: 202, token: 'successor-token' })}\n`,
    'utf8'
  );

  assert.throws(() => releaseCloseoutLease({}, runtime), /PR_CLOSEOUT_LEASE_OWNERSHIP_LOST/u);
  assert.equal(fs.existsSync(leaseDir), true);
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
  assert.ok(indexOf(ids, 'planning-db-health') < indexOf(ids, 'planning-db-migrate'));
  assert.ok(indexOf(ids, 'planning-db-migrate') < indexOf(ids, 'planning-db-import'));
  assert.ok(indexOf(ids, 'planning-db-import') < indexOf(ids, 'docs-status-repository-map'));
  assert.ok(indexOf(ids, 'docs-status-repository-map') < indexOf(ids, 'commit'));
  assert.ok(indexOf(ids, 'docs-status-repository-map') < indexOf(ids, 'assert-no-unstaged'));
  assert.ok(indexOf(ids, 'assert-no-unstaged') < indexOf(ids, 'commit'));
  assert.ok(indexOf(ids, 'verify-prepush') < indexOf(ids, 'planning-db-release'));
  assert.equal(
    commandLabel(plan.find((step) => step.id === 'docs-status-code-state')),
    'pnpm docs:status:generate --code-state-only'
  );
  assert.equal(
    commandLabel(plan.find((step) => step.id === 'planning-db-health')),
    'pnpm planning:db:health --wait'
  );
  assert.equal(
    commandLabel(plan.find((step) => step.id === 'docs-status-repository-map')),
    'pnpm docs:status:generate --repository-map-only'
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
  assert.ok(indexOf(ids, 'planning-db-migrate') < indexOf(ids, 'governance-refresh'));
  assert.ok(indexOf(ids, 'governance-refresh') < indexOf(ids, 'planning-db-release'));
  assert.equal(ids.includes('planning-db-import'), false);
  assert.equal(ids.includes('docs-status-repository-map'), false);
});

test('buildPrCloseoutPlan prepares Repository Map for workspace manifest-only changes', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['pnpm-workspace.yaml'],
    stagedFiles: ['pnpm-workspace.yaml'],
    commit,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'docs-status-code-state') < indexOf(ids, 'planning-db-up'));
  assert.ok(indexOf(ids, 'planning-db-health') < indexOf(ids, 'planning-db-migrate'));
  assert.ok(indexOf(ids, 'planning-db-import') < indexOf(ids, 'docs-status-repository-map'));
  assert.ok(indexOf(ids, 'docs-status-repository-map') < indexOf(ids, 'commit'));
});

test('buildPrCloseoutPlan prepares Repository Map for canonical-binding inputs', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['docs/contracts/index.md'],
    stagedFiles: ['docs/contracts/index.md'],
    commit,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'planning-db-ownership') < indexOf(ids, 'planning-db-up'));
  assert.ok(indexOf(ids, 'planning-db-migrate') < indexOf(ids, 'planning-db-import'));
  assert.ok(indexOf(ids, 'planning-db-import') < indexOf(ids, 'docs-status-repository-map'));
  assert.ok(indexOf(ids, 'docs-status-repository-map') < indexOf(ids, 'commit'));
  assert.ok(indexOf(ids, 'verify-prepush') < indexOf(ids, 'planning-db-release'));
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
    assert.ok(ids.includes('docs-status-repository-map'), filePath);
    assert.ok(indexOf(ids, 'verify-prepush') < indexOf(ids, 'planning-db-release'), filePath);
  }
});

test('buildPrCloseoutPlan prepares Planning DB for every full prepush invocation', () => {
  const plan = buildPrCloseoutPlan({
    changedFiles: ['eslint.config.cjs'],
    stagedFiles: ['eslint.config.cjs'],
    commit,
  });
  const ids = stepIds(plan);

  assert.ok(indexOf(ids, 'planning-db-ownership') < indexOf(ids, 'planning-db-up'));
  assert.ok(indexOf(ids, 'planning-db-up') < indexOf(ids, 'planning-db-health'));
  assert.ok(indexOf(ids, 'planning-db-health') < indexOf(ids, 'planning-db-migrate'));
  assert.ok(indexOf(ids, 'planning-db-migrate') < indexOf(ids, 'commit'));
  assert.ok(indexOf(ids, 'commit') < indexOf(ids, 'verify-prepush'));
  assert.ok(indexOf(ids, 'verify-prepush') < indexOf(ids, 'planning-db-release'));
  assert.equal(ids.includes('governance-refresh'), false);
  assert.equal(ids.includes('docs-status-repository-map'), false);
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

  assert.equal(calls[0].endsWith(' docs:sync'), true);
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
