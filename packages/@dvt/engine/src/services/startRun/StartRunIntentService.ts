/**
 * @ownedConcern Create deterministic pre-dispatch start-run intents before
 * provider side effects.
 */
import type { EngineRunRef, ResolvedRunContext } from '@dvt/contracts';

import type { IdempotencyKeyBuilder } from '../../core/idempotency.js';
import type { IStartRunIntentStore } from '../../ports/IStartRunIntentStore.js';
import type { IClock } from '../../utils/clock.js';

export interface StartRunIntentServiceDeps {
  idempotency: IdempotencyKeyBuilder;
  intentStore: IStartRunIntentStore;
  clock: IClock;
}

export class StartRunIntentService {
  constructor(private readonly deps: StartRunIntentServiceDeps) {}

  async createIntent(
    resolvedContext: ResolvedRunContext,
    provider: EngineRunRef['provider']
  ): Promise<string> {
    const intentId = this.deps.idempotency.startRunIntentId(
      resolvedContext.tenantId,
      resolvedContext.runId,
      resolvedContext.logicalAttemptId,
      provider
    );

    await this.deps.intentStore.createIntent({
      intentId,
      tenantId: resolvedContext.tenantId,
      runId: resolvedContext.runId,
      provider,
      createdAt: this.deps.clock.nowIsoUtc(),
    });

    return intentId;
  }
}
