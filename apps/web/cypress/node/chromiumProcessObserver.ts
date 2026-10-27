/** Owned concern: own a bounded Linux observer and publish only its validated metadata. */
import { type ChildProcessWithoutNullStreams } from 'node:child_process';
import {
  closeSync,
  constants,
  fstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';

import { randomUuidV4 } from '@dvt/crypto';
import { z } from 'zod';

const integer = z.number().int().nonnegative();
const identity = {
  pid: integer.positive(),
  browserPid: integer.positive(),
  role: z.enum(['browser', 'network-service', 'owned-child', 'owned-child-unknown']),
  birthtimeTicks: integer.nullable(),
  timestampNs: z.string().regex(/^\d+$/u),
};
const exit = {
  ...identity,
  kind: z.literal('process-exit'),
  tid: integer.positive(),
  parentNotification: integer,
};
const message = z.union([
  z.object({ kind: z.literal('ready'), rootPid: integer.positive() }),
  z.object({
    ...exit,
    exitCode: integer.max(255),
    signal: z.never().optional(),
    coreDumped: z.never().optional(),
  }),
  z.object({
    ...exit,
    signal: integer.positive().max(126),
    coreDumped: z.boolean(),
    exitCode: z.never().optional(),
  }),
  z.object({
    kind: z.literal('kernel-oom-victim'),
    victimPid: integer.positive(),
    timestampNs: z.string().regex(/^\d+$/u),
    clock: z.literal('kernel-log'),
    correlation: z.literal('pid-only'),
  }),
  z
    .object({
      kind: z.literal('signal-generation'),
      targetTid: integer.positive(),
      targetProcessCandidatePid: integer.positive(),
      generatorTid: integer,
      timestampNs: z.string().regex(/^\d+$/u),
      precisionNs: z.union([z.literal(1), z.literal(1000)]),
      signal: z.literal(9),
      signalCode: z.number().int(),
      signalErrno: z.number().int(),
      group: z.boolean(),
      result: integer.max(4),
      correlation: z.literal('pid-only'),
    })
    .and(
      z.discriminatedUnion('generatorCorrelation', [
        z.object({
          generatorCorrelation: z.literal('pid-only-after-event'),
          generatorCategory: z.enum([
            'chromium',
            'cypress',
            'node',
            'systemd-oomd',
            'earlyoom',
            'systemd',
            'other',
          ]),
          generatorSnapshotPid: integer.positive(),
          generatorSnapshotBirthtimeTicks: integer,
        }),
        z.object({
          generatorCorrelation: z.literal('unavailable'),
          generatorCategory: z.literal('unknown'),
          generatorSnapshotPid: z.never().optional(),
          generatorSnapshotBirthtimeTicks: z.never().optional(),
        }),
      ])
    ),
  z
    .object({
      kind: z.literal('userspace-oom-report'),
      daemonPid: integer.positive(),
      timestampNs: z.string().regex(/^\d+$/u),
    })
    .and(
      z.discriminatedUnion('daemon', [
        z.object({
          daemon: z.literal('systemd-oomd'),
          action: z.literal('cgroup-kill-report'),
          correlation: z.literal('runner-interval-only'),
          signal: z.never().optional(),
          victimPid: z.never().optional(),
        }),
        z.object({
          daemon: z.literal('earlyoom'),
          action: z.literal('signal-attempt'),
          correlation: z.literal('pid-only'),
          signal: z.union([z.literal(9), z.literal(15)]),
          victimPid: integer.positive(),
        }),
      ])
    ),
  z.object({
    kind: z.literal('userspace-oom-coverage'),
    entriesRead: integer.max(200),
    reportsRetained: integer.max(200),
    scope: z.literal('systemd-oomd-and-earlyoom'),
    startedNs: z.string().regex(/^\d+$/u),
    endedNs: z.string().regex(/^\d+$/u),
  }),
  z.object({
    kind: z.literal('coverage-gap'),
    source: z.enum(['process-events', 'kernel-oom', 'signal-generation', 'userspace-oom']),
    reason: z.enum([
      'sequence-gap',
      'records-lost',
      'drain-limit',
      'browser-not-observed',
      'network-service-not-observed',
      'signal-not-observed',
    ]),
  }),
  z.object({
    kind: z.literal('unavailable'),
    source: z.enum([
      'process-events',
      'kernel-oom',
      'signal-generation',
      'userspace-oom',
      'observation',
    ]),
  }),
  z.object({ kind: z.literal('complete'), incomplete: z.boolean() }),
]);

type Lease = Readonly<{
  version: 1;
  purpose: 'probe' | 'observe' | 'canary';
  generation: string;
  controller: { pid: number; birthtimeTicks: string };
  leader: { pid: number; birthtimeTicks: string; processGroupId: number; sessionId: number };
  leaderProcReference: { ownerFd: number; device: string; inode: string };
  capture: { path: string; device: string; inode: string };
}>;
type TraceReceipt = Readonly<{
  generation: string;
  rootKind: 'tracefs' | 'debug-tracing';
  name: string;
  device: string;
  inode: string;
}>;
type ProcessHandle = {
  child: ChildProcessWithoutNullStreams;
  completion: Promise<{ code: number | null; signal: string | null }>;
};
type OwnedObserver = {
  workspaceRoot: string;
  handle: ProcessHandle;
  lease: Lease;
  closed: Promise<{ code: number | null; signal: string | null }>;
  release(): void;
};
type SignalBudget = { deadline: number; signal?: AbortSignal };
type ObserverOptions = Readonly<{ workspaceRoot: string; captureRoot: string }>;
type ObserverPort = Readonly<{
  platform: string;
  pid: number;
  open(
    options: ObserverOptions,
    purpose: Lease['purpose'],
    budget: SignalBudget
  ): Promise<OwnedObserver>;
  control(
    owned: OwnedObserver,
    action: { signal: number } | { trace: TraceReceipt },
    budget: SignalBudget
  ): Promise<string>;
  terminate(owned: OwnedObserver, budget: SignalBudget): Promise<boolean>;
}>;

function processIdentity(pid: number): {
  birthtimeTicks: string;
  parentPid: number;
  processGroupId: number;
  sessionId: number;
} {
  const text = readFileSync(`/proc/${pid}/stat`, 'utf8');
  const fields = text
    .slice(text.lastIndexOf(')') + 2)
    .trim()
    .split(/\s+/u);
  const birthtimeTicks = fields[19];
  if (birthtimeTicks === undefined || !/^\d+$/u.test(birthtimeTicks))
    throw new Error('Invalid owned process identity');
  return {
    birthtimeTicks,
    parentPid: Number(fields[1]),
    processGroupId: Number(fields[2]),
    sessionId: Number(fields[3]),
  };
}

function lifetime(workspaceRoot: string): {
  spawnLiveProofProcess(
    name: string,
    command: string,
    args: string[],
    options: object
  ): ProcessHandle;
  terminateLiveProofProcess(handle: ProcessHandle, options?: object): Promise<void>;
} {
  return createRequire(join(workspaceRoot, 'package.json'))(
    './scripts/live-proof-process.cjs'
  ) as ReturnType<typeof lifetime>;
}

async function within<T>(operation: Promise<T>, deadline: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Owned observer deadline exceeded')),
          Math.max(0, deadline - Date.now())
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function spawnOwned(
  options: ObserverOptions,
  mode: string[]
): { handle: ProcessHandle; closed: OwnedObserver['closed'] } {
  const handle = lifetime(options.workspaceRoot).spawnLiveProofProcess(
    'Chromium process observer',
    'sudo',
    [
      '-n',
      '--',
      '/usr/bin/python3',
      '-I',
      '-B',
      join(options.workspaceRoot, 'apps/web/cypress/node/linuxChromiumProcessObserver.py'),
      ...mode,
    ],
    { stdio: ['pipe', 'pipe', 'pipe'], env: { PATH: '/usr/bin:/bin' }, shell: false }
  );
  const closed = new Promise<{ code: number | null; signal: string | null }>((resolve, reject) => {
    handle.child.once('error', () => reject(new Error('Owned observer could not start')));
    handle.child.once('close', (code, signal) => resolve({ code, signal }));
  });
  void closed.catch(() => undefined);
  handle.child.stderr.resume();
  return { handle, closed };
}

async function openNativeObserver(
  options: ObserverOptions,
  purpose: Lease['purpose'],
  budget: SignalBudget
): Promise<OwnedObserver> {
  if (Date.now() >= budget.deadline) throw new Error('Owned observer startup deadline exceeded');
  const owned = spawnOwned(options, []);
  let descriptor: number | undefined;
  try {
    const pid = owned.handle.child.pid;
    if (!pid) throw new Error('Missing owned observer identity');
    descriptor = openSync(
      `/proc/${pid}`,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
    );
    const before = processIdentity(pid);
    const reference = fstatSync(descriptor, { bigint: true });
    const capture = statSync(options.captureRoot, { bigint: true });
    const after = processIdentity(pid);
    if (
      before.birthtimeTicks !== after.birthtimeTicks ||
      before.parentPid !== process.pid ||
      after.processGroupId !== pid ||
      after.sessionId !== pid
    )
      throw new Error('Unowned observer process group');
    const generation =
      basename(options.captureRoot).slice('dvt-chromium-network-'.length) +
      (purpose !== 'observe' ? '-' + purpose : '');
    if (!/^[A-Za-z0-9-]{6,80}$/u.test(generation))
      throw new Error('Invalid owned capture generation');
    const lease: Lease = {
      version: 1,
      purpose,
      generation,
      controller: { pid: process.pid, birthtimeTicks: processIdentity(process.pid).birthtimeTicks },
      leader: { pid, birthtimeTicks: before.birthtimeTicks, processGroupId: pid, sessionId: pid },
      leaderProcReference: {
        ownerFd: descriptor,
        device: String(reference.dev),
        inode: String(reference.ino),
      },
      capture: {
        path: options.captureRoot,
        device: String(capture.dev),
        inode: String(capture.ino),
      },
    };
    const pinned = descriptor;
    return {
      ...owned,
      workspaceRoot: options.workspaceRoot,
      lease,
      release: () => closeSync(pinned),
    };
  } catch (error) {
    owned.handle.child.stdin.end();
    try {
      await within(owned.closed, Math.min(budget.deadline, Date.now() + 10_000));
    } catch (cleanup) {
      throw new AggregateError([error, cleanup], 'Observer bootstrap and cleanup failed', {
        cause: cleanup,
      });
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
    }
    throw error;
  }
}

async function controlNativeObserver(
  owned: OwnedObserver,
  action: { signal: number } | { trace: TraceReceipt },
  budget: SignalBudget
): Promise<string> {
  if (Date.now() >= budget.deadline || budget.signal?.aborted)
    throw new Error('Privileged observer control deadline exceeded');
  const options = { workspaceRoot: owned.workspaceRoot, captureRoot: owned.lease.capture.path };
  const rpc = spawnOwned(options, ['--control']);
  let output = '';
  let failed = false;
  const abort = (): void => {
    rpc.handle.child.stdin.destroy();
  };
  budget.signal?.addEventListener('abort', abort, { once: true });
  rpc.handle.child.stdout.setEncoding('utf8');
  rpc.handle.child.stdout.on('data', (chunk: string) => {
    output += chunk;
    if (output.length > 8192) {
      failed = true;
      abort();
    }
  });
  rpc.handle.child.stdin.on('error', () => {
    failed = true;
  });
  rpc.handle.child.stdin.end(
    JSON.stringify({
      action: 'signal' in action ? 'signal-owned-group' : 'dispose-owned-trace',
      lease: owned.lease,
      ...action,
    }) + '\n'
  );
  try {
    const result = await within(rpc.closed, budget.deadline);
    if (failed || result.code !== 0 || result.signal !== null)
      throw new Error('Privileged observer control denied');
    const receipt = z
      .object({ state: z.enum(['alive', 'gone', 'removed', 'absent']) })
      .strict()
      .parse(JSON.parse(output));
    if (
      ('signal' in action && !['alive', 'gone'].includes(receipt.state)) ||
      ('trace' in action && !['removed', 'absent'].includes(receipt.state))
    )
      throw new Error('Invalid privileged control receipt');
    return receipt.state;
  } catch (error) {
    abort();
    // The helper has its own fixed five-second alarm. A failure to observe its
    // close is retained as unknown cleanup, never a successful retirement.
    try {
      await within(rpc.closed, budget.deadline);
    } catch (cleanup) {
      throw new AggregateError([error, cleanup], 'Privileged observer control cleanup unknown', {
        cause: cleanup,
      });
    }
    throw error;
  } finally {
    budget.signal?.removeEventListener('abort', abort);
  }
}

async function terminateNativeObserver(
  owned: OwnedObserver,
  budget: SignalBudget
): Promise<boolean> {
  let signalled = false;
  await lifetime(owned.workspaceRoot).terminateLiveProofProcess(owned.handle, {
    platform: 'linux',
    gracefulTimeoutMs: 5_000,
    forceTimeoutMs: 5_000,
    deadline: budget.deadline,
    kill: async (_pid: number, requested: number | string, budget: SignalBudget) => {
      const signal = requested === 'SIGTERM' ? 15 : requested === 'SIGKILL' ? 9 : 0;
      signalled ||= signal !== 0;
      const state = await controlNativeObserver(owned, { signal }, budget);
      if (state === 'gone')
        throw Object.assign(new Error('Owned group retired'), { code: 'ESRCH' });
      if (state !== 'alive') throw new Error('Invalid group signal receipt');
    },
  });
  return signalled;
}

const nativePort: ObserverPort = {
  platform: process.platform,
  pid: process.pid,
  open: openNativeObserver,
  control: controlNativeObserver,
  terminate: terminateNativeObserver,
};
export type ChromiumProcessObserverBinding = Readonly<{ stop(): Promise<void> }>;

export async function startChromiumProcessObserver(
  options: ObserverOptions,
  port: ObserverPort = nativePort
): Promise<ChromiumProcessObserverBinding | null> {
  if (port.platform !== 'linux') return null;
  const startupDeadline = Date.now() + 20_000;
  const openSession = async (
    purpose: Lease['purpose']
  ): Promise<ChromiumProcessObserverBinding & { owned: OwnedObserver }> => {
    const owned = await port.open(options, purpose, { deadline: startupDeadline });
    const child = owned.handle.child;
    const records: z.infer<typeof message>[] = [];
    const allocated = new Set<string>();
    const traces = new Map<string, TraceReceipt>();
    let ownership = false;
    let ready = false;
    let complete = false;
    let failed = false;
    let pending = '';
    let resolveReady!: () => void;
    let rejectReady!: (error: Error) => void;
    const readiness = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    void readiness.catch(() => undefined);
    const closeInput = (): void => {
      if (!child.stdin.writableEnded) child.stdin.end();
    };
    const rejectProtocol = (): void => {
      failed = true;
      pending = '';
      closeInput();
      rejectReady(new Error('Linux Chromium process diagnostics unavailable'));
    };
    child.stdin.on('error', rejectProtocol);
    void owned.closed.then(() => {
      if (!ready) rejectProtocol();
    }, rejectProtocol);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      pending += chunk;
      if (pending.length > 1_048_576) {
        rejectProtocol();
        return;
      }
      while (pending.includes('\n')) {
        const boundary = pending.indexOf('\n');
        const line = pending.slice(0, boundary);
        pending = pending.slice(boundary + 1);
        try {
          const raw: unknown = JSON.parse(line);
          const kind = z.object({ kind: z.string() }).parse(raw).kind;
          if (kind === 'ownership') {
            const receipt = z
              .object({
                kind: z.literal('ownership'),
                generation: z.literal(owned.lease.generation),
              })
              .strict()
              .parse(raw);
            if (ownership || receipt.generation !== owned.lease.generation)
              throw new Error('Repeated ownership');
            ownership = true;
            void port.control(owned, { signal: 0 }, { deadline: startupDeadline }).then((state) => {
              if (state !== 'alive' || failed) {
                rejectProtocol();
                return;
              }
              child.stdin.write(
                JSON.stringify({ action: 'admit', generation: owned.lease.generation }) + '\n'
              );
            }, rejectProtocol);
            continue;
          }
          if (kind === 'trace-allocation' || kind === 'trace-acquired') {
            const generation = z.object({ generation: z.string() }).parse(raw).generation;
            if (
              purpose === 'canary' ||
              !ownership ||
              ready ||
              ![
                owned.lease.generation,
                ...(purpose === 'probe' ? [owned.lease.generation + '-canary'] : []),
              ].includes(generation)
            )
              throw new Error('Foreign trace allocation');
            if (kind === 'trace-allocation') {
              z.object({ kind: z.literal('trace-allocation'), generation: z.string() })
                .strict()
                .parse(raw);
              if (allocated.has(generation)) throw new Error('Repeated trace allocation');
              allocated.add(generation);
            } else {
              const receipt = z
                .object({
                  kind: z.literal('trace-acquired'),
                  generation: z.string(),
                  rootKind: z.enum(['tracefs', 'debug-tracing']),
                  name: z.literal('dvt-signal-' + generation),
                  device: z.string().regex(/^\d+$/u),
                  inode: z.string().regex(/^\d+$/u),
                })
                .strict()
                .parse(raw);
              if (!allocated.has(generation) || traces.has(generation))
                throw new Error('Unacknowledged trace acquisition');
              const { kind: _kind, ...trace } = receipt;
              traces.set(generation, trace);
            }
            continue;
          }
          if (purpose !== 'observe') {
            z.object({ kind: z.literal(purpose === 'probe' ? 'probe-ready' : 'canary-ready') })
              .strict()
              .parse(raw);
            if (!ownership || ready || traces.size !== (purpose === 'probe' ? 2 : 0))
              throw new Error('Invalid native group probe');
            ready = true;
            resolveReady();
            continue;
          }
          const record = message.parse(raw);
          if (records.length >= 10_000 || complete) throw new Error('Observer record limit');
          if (record.kind === 'ready') {
            if (!ownership || ready || traces.size !== 1 || record.rootPid !== port.pid)
              throw new Error('Invalid readiness identity');
            ready = true;
            resolveReady();
          } else if (record.kind === 'unavailable') {
            records.push(record);
            rejectProtocol();
            return;
          } else if (!ready) throw new Error('Observation before readiness');
          if (record.kind === 'complete') {
            complete = true;
            failed ||= record.incomplete;
          }
          if (record.kind === 'coverage-gap') failed = true;
          records.push(record);
        } catch {
          rejectProtocol();
          return;
        }
      }
    });
    let stopping: Promise<void> | undefined;
    const stop = (): Promise<void> => {
      stopping ??= (async () => {
        const errors: unknown[] = [];
        let retired = false;
        let forced = purpose === 'probe' && ready;
        try {
          if (forced) {
            const exited = await within(owned.handle.completion, startupDeadline);
            if (
              exited.code !== 0 ||
              exited.signal !== null ||
              (await port.control(owned, { signal: 0 }, { deadline: startupDeadline })) !== 'alive'
            )
              throw new Error('Native leader-exit group capability failed');
            if (
              (await port.control(owned, { signal: 9 }, { deadline: startupDeadline })) !== 'alive'
            )
              throw new Error('Native owned SIGKILL probe failed');
          } else closeInput();
          try {
            await within(
              owned.closed,
              Math.min(purpose !== 'observe' ? startupDeadline : Infinity, Date.now() + 10_000)
            );
          } catch {
            forced = true;
          }
          const deadline = Math.min(
            Date.now() + 10_000,
            purpose !== 'observe' ? startupDeadline : Infinity
          );
          forced = (await port.terminate(owned, { deadline })) || forced;
          const closed = await within(owned.closed, deadline);
          retired = true;
          if (purpose === 'observe')
            failed ||=
              forced ||
              closed.code !== 0 ||
              closed.signal !== null ||
              !complete ||
              pending.length !== 0;
          if ([...allocated].some((generation) => !traces.has(generation)))
            throw new Error('Trace resource cleanup unknown: acquisition receipt missing');
          if (purpose === 'probe' && ready) {
            const first = traces.get(owned.lease.generation)!;
            const canary = traces.get(owned.lease.generation + '-canary')!;
            let denied = false;
            try {
              await port.control(
                owned,
                { trace: { ...first, device: canary.device, inode: canary.inode } },
                { deadline: startupDeadline }
              );
            } catch {
              denied = true;
            }
            if (!denied) throw new Error('Foreign trace canary was not protected');
          }
          for (const trace of traces.values()) {
            const state = await port.control(
              owned,
              { trace },
              { deadline: purpose === 'probe' ? startupDeadline : Date.now() + 5_000 }
            );
            if (
              !['removed', 'absent'].includes(state) ||
              (purpose === 'probe' && ready && state !== 'removed')
            )
              throw new Error('Private trace disposal unconfirmed');
          }
        } catch (error) {
          failed = true;
          errors.push(error);
          closeInput();
          try {
            await within(owned.closed, Math.min(startupDeadline, Date.now() + 10_000));
          } catch (cleanup) {
            errors.push(cleanup);
          }
        } finally {
          if (purpose === 'observe') {
            try {
              const directory = join(options.workspaceRoot, '.dvt/evidence/chromium-network');
              mkdirSync(directory, { recursive: true });
              writeFileSync(
                join(directory, `processes-${randomUuidV4()}.json`),
                JSON.stringify({
                  schemaVersion: 1,
                  observer: 'linux-process-connector',
                  rootPid: port.pid,
                  state: !ready ? 'unavailable' : failed ? 'incomplete' : 'complete',
                  records,
                }),
                { flag: 'wx' }
              );
            } catch (error) {
              failed = true;
              errors.push(error);
            }
          }
          if (retired) owned.release();
        }
        if (failed || errors.length)
          throw new AggregateError(
            errors,
            ready
              ? 'Linux Chromium process diagnostics incomplete'
              : 'Linux Chromium process diagnostics unavailable'
          );
      })();
      return stopping;
    };
    child.stdin.write(JSON.stringify(owned.lease) + '\n');
    try {
      await within(readiness, startupDeadline);
    } catch (error) {
      try {
        await stop();
      } catch (cleanup) {
        throw new AggregateError(
          [error, cleanup],
          'Linux Chromium process diagnostics unavailable',
          { cause: cleanup }
        );
      }
      throw error;
    }
    return { stop, owned };
  };
  const canary = await openSession('canary');
  const errors: unknown[] = [];
  let probe: Awaited<ReturnType<typeof openSession>> | undefined;
  try {
    probe = await openSession('probe');
    const wrongDescriptor = {
      ...probe.owned,
      lease: {
        ...probe.owned.lease,
        leaderProcReference: {
          ...probe.owned.lease.leaderProcReference,
          ownerFd: canary.owned.lease.leaderProcReference.ownerFd,
        },
      },
    };
    let denied = false;
    try {
      await port.control(wrongDescriptor, { signal: 9 }, { deadline: startupDeadline });
    } catch {
      denied = true;
    }
    if (
      !denied ||
      (await port.control(canary.owned, { signal: 0 }, { deadline: startupDeadline })) !== 'alive'
    )
      throw new Error('Unrelated owned process canary was not protected');
  } catch (error) {
    errors.push(error);
  }
  for (const binding of [probe, canary]) {
    if (!binding) continue;
    try {
      await binding.stop();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length)
    throw new AggregateError(errors, 'Linux Chromium process diagnostics unavailable');
  return openSession('observe');
}
