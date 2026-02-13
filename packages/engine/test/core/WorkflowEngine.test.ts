import { describe, it, expect } from 'vitest';

import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SequenceClock } from '../../src/utils/clock.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { PlanIntegrityValidator } from '../../src/security/planIntegrity.js';

describe('WorkflowEngine (basic failure modes)', () => {
  const store = new InMemoryTxStore();
  const projector = new SnapshotProjector();
  const idempotency = new IdempotencyKeyBuilder();
  const clock = new SequenceClock('2026-02-12T00:00:00.000Z');

  const engine = new WorkflowEngine({
    stateStore: store,
    outbox: store,
    projector,
    idempotency,
    clock,
    authorizer: new AllowAllAuthorizer(),
    planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
    planIntegrity: {
      async fetchAndValidate() {
        return new Uint8Array();
      },
    } as any,
    planFetcher: {
      async fetch() {
        return new Uint8Array();
      },
    } as any,
    adapters: new Map(),
  } as any);

  it('startRun fails when no adapter registered for provider', async () => {
    const dummyPlanRef = {
      uri: 'https://example.com/plan',
      sha256: 'deadbeef',
      schemaVersion: 'v1.1',
      planId: 'p',
      planVersion: '1.0',
    } as any;
    const dummyContext = {
      tenantId: 't',
      projectId: 'p',
      environmentId: 'dev',
      runId: 'r',
      targetAdapter: 'temporal',
    } as any;

    await expect(engine.startRun(dummyPlanRef, dummyContext)).rejects.toThrow(
      /No adapter registered for provider/
    );
  });

  it('cancelRun throws when run metadata missing', async () => {
    await expect(
      engine.cancelRun({
        provider: 'temporal',
        namespace: 'n',
        workflowId: 'w',
        runId: 'missing',
      } as any)
    ).rejects.toThrow(/Run metadata not found/);
  });
});
