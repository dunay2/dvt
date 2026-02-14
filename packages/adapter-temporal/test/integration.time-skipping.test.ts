import { WorkflowClient } from '@temporalio/client';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createActivities } from '../src/activities/stepActivities.js';

// ---------------------------------------------------------------------------
// Minimal in-memory test doubles (copied/trimmed from unit tests)
// ---------------------------------------------------------------------------
class TestTxStore {
  constructor() {
    this.eventsByRun = new Map();
    this.metadataByRun = new Map();
  }

  async saveRunMetadata(meta): Promise<void> {
    this.metadataByRun.set(meta.runId, meta);
  }

  async getRunMetadataByRunId(runId): Promise<unknown | null> {
    return this.metadataByRun.get(runId) ?? null;
  }

  async appendEventsTx(runId: string, envelopes: any[]): Promise<{ appended: any[]; deduped: any[] }> {
    const current = this.eventsByRun.get(runId) ?? [];
    const appended: any[] = [];
    const deduped: any[] = [];

    for (const env of envelopes) {
      const exists = current.some((e) => e.idempotencyKey === env.idempotencyKey);
      if (exists) {
        deduped.push({ ...env, runSeq: current.length + deduped.length + appended.length + 1 });
        continue;
      }
      const withSeq = { ...env, runSeq: current.length + appended.length + 1 };
      current.push(withSeq);
      appended.push(withSeq);
    }
    this.eventsByRun.set(runId, current);
    return { appended, deduped };
  }

  async listEvents(runId: string): Promise<any[]> {
    return [...(this.eventsByRun.get(runId) ?? [])];
  }

  async enqueueTx(): Promise<void> {
    // noop for tests
  }
}

class TestClock {
  nowIsoUtc(): string {
    return new Date().toISOString();
  }
}

class TestIdempotencyKeyBuilder {
  runEventKey({ eventType, tenantId, runId, logicalAttemptId, stepId = '' }): string {
    return [eventType, tenantId, runId, String(logicalAttemptId), stepId].join('|');
  }
}

// ---------------------------------------------------------------------------
// Integration test — run the workflow inside TestWorkflowEnvironment with mocked
// activities and assert that it completes and emitted lifecycle events.
// ---------------------------------------------------------------------------
describe('RunPlanWorkflow — integration (time-skipping env)', () => {
  let env: any = null;
  let worker: any = null;
  let client: any = null;
  let runPromise: Promise<void> | null = null;
  const taskQueue = 'test-queue-integration';

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping();
  });

  afterAll(async () => {
    try {
      if (worker) {
        // ensure worker has fully shut down before tearing down the env (avoids
        // "Cannot close connection while Workers hold a reference to it").
        if (typeof worker.shutdown === 'function') {
          await worker.shutdown();
        }
        if (runPromise) {
          await runPromise;
          runPromise = null;
        }
      }
    } finally {
      if (env) {
        // TestWorkflowEnvironment.teardown() closes the native connection internally.
        await env.teardown();
        env = null;
      }
    }
  });

  it('completes a simple plan and persists lifecycle events', async () => {
    const store = new TestTxStore();
    const deps = {
      stateStore: store,
      outbox: store,
      clock: new TestClock(),
      idempotency: new TestIdempotencyKeyBuilder(),
      fetcher: { fetch: async () => Buffer.from(JSON.stringify({
        metadata: { planId: 'p1', planVersion: 'v1', schemaVersion: 's1' },
        steps: [{ stepId: 'step-a', kind: 'test' }, { stepId: 'step-b', kind: 'test' }],
      })) },
      integrity: { fetchAndValidate: async (_ref, fetcher) => fetcher.fetch(_ref) },
    };

    // Start a Worker that uses the real workflow plus our test activity impls
    worker = await Worker.create({
      connection: env.nativeConnection,
      namespace: 'default',
      taskQueue,
      // use compiled workflow bundle from dist so the Worker bundler can load it in tests
      workflowsPath: require.resolve('../dist/workflows/RunPlanWorkflow'),
      activities: createActivities(deps),
    });

    // Run worker in background and keep the run promise in outer scope so we
    // can await shutdown from afterAll reliably.
    runPromise = worker.run();

    // give the worker time to register with the in-memory server before starting workflows
    await new Promise((res) => setTimeout(res, 100));

    // Prefer the client exposed by the Temporal test environment when available.
    // In time-skipping mode this client is fully wired to workflow service internals.
    client = env.workflowClient ?? env.client ?? new WorkflowClient({ connection: env.nativeConnection });

    const input = {
      planRef: {
        uri: 's3://bucket/plans/p1.json',
        sha256: 'ignored',
        schemaVersion: 's1',
        planId: 'p1',
        planVersion: 'v1',
      },
      ctx: {
        tenantId: 'tenant-1',
        projectId: 'proj-1',
        environmentId: 'env-1',
        runId: 'run-1',
        targetAdapter: 'temporal',
      },
    };

    // start the workflow; retry a few times if the TestWorkflowEnvironment
    // hasn't fully exposed the workflow service yet (avoids flaky race).
    async function startWorkflowWithRetry(retries = 10, delayMs = 50): Promise<any> {
      for (let i = 0; i < retries; i++) {
        try {
          return await client.start('runPlanWorkflow', {
            args: [input],
            taskQueue,
            workflowId: input.ctx.runId,
          });
        } catch (err: any) {
          if (i === retries - 1) throw err;
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }

    const handle = await startWorkflowWithRetry();

    const result = await handle.result();
    expect(result).toEqual({ runId: 'run-1', status: 'COMPLETED' });

    const events = await store.listEvents('run-1');
    const types = events.map((e) => e.eventType);
    expect(types).toContain('RunStarted');
    expect(types).toContain('StepStarted');
    expect(types).toContain('StepCompleted');
    expect(types).toContain('RunCompleted');

    // Worker teardown is handled in afterAll to avoid double-shutdown races.
  });
});
