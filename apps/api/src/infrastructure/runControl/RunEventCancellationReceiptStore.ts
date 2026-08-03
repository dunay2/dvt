/** Owned concern: persist cancellation-command receipts as non-projecting run audit facts. */
import type { IsoUtcString } from '@dvt/contracts';
import type { IRunStateStoreRead, IRunStateStoreWrite, RunMetadata } from '@dvt/engine';
import { IdempotencyKeyBuilder } from '@dvt/engine/runtime';

import type {
  IRunCancellationReceiptStore,
  RunCancellationReceiptKey,
} from '../../application/ports/runCancellationReceiptStore.js';

const CANCELLATION_SUBMITTED_EVENT_TYPE = 'RunCancelSubmitted' as const;

export class RunEventCancellationReceiptStore implements IRunCancellationReceiptStore {
  public constructor(
    private readonly deps: {
      readonly stateStoreRead: IRunStateStoreRead;
      readonly stateStoreWrite: IRunStateStoreWrite;
      readonly clock: { nowIsoUtc(): IsoUtcString };
      readonly idempotency: Pick<IdempotencyKeyBuilder, 'eventId' | 'runEventKey'>;
    }
  ) {}

  public async hasAccepted(key: RunCancellationReceiptKey): Promise<boolean> {
    return this.deps.stateStoreRead.hasEventByIdempotencyKey(
      key.tenantId,
      key.runId,
      this.cancellationReceiptIdempotencyKey(key)
    );
  }

  public async recordAccepted(metadata: RunMetadata): Promise<void> {
    await this.deps.stateStoreWrite.appendAndEnqueueTx(metadata.runId, [
      {
        eventId: this.deps.idempotency.eventId(),
        eventType: CANCELLATION_SUBMITTED_EVENT_TYPE,
        emittedAt: this.deps.clock.nowIsoUtc(),
        tenantId: metadata.tenantId,
        projectId: metadata.projectId,
        environmentId: metadata.environmentId,
        runId: metadata.runId,
        planId: metadata.planId,
        planVersion: metadata.planVersion,
        engineAttemptId: 1,
        logicalAttemptId: metadata.logicalAttemptId,
        idempotencyKey: this.cancellationReceiptIdempotencyKey(metadata),
        payloadVersion: 1,
      },
    ]);
  }

  private cancellationReceiptIdempotencyKey(key: RunCancellationReceiptKey): string {
    return this.deps.idempotency.runEventKey({
      eventType: CANCELLATION_SUBMITTED_EVENT_TYPE,
      runId: key.runId,
      logicalAttemptId: key.logicalAttemptId,
      planId: key.planId,
      planVersion: key.planVersion,
    });
  }
}
