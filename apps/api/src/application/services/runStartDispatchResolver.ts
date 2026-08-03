/** Owned concern: resolve authoritative provider-dispatch evidence for run controls. */
import type { CanonicalRunStatus, EngineRunRef, RunMetadata } from '@dvt/contracts';
import type { IStartRunIntentQueryStore } from '@dvt/engine';

export type RunStartDispatchResolution =
  Readonly<{ kind: 'confirmed'; runRef: EngineRunRef }> | Readonly<{ kind: 'unconfirmed' }>;

export interface IRunStartDispatchResolver {
  resolve(metadata: RunMetadata, status: CanonicalRunStatus): Promise<RunStartDispatchResolution>;
}

interface StartRunIntentIdBuilder {
  startRunIntentId(
    tenantId: string,
    runId: string,
    logicalAttemptId: number,
    targetAdapter: RunMetadata['providerRef']['provider']
  ): string;
}

export class RunStartDispatchResolver implements IRunStartDispatchResolver {
  public constructor(
    private readonly intentStore: IStartRunIntentQueryStore,
    private readonly idempotency: StartRunIntentIdBuilder
  ) {}

  public async resolve(
    metadata: RunMetadata,
    status: CanonicalRunStatus
  ): Promise<RunStartDispatchResolution> {
    if (status.status !== 'PENDING') {
      return { kind: 'confirmed', runRef: metadata.providerRef };
    }

    try {
      const intentId = this.idempotency.startRunIntentId(
        metadata.tenantId,
        metadata.runId,
        metadata.logicalAttemptId,
        metadata.providerRef.provider
      );
      const intent = await this.intentStore.getIntent({
        tenantId: metadata.tenantId,
        intentId,
      });
      if (!isConfirmedIntentForRun(intent, metadata)) {
        return { kind: 'unconfirmed' };
      }

      return { kind: 'confirmed', runRef: intent.engineRunRef };
    } catch {
      return { kind: 'unconfirmed' };
    }
  }
}

function isConfirmedIntentForRun(
  intent: Awaited<ReturnType<IStartRunIntentQueryStore['getIntent']>>,
  metadata: RunMetadata
): intent is NonNullable<typeof intent> & { engineRunRef: EngineRunRef } {
  return (
    intent !== null &&
    (intent.status === 'DISPATCHED' || intent.status === 'RESOLVED') &&
    intent.engineRunRef !== undefined &&
    intent.tenantId === metadata.tenantId &&
    intent.runId === metadata.runId &&
    intent.provider === metadata.providerRef.provider &&
    intent.engineRunRef.tenantId === metadata.tenantId &&
    intent.engineRunRef.provider === metadata.providerRef.provider
  );
}
