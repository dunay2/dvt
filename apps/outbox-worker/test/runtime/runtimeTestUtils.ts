import { setTimeout as sleep } from 'node:timers/promises';

import { asIsoUtcString, type EventEnvelope as RunEventPersisted } from '@dvt/contracts';

import { closePgPool } from '../../src/db/pool.js';
import { loadEnv, type ActiveEnv, isActiveEnv } from '../../src/plugins/env.js';
import { createOutboxWorkerRuntime } from '../../src/runtime/createOutboxWorkerRuntime.js';
import type { RuntimeHandle } from '../../src/runtime/createOutboxWorkerRuntime.js';
import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

export const DATABASE_URL = 'postgresql://user:pass@localhost:5432/dvt';
export const POOL_CONFIG = { connectionString: DATABASE_URL };
export const BASE_ACTIVE_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  DATABASE_URL,
  DVT_OUTBOX_EVENT_BUS_MODE: 'log',
};

export function makeLogger(): OutboxWorkerRuntimeLogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

export function makePendingEvent(): RunEventPersisted {
  return {
    eventId: 'evt-1',
    eventType: 'RunQueued' as const,
    runId: 'run-1',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'dev',
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: asIsoUtcString('2026-03-08T00:00:00.000Z'),
    idempotencyKey: 'key-1',
    payloadVersion: 1,
    runSeq: 1,
    persistedAt: asIsoUtcString('2026-03-08T00:00:00.000Z'),
  };
}

export function loadActiveTestEnv(input: NodeJS.ProcessEnv): ActiveEnv {
  const env = loadEnv({
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    ...input,
  });
  if (!isActiveEnv(env)) {
    throw new Error('expected an active test environment');
  }
  return env;
}

export async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Condition not met before timeout');
    }
    await sleep(10);
  }
}

export function makeAbortError(): Error {
  const error = new Error('synthetic abort');
  Object.defineProperty(error, 'name', {
    value: 'AbortError',
    configurable: true,
  });
  return error;
}

export function createTestRuntime(
  envOverrides: NodeJS.ProcessEnv = {},
  options: Parameters<typeof createOutboxWorkerRuntime>[2] = {}
): Promise<RuntimeHandle> {
  return createOutboxWorkerRuntime(
    loadActiveTestEnv({
      ...BASE_ACTIVE_ENV,
      ...envOverrides,
    }),
    makeLogger(),
    options
  );
}

export interface PatchScope {
  patch<TTarget extends object, TKey extends keyof TTarget>(
    target: TTarget,
    key: TKey,
    replacement: TTarget[TKey]
  ): void;
  restoreAll(): void;
}

export function createPatchScope(): PatchScope {
  const restoreStack: Array<() => void> = [];

  return {
    patch<TTarget extends object, TKey extends keyof TTarget>(
      target: TTarget,
      key: TKey,
      replacement: TTarget[TKey]
    ): void {
      const original = target[key];
      target[key] = replacement;
      restoreStack.push(() => {
        target[key] = original;
      });
    },
    restoreAll(): void {
      while (restoreStack.length > 0) {
        const restore = restoreStack.pop();
        restore?.();
      }
    },
  };
}

export async function withClosedPgPool(run: () => Promise<void>): Promise<void> {
  await closePgPool();
  try {
    await run();
  } finally {
    await closePgPool();
  }
}
