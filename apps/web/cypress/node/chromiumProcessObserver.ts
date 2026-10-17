/** Owned concern: own a bounded Linux observer and publish only its validated metadata. */
import {
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithoutStdio,
} from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

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

type ObserverPort = Readonly<{
  platform: string;
  pid: number;
  start(
    command: string,
    args: readonly string[],
    options: SpawnOptionsWithoutStdio
  ): ChildProcessWithoutNullStreams;
}>;
const nativePort: ObserverPort = { platform: process.platform, pid: process.pid, start: spawn };
export type ChromiumProcessObserverBinding = Readonly<{ stop(): Promise<void> }>;

export async function startChromiumProcessObserver(
  options: Readonly<{ workspaceRoot: string; captureRoot: string }>,
  port: ObserverPort = nativePort
): Promise<ChromiumProcessObserverBinding | null> {
  if (port.platform !== 'linux') return null;
  const child = port.start(
    'sudo',
    [
      '-n',
      '--',
      '/usr/bin/python3',
      '-I',
      '-B',
      join(options.workspaceRoot, 'apps/web/cypress/node/linuxChromiumProcessObserver.py'),
      String(port.pid),
      options.captureRoot,
    ],
    { env: { PATH: '/usr/bin:/bin' }, shell: false }
  );
  const records: z.infer<typeof message>[] = [];
  let ready = false;
  let complete = false;
  let failed = false;
  let published = false;
  let pending = '';
  let resolveReady: () => void;
  let rejectReady: (error: Error) => void;
  const readiness = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const closeInput = (): void => {
    if (!child.stdin.writableEnded) child.stdin.end();
  };
  const rejectProtocol = (): void => {
    failed = true;
    pending = '';
    closeInput();
  };
  const closed = new Promise<void>((resolve) => {
    child.once('error', () => {
      failed = true;
    });
    child.stdin.once('error', () => {
      failed = true;
    });
    child.once('close', (code, signal) => {
      failed ||= code !== 0 || signal !== null || !complete || pending.length !== 0;
      try {
        const directory = join(options.workspaceRoot, '.dvt/evidence/chromium-network');
        mkdirSync(directory, { recursive: true });
        writeFileSync(
          join(directory, `processes-${basename(options.captureRoot)}.json`),
          JSON.stringify({
            schemaVersion: 1,
            observer: 'linux-process-connector',
            rootPid: port.pid,
            state: !ready ? 'unavailable' : failed ? 'incomplete' : 'complete',
            records,
          }),
          { flag: 'wx' }
        );
        published = true;
      } catch {
        failed = true;
      }
      if (!ready) rejectReady(new Error('Linux Chromium process diagnostics unavailable'));
      resolve();
    });
  });
  child.stderr.resume();
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
        const record = message.parse(JSON.parse(line));
        if (records.length >= 10_000 || complete) {
          rejectProtocol();
          return;
        }
        if (record.kind === 'ready') {
          if (ready || record.rootPid !== port.pid) {
            rejectProtocol();
            return;
          }
          ready = true;
          records.push(record);
          resolveReady();
          continue;
        }
        if (record.kind === 'unavailable') {
          records.push(record);
          rejectProtocol();
          return;
        }
        if (!ready) {
          rejectProtocol();
          return;
        }
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
  await readiness;
  return {
    async stop() {
      closeInput();
      await closed;
      if (failed || !published) throw new Error('Linux Chromium process diagnostics incomplete');
    },
  };
}
