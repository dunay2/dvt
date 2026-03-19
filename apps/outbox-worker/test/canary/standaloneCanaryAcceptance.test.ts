import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { describe, it, expect } from 'vitest';

import { PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import {
  MAX_OUTBOX_ATTEMPTS,
  type EventEnvelope as RunEventPersisted,
  type OutboxRecord,
} from '@dvt/contracts';

import { closePgPool } from '../../src/db/pool.js';
import { runOutboxWorkerHost } from '../../src/host/runOutboxWorkerHost.js';
import { createOperationalServer } from '../../src/ops/OperationalServer.js';
import { OutboxWorkerMonitor } from '../../src/ops/OutboxWorkerMonitor.js';
import { loadEnv } from '../../src/plugins/env.js';
import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

const ADMIN_PORT_SCAN_MIN = 45_000;
const ADMIN_PORT_SCAN_MAX = 55_000;
const ADMIN_PORT_SCAN_ATTEMPTS = 10;
const WAIT_FOR_TIMEOUT_MS = 2_000;
const WAIT_FOR_POLL_MS = 10;

let nextAdminPortCandidate = ADMIN_PORT_SCAN_MIN + ((process.pid ?? 1) % 1_000);

describe('standalone canary acceptance', () => {
  it('covers passive bootstrap, active delivery, metrics, and stop semantics', async () => {
    const passiveHost = await startHost({
      NODE_ENV: 'test',
      DVT_OUTBOX_OWNERSHIP_MODE: 'passive',
      DVT_OUTBOX_ADMIN_HOST: '127.0.0.1',
      SERVICE_NAME: 'dvt-outbox-worker-canary',
    });

    try {
      const passiveHealth = await waitFor(async () => {
        const response = await fetchJson<{
          ok: boolean;
          state: string;
        }>(`${passiveHost.baseUrl}/healthz`);
        return response.body.state === 'passive' ? response : undefined;
      });
      const passiveReady = await fetchJson<{
        ok: boolean;
        ready: boolean;
        state: string;
      }>(`${passiveHost.baseUrl}/readyz`);
      const passiveMetrics = await fetchText(`${passiveHost.baseUrl}/metrics`);

      expect(passiveHealth.status).toBe(200);
      expect(passiveHealth.body.ok).toBe(true);
      expect(passiveReady.status).toBe(503);
      expect(passiveReady.body.ready).toBe(false);
      expect(passiveReady.body.state).toBe('passive');
      expect(passiveMetrics.body).toMatch(/dvt_outbox_runtime_ready 0/);
      expect(passiveMetrics.body).toMatch(/dvt_outbox_runtime_state\{state="passive"\} 1/);
    } finally {
      await stopHost(passiveHost);
    }

    const sink = await startHttpSink();

    try {
      await withPatchedPostgresOutboxFixture(async (fixture) => {
        const activeEnvInput = {
          NODE_ENV: 'test',
          DVT_OUTBOX_OWNERSHIP_MODE: 'active',
          DVT_OUTBOX_ADMIN_HOST: '127.0.0.1',
          SERVICE_NAME: 'dvt-outbox-worker-canary',
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
          DVT_OUTBOX_EVENT_BUS_MODE: 'http',
          DVT_OUTBOX_HTTP_TARGET_URL: sink.url,
          DVT_OUTBOX_HTTP_TIMEOUT_MS: '1000',
          DVT_OUTBOX_WORKER_POLL_INTERVAL_MS: '25',
          DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS: '25',
          DVT_OUTBOX_WORKER_BATCH_SIZE: '10',
        } as const;
        const event = makeRunQueuedEvent();

        await fixture.seedPending([event]);

        const activeHost = await startHost(activeEnvInput);
        try {
          const activeReady = await waitFor(async () => {
            const response = await fetchJson<{
              ok: boolean;
              ready: boolean;
              state: string;
            }>(`${activeHost.baseUrl}/readyz`);
            return response.status === 200 ? response : undefined;
          });
          const deliveredRequest = await waitFor(() =>
            sink.requests.length === 1 ? sink.requests[0] : undefined
          );
          const activeMetrics = await waitFor(async () => {
            const response = await fetchText(`${activeHost.baseUrl}/metrics`);
            return /dvt_outbox_delivered_records_total 1/.test(response.body) ? response : undefined;
          });

          expect(activeReady.body.ready).toBe(true);
          expect(activeMetrics.body).toMatch(/dvt_outbox_runtime_ready 1/);
          expect(activeMetrics.body).toMatch(
            /dvt_outbox_runtime_state\{state="(?:idle|draining)"\} 1/
          );
          expect(activeMetrics.body).toMatch(/dvt_outbox_delivered_records_total 1/);
          expect(activeMetrics.body).toMatch(/dvt_outbox_runtime_errors_total 0/);
          expect(deliveredRequest!.events.length).toBe(1);
          expect(deliveredRequest!.events[0]?.eventId).toBe(event.eventId);
          expect(deliveredRequest!.events[0]?.runId).toBe(event.runId);
          expect(deliveredRequest!.events[0]?.runSeq).toBe(event.runSeq);
        } finally {
          await stopHost(activeHost);
        }

        const finalSnapshot = activeHost.monitor.getHealthSnapshot();
        expect(finalSnapshot.state).toBe('stopped');
        expect(finalSnapshot.ok).toBe(false);
        expect(finalSnapshot.ready).toBe(false);
      });
    } finally {
      await sink.close();
    }
  });

  it('exposes failing readiness and retry metrics when downstream rejects delivery', async () => {
    const sink = await startHttpSink({
      statusCode: 503,
      responseBody: { error: 'synthetic downstream outage' },
    });

    try {
      await withPatchedPostgresOutboxFixture(async (fixture) => {
        const activeEnvInput = {
          NODE_ENV: 'test',
          DVT_OUTBOX_OWNERSHIP_MODE: 'active',
          DVT_OUTBOX_ADMIN_HOST: '127.0.0.1',
          SERVICE_NAME: 'dvt-outbox-worker-canary',
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
          DVT_OUTBOX_EVENT_BUS_MODE: 'http',
          DVT_OUTBOX_HTTP_TARGET_URL: sink.url,
          DVT_OUTBOX_HTTP_TIMEOUT_MS: '1000',
          DVT_OUTBOX_WORKER_POLL_INTERVAL_MS: '25',
          DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS: '25',
          DVT_OUTBOX_WORKER_BATCH_SIZE: '10',
        } as const;
        const event = makeRunQueuedEvent();

        await fixture.seedPending([event]);

        const activeHost = await startHost(activeEnvInput);
        try {
          const failingReady = await waitFor(async () => {
            const response = await fetchJson<{
              ok: boolean;
              ready: boolean;
              state: string;
              lastErrorMessage: string | null;
            }>(`${activeHost.baseUrl}/readyz`);
            return response.body.state === 'failing' ? response : undefined;
          });
          const failingMetrics = await waitFor(async () => {
            const response = await fetchText(`${activeHost.baseUrl}/metrics`);
            return /dvt_outbox_retried_records_total 1/.test(response.body) ? response : undefined;
          });

          expect(sink.requests.length).toBe(1);
          expect(failingReady.status).toBe(503);
          expect(failingReady.body.ready).toBe(false);
          expect(failingReady.body.state).toBe('failing');
          expect(failingReady.body.lastErrorMessage).toBe('HTTP_EVENT_BUS_BAD_STATUS: 503');
          expect(failingMetrics.body).toMatch(/dvt_outbox_runtime_ready 0/);
          expect(failingMetrics.body).toMatch(/dvt_outbox_runtime_state\{state="failing"\} 1/);
          expect(failingMetrics.body).toMatch(/dvt_outbox_delivered_records_total 0/);
          expect(failingMetrics.body).toMatch(/dvt_outbox_retried_records_total 1/);
          expect(failingMetrics.body).toMatch(/dvt_outbox_runtime_errors_total 0/);
        } finally {
          await stopHost(activeHost);
        }
      });
    } finally {
      await sink.close();
    }
  });

  it('does not bypass later same-run events after downstream recovery', async () => {
    const sink = await startHttpSink({
      responseSequence: [
        {
          statusCode: 503,
          responseBody: { error: 'synthetic first-attempt outage' },
        },
        {
          statusCode: 200,
          responseBody: { ok: true },
        },
      ],
    });

    try {
      await withPatchedPostgresOutboxFixture({ retryDelayMs: 25 }, async (fixture) => {
        const activeEnvInput = {
          NODE_ENV: 'test',
          DVT_OUTBOX_OWNERSHIP_MODE: 'active',
          DVT_OUTBOX_ADMIN_HOST: '127.0.0.1',
          SERVICE_NAME: 'dvt-outbox-worker-canary',
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
          DVT_OUTBOX_EVENT_BUS_MODE: 'http',
          DVT_OUTBOX_HTTP_TARGET_URL: sink.url,
          DVT_OUTBOX_HTTP_TIMEOUT_MS: '1000',
          DVT_OUTBOX_WORKER_POLL_INTERVAL_MS: '25',
          DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS: '25',
          DVT_OUTBOX_WORKER_BATCH_SIZE: '10',
        } as const;

        await fixture.seedPending([
          makeRunQueuedEvent(1),
          makeRunQueuedEvent(2),
          makeRunQueuedEvent(3),
        ]);

        const activeHost = await startHost(activeEnvInput);
        try {
          const deliveredRequests = await waitFor(() =>
            sink.requests.length >= 4 ? sink.requests.slice(0, 4) : undefined
          );
          const recoveredReady = await waitFor(async () => {
            const response = await fetchJson<{
              ok: boolean;
              ready: boolean;
              state: string;
            }>(`${activeHost.baseUrl}/readyz`);
            return response.status === 200 ? response : undefined;
          });

          expect(deliveredRequests.map((request) => request.events[0]?.runSeq)).toEqual([
            1, 1, 2, 3,
          ]);
          expect(recoveredReady.body.ready).toBe(true);
          expect(recoveredReady.body.state).toMatch(/idle|draining/);
        } finally {
          await stopHost(activeHost);
        }
      });
    } finally {
      await sink.close();
    }
  });

  it('redelivers in order when markDelivered fails after publish', async () => {
    const sink = await startHttpSink();

    try {
      await withPatchedPostgresOutboxFixture(
        { retryDelayMs: 25, failMarkDeliveredRunSeqsOnce: [1] },
        async (fixture) => {
          const activeEnvInput = {
            NODE_ENV: 'test',
            DVT_OUTBOX_OWNERSHIP_MODE: 'active',
            DVT_OUTBOX_ADMIN_HOST: '127.0.0.1',
            SERVICE_NAME: 'dvt-outbox-worker-canary',
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
            DVT_OUTBOX_EVENT_BUS_MODE: 'http',
            DVT_OUTBOX_HTTP_TARGET_URL: sink.url,
            DVT_OUTBOX_HTTP_TIMEOUT_MS: '1000',
            DVT_OUTBOX_WORKER_POLL_INTERVAL_MS: '25',
            DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS: '25',
            DVT_OUTBOX_WORKER_BATCH_SIZE: '10',
          } as const;

          await fixture.seedPending([
            makeRunQueuedEvent(1),
            makeRunQueuedEvent(2),
            makeRunQueuedEvent(3),
          ]);

          const activeHost = await startHost(activeEnvInput);
          try {
            const deliveredRequests = await waitFor(() =>
              sink.requests.length >= 4 ? sink.requests.slice(0, 4) : undefined
            );
            const deliveredMetrics = await waitFor(async () => {
              const response = await fetchText(`${activeHost.baseUrl}/metrics`);
              return /dvt_outbox_delivered_records_total 3/.test(response.body)
                ? response
                : undefined;
            });

            expect(deliveredRequests.map((request) => request.events[0]?.runSeq)).toEqual([
              1, 1, 2, 3,
            ]);
            expect(
              deliveredRequests.map((request) => request.events[0]?.eventId)
            ).toEqual(['evt-canary-1', 'evt-canary-1', 'evt-canary-2', 'evt-canary-3']);
            expect(
              deliveredRequests.map((request) => request.events[0]?.idempotencyKey)
            ).toEqual(['key-canary-1', 'key-canary-1', 'key-canary-2', 'key-canary-3']);
            expect(deliveredMetrics.body).toMatch(/dvt_outbox_retried_records_total 1/);
            expect(deliveredMetrics.body).toMatch(/dvt_outbox_delivered_records_total 3/);
          } finally {
            await stopHost(activeHost);
          }
        }
      );
    } finally {
      await sink.close();
    }
  });

  it('shows an idempotent downstream sink absorbing duplicate redelivery', async () => {
    const sink = await startHttpSink({
      idempotentBy: 'eventId',
    });

    try {
      await withPatchedPostgresOutboxFixture(
        { retryDelayMs: 25, failMarkDeliveredRunSeqsOnce: [1] },
        async (fixture) => {
          const activeEnvInput = {
            NODE_ENV: 'test',
            DVT_OUTBOX_OWNERSHIP_MODE: 'active',
            DVT_OUTBOX_ADMIN_HOST: '127.0.0.1',
            SERVICE_NAME: 'dvt-outbox-worker-canary',
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
            DVT_OUTBOX_EVENT_BUS_MODE: 'http',
            DVT_OUTBOX_HTTP_TARGET_URL: sink.url,
            DVT_OUTBOX_HTTP_TIMEOUT_MS: '1000',
            DVT_OUTBOX_WORKER_POLL_INTERVAL_MS: '25',
            DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS: '25',
            DVT_OUTBOX_WORKER_BATCH_SIZE: '10',
          } as const;

          await fixture.seedPending([makeRunQueuedEvent(1), makeRunQueuedEvent(2)]);

          const activeHost = await startHost(activeEnvInput);
          try {
            const deliveredRequests = await waitFor(() =>
              sink.requests.length >= 3 ? sink.requests.slice(0, 3) : undefined
            );
            const appliedEffects = await waitFor(() =>
              sink.appliedEffects.length >= 2 ? sink.appliedEffects.slice(0, 2) : undefined
            );
            const deliveredMetrics = await waitFor(async () => {
              const response = await fetchText(`${activeHost.baseUrl}/metrics`);
              return /dvt_outbox_delivered_records_total 2/.test(response.body)
                ? response
                : undefined;
            });

            expect(
              deliveredRequests.map((request) => request.events[0]?.eventId)
            ).toEqual(['evt-canary-1', 'evt-canary-1', 'evt-canary-2']);
            expect(
              deliveredRequests.map((request) => request.events[0]?.idempotencyKey)
            ).toEqual(['key-canary-1', 'key-canary-1', 'key-canary-2']);
            expect(appliedEffects.map((event) => event.eventId)).toEqual([
              'evt-canary-1',
              'evt-canary-2',
            ]);
            expect(sink.duplicateKeys).toEqual(['evt-canary-1']);
            expect(deliveredMetrics.body).toMatch(/dvt_outbox_retried_records_total 1/);
            expect(deliveredMetrics.body).toMatch(/dvt_outbox_delivered_records_total 2/);
          } finally {
            await stopHost(activeHost);
          }
        }
      );
    } finally {
      await sink.close();
    }
  });
});

async function withPatchedPostgresOutboxFixture<T>(
  options: PatchedOutboxFixtureOptions | ((fixture: PostgresOutboxFixture) => Promise<T>),
  run?: (fixture: PostgresOutboxFixture) => Promise<T>
): Promise<T> {
  await closePgPool();

  const resolvedRun = typeof options === 'function' ? options : run;
  if (!resolvedRun) {
    throw new Error('expected a fixture callback');
  }

  const retryDelayMs = typeof options === 'function' ? 60_000 : (options.retryDelayMs ?? 60_000);
  const failMarkDeliveredRunSeqsOnce =
    typeof options === 'function' ? [] : (options.failMarkDeliveredRunSeqsOnce ?? []);
  const state: FakeOutboxState = {
    nextId: 1,
    pending: [],
    deadLetters: [],
    failMarkDeliveredRunSeqsOnce: new Set(failMarkDeliveredRunSeqsOnce),
  };
  const originalListPending = PostgresStateStoreAdapter.prototype.listPending;
  const originalListPendingForClaim = PostgresStateStoreAdapter.prototype.listPendingForClaim;
  const originalMarkDelivered = PostgresStateStoreAdapter.prototype.markDelivered;
  const originalMarkFailed = PostgresStateStoreAdapter.prototype.markFailed;
  const originalHasPendingRetries = PostgresStateStoreAdapter.prototype.hasPendingRetries;

  PostgresStateStoreAdapter.prototype.listPending = async function listPending(
    limit: number
  ): Promise<OutboxRecord[]> {
    return listEligiblePendingRecords(state, limit, Date.now()).map(cloneOutboxRecord);
  };
  PostgresStateStoreAdapter.prototype.listPendingForClaim = async function listPendingForClaim(
    limit: number
  ): Promise<OutboxRecord[]> {
    return listEligiblePendingRecords(state, limit, Date.now()).map(cloneOutboxRecord);
  };

  PostgresStateStoreAdapter.prototype.markDelivered = async function markDelivered(
    ids: string[]
  ): Promise<void> {
    const failingRecord = state.pending.find(
      (record) =>
        ids.includes(record.id) && state.failMarkDeliveredRunSeqsOnce.has(record.payload.runSeq)
    );
    if (failingRecord) {
      state.failMarkDeliveredRunSeqsOnce.delete(failingRecord.payload.runSeq);
      throw new Error(`synthetic ack failure for runSeq ${failingRecord.payload.runSeq}`);
    }

    state.pending = state.pending.filter((record) => !ids.includes(record.id));
  };

  PostgresStateStoreAdapter.prototype.markFailed = async function markFailed(
    id: string,
    error: string
  ): Promise<void> {
    const record = state.pending.find((candidate) => candidate.id === id);
    if (!record) {
      return;
    }

    record.attempts += 1;
    record.lastError = error;

    if (record.attempts >= MAX_OUTBOX_ATTEMPTS) {
      state.pending = state.pending.filter((candidate) => candidate.id !== id);
      state.deadLetters.push(record.payload.runId);
      return;
    }

    record.nextAttemptAt = new Date(Date.now() + retryDelayMs).toISOString();
  };

  PostgresStateStoreAdapter.prototype.hasPendingRetries =
    async function hasPendingRetries(): Promise<boolean> {
      return state.pending.some((record) => record.attempts > 0);
    };

  try {
    return await resolvedRun({
      seedPending: async (events) => {
        for (const event of events) {
          state.pending.push({
            id: `outbox_${state.nextId}`,
            createdAt: event.persistedAt,
            idempotencyKey: event.idempotencyKey,
            payload: cloneEvent(event),
            attempts: 0,
          });
          state.nextId += 1;
        }
      },
    });
  } finally {
    PostgresStateStoreAdapter.prototype.listPending = originalListPending;
    PostgresStateStoreAdapter.prototype.listPendingForClaim = originalListPendingForClaim;
    PostgresStateStoreAdapter.prototype.markDelivered = originalMarkDelivered;
    PostgresStateStoreAdapter.prototype.markFailed = originalMarkFailed;
    PostgresStateStoreAdapter.prototype.hasPendingRetries = originalHasPendingRetries;
    await closePgPool();
  }
}

async function startHost(input: NodeJS.ProcessEnv): Promise<StartedHost> {
  let lastAddressInUseError: unknown = null;

  for (let attempt = 0; attempt < ADMIN_PORT_SCAN_ATTEMPTS; attempt += 1) {
    const port = allocateAdminPortCandidate();
    try {
      return await startHostOnCandidatePort(input, port);
    } catch (error) {
      if (!isAddressInUseError(error)) {
        throw error;
      }
      lastAddressInUseError = error;
    }
  }

  throw (
    lastAddressInUseError ?? new Error('failed to allocate a free admin port for canary acceptance')
  );
}

async function stopHost(host: StartedHost): Promise<void> {
  host.shutdown.abort();
  const result = await host.hostCompletion;
  if (!result.ok) {
    throw result.error;
  }
}

function makeLogger(): OutboxWorkerRuntimeLogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

function listEligiblePendingRecords(
  state: FakeOutboxState,
  limit: number,
  nowMs: number
): OutboxRecord[] {
  const blockedRunIds = new Set(state.deadLetters);
  const headRunSeqByRunId = buildHeadRunSeqByRunId(state.pending, blockedRunIds);

  return state.pending
    .filter((record) => {
      if (blockedRunIds.has(record.payload.runId)) {
        return false;
      }

      if (headRunSeqByRunId.get(record.payload.runId) !== record.payload.runSeq) {
        return false;
      }

      if (!record.nextAttemptAt) {
        return true;
      }

      const nextAttemptAtMs = Date.parse(record.nextAttemptAt);
      return Number.isFinite(nextAttemptAtMs) ? nextAttemptAtMs <= nowMs : true;
    })
    .sort(compareOutboxRecords)
    .slice(0, Math.max(0, limit));
}

function buildHeadRunSeqByRunId(
  pending: readonly OutboxRecord[],
  blockedRunIds: ReadonlySet<string>
): Map<string, number> {
  const headRunSeqByRunId = new Map<string, number>();

  for (const record of pending) {
    const runId = record.payload.runId;
    if (blockedRunIds.has(runId)) {
      continue;
    }

    const currentHeadRunSeq = headRunSeqByRunId.get(runId);
    if (currentHeadRunSeq === undefined || record.payload.runSeq < currentHeadRunSeq) {
      headRunSeqByRunId.set(runId, record.payload.runSeq);
    }
  }

  return headRunSeqByRunId;
}

function compareOutboxRecords(a: OutboxRecord, b: OutboxRecord): number {
  const createdAtDiff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }
  return a.payload.runSeq - b.payload.runSeq;
}

