import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import test from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import adapterPostgres from '@dvt/adapter-postgres';
import {
  MAX_OUTBOX_ATTEMPTS,
  type OutboxRecord,
  type RunEventPersisted,
} from '@dvt/engine';

import { closePgPool } from '../../src/db/pool.js';
import { runOutboxWorkerHost } from '../../src/host/runOutboxWorkerHost.js';
import { createOperationalServer } from '../../src/ops/OperationalServer.js';
import { OutboxWorkerMonitor } from '../../src/ops/OutboxWorkerMonitor.js';
import { loadEnv } from '../../src/plugins/env.js';
import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

const { PostgresStateStoreAdapter } = adapterPostgres;

const ADMIN_PORT_SCAN_MIN = 45_000;
const ADMIN_PORT_SCAN_MAX = 55_000;
const ADMIN_PORT_SCAN_ATTEMPTS = 10;
const WAIT_FOR_TIMEOUT_MS = 2_000;
const WAIT_FOR_POLL_MS = 10;

let nextAdminPortCandidate = ADMIN_PORT_SCAN_MIN + ((process.pid ?? 1) % 1_000);

await test(
  'standalone canary acceptance covers passive bootstrap, active delivery, metrics, and stop semantics',
  async () => {
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

      assert.equal(passiveHealth.status, 200);
      assert.equal(passiveHealth.body.ok, true);
      assert.equal(passiveReady.status, 503);
      assert.equal(passiveReady.body.ready, false);
      assert.equal(passiveReady.body.state, 'passive');
      assert.match(passiveMetrics.body, /dvt_outbox_runtime_ready 0/);
      assert.match(passiveMetrics.body, /dvt_outbox_runtime_state\{state="passive"\} 1/);
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

          assert.equal(activeReady.body.ready, true);
          assert.match(activeMetrics.body, /dvt_outbox_runtime_ready 1/);
          assert.match(
            activeMetrics.body,
            /dvt_outbox_runtime_state\{state="(?:idle|draining)"\} 1/
          );
          assert.match(activeMetrics.body, /dvt_outbox_delivered_records_total 1/);
          assert.match(activeMetrics.body, /dvt_outbox_runtime_errors_total 0/);
          assert.equal(deliveredRequest.events.length, 1);
          assert.equal(deliveredRequest.events[0]?.eventId, event.eventId);
          assert.equal(deliveredRequest.events[0]?.runId, event.runId);
          assert.equal(deliveredRequest.events[0]?.runSeq, event.runSeq);
        } finally {
          await stopHost(activeHost);
        }

        const finalSnapshot = activeHost.monitor.getHealthSnapshot();
        assert.equal(finalSnapshot.state, 'stopped');
        assert.equal(finalSnapshot.ok, false);
        assert.equal(finalSnapshot.ready, false);
      });
    } finally {
      await sink.close();
    }
  }
);

await test(
  'standalone canary acceptance exposes failing readiness and retry metrics when downstream rejects delivery',
  async () => {
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

          assert.equal(sink.requests.length, 1);
          assert.equal(failingReady.status, 503);
          assert.equal(failingReady.body.ready, false);
          assert.equal(failingReady.body.state, 'failing');
          assert.equal(failingReady.body.lastErrorMessage, 'HTTP_EVENT_BUS_BAD_STATUS: 503');
          assert.match(failingMetrics.body, /dvt_outbox_runtime_ready 0/);
          assert.match(failingMetrics.body, /dvt_outbox_runtime_state\{state="failing"\} 1/);
          assert.match(failingMetrics.body, /dvt_outbox_delivered_records_total 0/);
          assert.match(failingMetrics.body, /dvt_outbox_retried_records_total 1/);
          assert.match(failingMetrics.body, /dvt_outbox_runtime_errors_total 0/);
        } finally {
          await stopHost(activeHost);
        }
      });
    } finally {
      await sink.close();
    }
  }
);

async function withPatchedPostgresOutboxFixture<T>(
  run: (fixture: PostgresOutboxFixture) => Promise<T>
): Promise<T> {
  await closePgPool();

  const state: FakeOutboxState = { nextId: 1, pending: [] };
  const originalListPending = PostgresStateStoreAdapter.prototype.listPending;
  const originalMarkDelivered = PostgresStateStoreAdapter.prototype.markDelivered;
  const originalMarkFailed = PostgresStateStoreAdapter.prototype.markFailed;
  const originalHasPendingRetries = PostgresStateStoreAdapter.prototype.hasPendingRetries;

  PostgresStateStoreAdapter.prototype.listPending = async function listPending(
    limit: number
  ): Promise<OutboxRecord[]> {
    const nowMs = Date.now();

    return state.pending
      .filter((record) => !record.nextAttemptAt || Date.parse(record.nextAttemptAt) <= nowMs)
      .sort(compareOutboxRecords)
      .slice(0, limit)
      .map(cloneOutboxRecord);
  };

  PostgresStateStoreAdapter.prototype.markDelivered = async function markDelivered(
    ids: string[]
  ): Promise<void> {
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
      return;
    }

    record.nextAttemptAt = new Date(Date.now() + 60_000).toISOString();
  };

  PostgresStateStoreAdapter.prototype.hasPendingRetries = async function hasPendingRetries(): Promise<boolean> {
    return state.pending.some((record) => record.attempts > 0);
  };

  try {
    return await run({
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

  throw lastAddressInUseError ?? new Error('failed to allocate a free admin port for canary acceptance');
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

function compareOutboxRecords(a: OutboxRecord, b: OutboxRecord): number {
  const aNextAttemptAtMs = a.nextAttemptAt ? Date.parse(a.nextAttemptAt) : Number.NEGATIVE_INFINITY;
  const bNextAttemptAtMs = b.nextAttemptAt ? Date.parse(b.nextAttemptAt) : Number.NEGATIVE_INFINITY;
  if (aNextAttemptAtMs !== bNextAttemptAtMs) {
    return aNextAttemptAtMs - bNextAttemptAtMs;
  }
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
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

function makeRunQueuedEvent(): RunEventPersisted {
  return {
    eventId: 'evt-canary-1',
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
    idempotencyKey: 'key-canary-1',
    runSeq: 1,
    persistedAt: '2026-03-10T00:00:00.000Z',
  };
}

async function startHttpSink(options: HttpSinkOptions = {}): Promise<HttpSinkHandle> {
  const requests: SinkPayload[] = [];
  const server = createServer((request, response) => {
    void handleSinkRequest(request, response, requests, options).catch((error: unknown) => {
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

  requests.push(JSON.parse(Buffer.concat(chunks).toString('utf8')) as SinkPayload);
  response.statusCode = options.statusCode ?? 200;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(options.responseBody ?? { ok: true }));
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
  close(): Promise<void>;
}

interface HttpSinkOptions {
  statusCode?: number;
  responseBody?: Record<string, unknown>;
}

interface PostgresOutboxFixture {
  seedPending(events: readonly RunEventPersisted[]): Promise<void>;
}

interface FakeOutboxState {
  nextId: number;
  pending: OutboxRecord[];
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
