import { asIsoUtcString, type EventEnvelope } from '@dvt/contracts';
import type { OutboxRecord, OutboxTickResult } from '@dvt/delivery';

import { OutboxWorkerMonitor } from '../../src/ops/OutboxWorkerMonitor.js';
import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

export type MonitorLogEntry = {
  level: 'info' | 'warn' | 'error';
  msg?: string;
  data: Record<string, unknown>;
};

export type MonitorTestHarness = {
  clock: { nowMs: number };
  monitor: OutboxWorkerMonitor;
  entries: MonitorLogEntry[];
};

const DEFAULT_SERVICE_NAME = 'dvt-outbox-worker';
const DEFAULT_NOW_MS = 1_741_392_000_000;

export function createMonitorHarness(
  options: { nowMs?: number; readyStaleAfterMs?: number; serviceName?: string } = {}
): MonitorTestHarness {
  const clock = { nowMs: options.nowMs ?? DEFAULT_NOW_MS };
  const { logger, entries } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: options.serviceName ?? DEFAULT_SERVICE_NAME,
    logger,
    nowMs: () => clock.nowMs,
    ...(options.readyStaleAfterMs === undefined
      ? {}
      : { readyStaleAfterMs: options.readyStaleAfterMs }),
  });

  return { clock, monitor, entries };
}

export function makeLogger(): {
  logger: OutboxWorkerRuntimeLogger;
  entries: MonitorLogEntry[];
} {
  const entries: MonitorLogEntry[] = [];
  return {
    logger: {
      info(data, msg) {
        entries.push(msg === undefined ? { level: 'info', data } : { level: 'info', data, msg });
      },
      warn(data, msg) {
        entries.push(msg === undefined ? { level: 'warn', data } : { level: 'warn', data, msg });
      },
      error(data, msg) {
        entries.push(msg === undefined ? { level: 'error', data } : { level: 'error', data, msg });
      },
    },
    entries,
  };
}

export function makeTick(overrides: Partial<OutboxTickResult> = {}): OutboxTickResult {
  return {
    claimedCount: 0,
    deliveredCount: 0,
    retriedCount: 0,
    deadLetteredCount: 0,
    oldestClaimedAgeMs: null,
    retryBacklogActive: false,
    ...overrides,
  };
}

export function makeEvent(id: string): EventEnvelope {
  return {
    eventId: `evt-${id}`,
    eventType: 'RunQueued',
    runId: 'run-1',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'dev',
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: asIsoUtcString('2026-03-08T00:00:00.000Z'),
    idempotencyKey: `key-${id}`,
    payloadVersion: 1,
    runSeq: 1,
    persistedAt: asIsoUtcString('2026-03-08T00:00:00.000Z'),
  };
}

export function makeRecord(
  id: string,
  createdAt = '2026-03-08T00:00:00.000Z',
  attempts = 0
): OutboxRecord {
  return {
    id,
    createdAt,
    idempotencyKey: `key-${id}`,
    payload: makeEvent(id),
    attempts,
  };
}