function cloneOutboxRecord(record: OutboxRecord): OutboxRecord {
  return {
    ...record,
    payload: cloneEvent(record.payload),
  };
}

function cloneEvent(event: RunEventPersisted): RunEventPersisted {
  return { ...event };
}

function makeRunQueuedEvent(runSeq = 1): RunEventPersisted {
  return {
    eventId: `evt-canary-${runSeq}`,
    eventType: 'RunQueued',
    runId: 'run-canary-1',
    tenantId: 'tenant-canary',
    projectId: 'project-canary',
    environmentId: 'env-canary',
    planId: 'plan-canary',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: '2026-03-10T00:00:00.000Z',
    idempotencyKey: `key-canary-${runSeq}`,
    runSeq,
    persistedAt: '2026-03-10T00:00:00.000Z',
  };
}

async function startHttpSink(options: HttpSinkOptions = {}): Promise<HttpSinkHandle> {
  const requests: SinkPayload[] = [];
  const appliedEffects: RunEventPersisted[] = [];
  const duplicateKeys: string[] = [];
  const seenKeys = new Set<string>();
  const server = createServer((request, response) => {
    void handleSinkRequest(
      request,
      response,
      requests,
      appliedEffects,
      duplicateKeys,
      seenKeys,
      options
    ).catch((error: unknown) => {
      response.statusCode = 500;
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({ error: toErrorMessage(error) }));
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('expected the HTTP sink to bind to a TCP address');
  }

  return {
    url: `http://127.0.0.1:${address.port}/outbox/events`,
    requests,
    appliedEffects,
    duplicateKeys,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

async function handleSinkRequest(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  requests: SinkPayload[],
  appliedEffects: RunEventPersisted[],
  duplicateKeys: string[],
  seenKeys: Set<string>,
  options: HttpSinkOptions
): Promise<void> {
  if (request.method !== 'POST' || request.url !== '/outbox/events') {
    response.statusCode = 404;
    response.end();
    return;
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  const sinkPayload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as SinkPayload;
  const responsePlan = resolveSinkResponse(options, requests.length);
  requests.push(sinkPayload);
  applySinkEffects(sinkPayload, appliedEffects, duplicateKeys, seenKeys, options);
  response.statusCode = responsePlan.statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(responsePlan.responseBody));
}

function applySinkEffects(
  sinkPayload: SinkPayload,
  appliedEffects: RunEventPersisted[],
  duplicateKeys: string[],
  seenKeys: Set<string>,
  options: HttpSinkOptions
): void {
  for (const event of sinkPayload.events) {
    const key = resolveSinkIdempotencyKey(event, options.idempotentBy);
    if (key !== null) {
      if (seenKeys.has(key)) {
        if (!duplicateKeys.includes(key)) {
          duplicateKeys.push(key);
        }
        continue;
      }
      seenKeys.add(key);
    }

    appliedEffects.push(cloneEvent(event));
  }
}

function resolveSinkIdempotencyKey(
  event: RunEventPersisted,
  idempotentBy: HttpSinkOptions['idempotentBy']
): string | null {
  switch (idempotentBy) {
    case 'eventId':
      return event.eventId;
    case 'idempotencyKey':
      return event.idempotencyKey;
    default:
      return null;
  }
}

function resolveSinkResponse(options: HttpSinkOptions, requestIndex: number): HttpSinkResponse {
  if (options.responseSequence && options.responseSequence.length > 0) {
    return options.responseSequence[Math.min(requestIndex, options.responseSequence.length - 1)]!;
  }

  return {
    statusCode: options.statusCode ?? 200,
    responseBody: options.responseBody ?? { ok: true },
  };
}

async function fetchJson<T>(url: string): Promise<{ status: number; body: T }> {
  const response = await globalThis.fetch(url);
  return {
    status: response.status,
    body: (await response.json()) as T,
  };
}

async function fetchText(url: string): Promise<{ status: number; body: string }> {
  const response = await globalThis.fetch(url);
  return {
    status: response.status,
    body: await response.text(),
  };
}

async function waitFor<T>(
  probe: () => Promise<T | undefined> | T | undefined,
  timeoutMs = WAIT_FOR_TIMEOUT_MS
): Promise<T> {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const value = await probe();
    if (value !== undefined) {
      return value;
    }
    await sleep(WAIT_FOR_POLL_MS);
  }

  throw new Error('Condition not met before timeout');
}

interface StartedHost {
  monitor: OutboxWorkerMonitor;
  shutdown: globalThis.AbortController;
  baseUrl: string;
  hostCompletion: Promise<{ ok: true } | { ok: false; error: unknown }>;
}

interface SinkPayload {
  events: RunEventPersisted[];
}

interface HttpSinkHandle {
  url: string;
  requests: SinkPayload[];
  appliedEffects: RunEventPersisted[];
  duplicateKeys: string[];
  close(): Promise<void>;
}

interface HttpSinkOptions {
  statusCode?: number;
  responseBody?: Record<string, unknown>;
  responseSequence?: HttpSinkResponse[];
  idempotentBy?: 'eventId' | 'idempotencyKey';
}

interface HttpSinkResponse {
  statusCode: number;
  responseBody: Record<string, unknown>;
}

interface PostgresOutboxFixture {
  seedPending(events: readonly RunEventPersisted[]): Promise<void>;
}

interface PatchedOutboxFixtureOptions {
  retryDelayMs?: number;
  failMarkDeliveredRunSeqsOnce?: number[];
}

interface FakeOutboxState {
  nextId: number;
  pending: OutboxRecord[];
  deadLetters: string[];
  failMarkDeliveredRunSeqsOnce: Set<number>;
}

async function startHostOnCandidatePort(
  input: NodeJS.ProcessEnv,
  port: number
): Promise<StartedHost> {
  const logger = makeLogger();
  const env = loadEnv({
    ...input,
    DVT_OUTBOX_ADMIN_PORT: String(port),
  });
  const monitor = new OutboxWorkerMonitor({
    serviceName: env.SERVICE_NAME,
    logger,
  });
  const operationalServer = createOperationalServer({
    host: env.DVT_OUTBOX_ADMIN_HOST,
    port: env.DVT_OUTBOX_ADMIN_PORT,
    logger,
    monitor,
  });
  const shutdown = new globalThis.AbortController();
  let startupFailure: unknown = null;
  const hostCompletion = runOutboxWorkerHost({
    env,
    logger,
    monitor,
    operationalServer,
    shutdownSignal: shutdown.signal,
  }).then(
    () => ({ ok: true as const }),
    (error) => {
      startupFailure = error;
      return { ok: false as const, error };
    }
  );

  try {
    const address = await waitFor(() => {
      if (startupFailure) {
        throw startupFailure;
      }
      return operationalServer.getAddress() ?? undefined;
    });

    return {
      monitor,
      shutdown,
      baseUrl: `http://${env.DVT_OUTBOX_ADMIN_HOST}:${address.port}`,
      hostCompletion,
    };
  } catch (error) {
    shutdown.abort();
    await hostCompletion;
    throw error;
  }
}

function allocateAdminPortCandidate(): number {
  const port = nextAdminPortCandidate;
  nextAdminPortCandidate += 1;
  if (nextAdminPortCandidate > ADMIN_PORT_SCAN_MAX) {
    nextAdminPortCandidate = ADMIN_PORT_SCAN_MIN;
  }
  return port;
}

function isAddressInUseError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EADDRINUSE';
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error === null) return 'null';

  if (typeof error === 'object') {
    const serialized = safeSerializeObject(error);
    if (serialized !== null) {
      return serialized;
    }

    const constructorName = error.constructor?.name;
    return constructorName && constructorName !== 'Object'
      ? constructorName
      : 'UnserializableErrorObject';
  }

  switch (typeof error) {
    case 'number':
    case 'boolean':
    case 'bigint':
    case 'undefined':
      return `${error}`;
    case 'symbol':
      return error.description ?? error.toString();
    case 'function':
      return error.name ? `[function ${error.name}]` : '[function anonymous]';
    default:
      return 'UnknownError';
  }
}

function safeSerializeObject(value: object): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}
