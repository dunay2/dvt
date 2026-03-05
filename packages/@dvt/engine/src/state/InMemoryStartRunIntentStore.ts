/**
 * @file packages/@dvt/engine/src/state/InMemoryStartRunIntentStore.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision In-memory intent store for unit tests; mirrors InMemoryTxStore patterns
 * @consequence Tests can validate intent state machine without external dependencies
 * @version 1.0.0
 * @date 2026-03-03
 */
import type { EngineRunRef } from '@dvt/contracts';

import { IntentInvalidTransitionError, IntentNotFoundError } from '../contracts/intentErrors.js';
import { canTransitionStartRunIntent } from '../domain/startRunIntentPolicy.js';
import type {
  CreateIntentInput,
  IStartRunIntentStore,
  StartRunIntent,
} from '../ports/IStartRunIntentStore.js';
import type { IClock } from '../utils/clock.js';

export class InMemoryStartRunIntentStore implements IStartRunIntentStore {
  private readonly intents = new Map<string, StartRunIntent>();
  private readonly nowIsoUtc: () => string;

  constructor(clock?: Pick<IClock, 'nowIsoUtc'>) {
    this.nowIsoUtc = clock ? () => clock.nowIsoUtc() : () => '1970-01-01T00:00:00.000Z';
  }

  async createIntent(input: CreateIntentInput): Promise<StartRunIntent> {
    const existing = this.intents.get(input.intentId);
    if (existing) return existing;

    const intent: StartRunIntent = {
      intentId: input.intentId,
      tenantId: input.tenantId,
      runId: input.runId,
      provider: input.provider,
      status: 'PENDING',
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    };
    this.intents.set(input.intentId, intent);
    return intent;
  }

  async markDispatched(intentId: string, engineRunRef: EngineRunRef): Promise<void> {
    const intent = this.assertExists(intentId);
    if (!canTransitionStartRunIntent(intent.status, 'DISPATCHED')) {
      throw new IntentInvalidTransitionError(intentId, intent.status, 'DISPATCHED');
    }
    intent.status = 'DISPATCHED';
    intent.engineRunRef = engineRunRef;
    intent.updatedAt = this.nowIsoUtc();
  }

  async markResolved(intentId: string): Promise<void> {
    const intent = this.assertExists(intentId);
    if (!canTransitionStartRunIntent(intent.status, 'RESOLVED')) {
      throw new IntentInvalidTransitionError(intentId, intent.status, 'RESOLVED');
    }
    intent.status = 'RESOLVED';
    intent.updatedAt = this.nowIsoUtc();
  }

  async markExpired(intentId: string): Promise<void> {
    const intent = this.assertExists(intentId);
    if (!canTransitionStartRunIntent(intent.status, 'EXPIRED')) {
      throw new IntentInvalidTransitionError(intentId, intent.status, 'EXPIRED');
    }
    intent.status = 'EXPIRED';
    intent.updatedAt = this.nowIsoUtc();
  }

  async listOrphaned(
    thresholdMs: number,
    nowMs: number,
    limit?: number
  ): Promise<StartRunIntent[]> {
    const cutoff = nowMs - thresholdMs;
    const candidates = Array.from(this.intents.values())
      .filter(
        (i) =>
          (i.status === 'PENDING' || i.status === 'DISPATCHED') && Date.parse(i.createdAt) < cutoff
      )
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    return limit !== undefined ? candidates.slice(0, limit) : candidates;
  }

  async getIntent(intentId: string): Promise<StartRunIntent | null> {
    return this.intents.get(intentId) ?? null;
  }

  private assertExists(intentId: string): StartRunIntent {
    const intent = this.intents.get(intentId);
    if (!intent) throw new IntentNotFoundError(intentId);
    return intent;
  }
}
