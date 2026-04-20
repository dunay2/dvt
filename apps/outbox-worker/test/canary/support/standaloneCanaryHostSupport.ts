import { setTimeout as sleep } from 'node:timers/promises';

import { runOutboxWorkerHost } from '../../../src/host/runOutboxWorkerHost.js';
import { createOperationalServer } from '../../../src/ops/OperationalServer.js';
import { OutboxWorkerMonitor } from '../../../src/ops/OutboxWorkerMonitor.js';
import { loadEnv } from '../../../src/plugins/env.js';
import type { OutboxWorkerRuntimeLogger } from '../../../src/runtime/OutboxWorkerRuntime.js';

const ADMIN_PORT_SCAN_MIN = 45_000;
const ADMIN_PORT_SCAN_MAX = 55_000;
const ADMIN_PORT_SCAN_ATTEMPTS = 10;
const WAIT_FOR_TIMEOUT_MS = 2_000;
const WAIT_FOR_POLL_MS = 10;

let nextAdminPortCandidate = ADMIN_PORT_SCAN_MIN + ((process.pid ?? 1) % 1_000);

export interface StartedHost {
  monitor: OutboxWorkerMonitor;
  shutdown: globalThis.AbortController;
  baseUrl: string;
  hostCompletion: Promise<{ ok: true } | { ok: false; error: unknown }>;
}

export function createPassiveCanaryEnvInput(
  overrides: Partial<NodeJS.ProcessEnv> = {}
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'passive',
    DVT_OUTBOX_ADMIN_HOST: '127.0.0.1',
    SERVICE_NAME: 'dvt-outbox-worker-canary',
    ...overrides,
  };
}

export function createActiveCanaryEnvInput(
  sinkUrl: string,
  overrides: Partial<NodeJS.ProcessEnv> = {}
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DVT_OUTBOX_ADMIN_HOST: '127.0.0.1',
    SERVICE_NAME: 'dvt-outbox-worker-canary',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_EVENT_BUS_MODE: 'http',
    DVT_OUTBOX_HTTP_TARGET_URL: sinkUrl,
    DVT_OUTBOX_HTTP_TIMEOUT_MS: '1000',
    DVT_OUTBOX_WORKER_POLL_INTERVAL_MS: '25',
    DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS: '25',
    DVT_OUTBOX_WORKER_BATCH_SIZE: '10',
    ...overrides,
  };
}

export async function startHost(input: NodeJS.ProcessEnv): Promise<StartedHost> {
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

export async function stopHost(host: StartedHost): Promise<void> {
  host.shutdown.abort();
  const result = await host.hostCompletion;
  if (!result.ok) {
    throw result.error;
  }
}

export async function fetchJson<T>(url: string): Promise<{ status: number; body: T }> {
  const response = await globalThis.fetch(url);
  return {
    status: response.status,
    body: (await response.json()) as T,
  };
}

export async function fetchText(url: string): Promise<{ status: number; body: string }> {
  const response = await globalThis.fetch(url);
  return {
    status: response.status,
    body: await response.text(),
  };
}

export async function waitFor<T>(
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

function makeLogger(): OutboxWorkerRuntimeLogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
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
