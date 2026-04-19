import { vi } from 'vitest';

import type {
  ILineageOutboxStore,
  ILineageSink,
  ILineageStepEventMapper,
  LineageOutboxRecord,
} from '../../../src/lineage/contracts.js';
import type { LineageWorkerRuntimeLogger } from '../../../src/lineage/LineageWorkerRuntime.js';

export type LineageTestStore = ILineageOutboxStore & {
  countPending: ReturnType<typeof vi.fn>;
  markDelivered: ReturnType<typeof vi.fn>;
  markFailed: ReturnType<typeof vi.fn>;
  listDeadLetter: ReturnType<typeof vi.fn>;
  countDeadLetter: ReturnType<typeof vi.fn>;
  replayDeadLetters: ReturnType<typeof vi.fn>;
};

export function makeRecord(overrides: Partial<LineageOutboxRecord> = {}): LineageOutboxRecord {
  return {
    id: overrides.id ?? 'lox-run-1-1-0',
    tenantId: overrides.tenantId ?? 'tenant-a',
    runId: overrides.runId ?? 'run-1',
    eventType: overrides.eventType ?? 'StepStarted',
    payload:
      overrides.payload ??
      ({
        eventType: 'StepStarted',
        runId: 'run-1',
        eventSequence: 1,
      } as unknown as LineageOutboxRecord['payload']),
    attempts: overrides.attempts ?? 0,
    createdAt: overrides.createdAt ?? '2026-03-15T00:00:00.000Z',
  };
}

export function makeSilentLogger(): LineageWorkerRuntimeLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

export function makeStore(pending: LineageOutboxRecord[] = []): LineageTestStore {
  return {
    enqueue: vi.fn().mockResolvedValue(undefined),
    listPending: vi.fn().mockResolvedValue(pending),
    countPending: vi.fn().mockResolvedValue(pending.length),
    markDelivered: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue('retry_scheduled'),
    listDeadLetter: vi.fn().mockResolvedValue([]),
    countDeadLetter: vi.fn().mockResolvedValue(0),
    replayDeadLetters: vi.fn().mockResolvedValue(0),
  };
}

export function makeMapper(supports = true): ILineageStepEventMapper {
  return {
    supports: vi.fn().mockReturnValue(supports),
    map: vi.fn().mockResolvedValue({ jobFacets: { sql: { query: 'SELECT 1' } }, warnings: [] }),
  };
}

export function makeSink(throwError?: Error): ILineageSink {
  return {
    publish: throwError
      ? vi.fn().mockRejectedValue(throwError)
      : vi.fn().mockResolvedValue(undefined),
  };
}
