/**
 * @ownedConcern In-memory atomic intent acquisition, reclaim and owner-fenced transitions.
 * @baseline ADR-0030: Pre-dispatch intent ownership
 * @decision Serialize intent writes with the canonical start-write critical section.
 * @consequence Reclaim cannot interleave with a write authorized by an older receipt.
 */
import type { EngineRunRef } from '@dvt/contracts';
import { randomUuidV4 } from '@dvt/crypto';

import { IntentActiveConflictError, IntentNotFoundError } from '../contracts/intentErrors.js';
import {
  decideStartRunIntentCommand,
  isActiveStartRunIntent,
  type StartRunIntentCommand,
} from '../domain/startRunIntentPolicy.js';
import type {
  CreateIntentInput,
  IStartRunIntentStore,
  ReclaimStartRunIntentInput,
  ReclaimStartRunIntentResult,
  StartRunIntent,
  StartRunIntentClaimReceipt,
  StartRunIntentClaimResult,
  StartRunIntentMutationResult,
  StartRunIntentRef,
  ReconciliationCommand,
} from '../ports/IStartRunIntentStore.js';
import { SequenceClock, type IClock } from '../utils/clock.js';

type OwnedIntent = { intent: StartRunIntent; token: string };

export class InMemoryStartRunIntentStore implements IStartRunIntentStore {
  private readonly intents = new Map<string, OwnedIntent>();
  private readonly locks = new Map<string, Promise<void>>();
  private readonly nowIsoUtc: () => string;

  constructor(clock: Pick<IClock, 'nowIsoUtc'> = new SequenceClock()) {
    this.nowIsoUtc = () => clock.nowIsoUtc();
  }

  async claimIntent(input: CreateIntentInput): Promise<StartRunIntentClaimResult> {
    return this.exclusive(input.intentId, () => {
      const existing = this.intents.get(input.intentId);
      if (existing) {
        if (existing.intent.tenantId !== input.tenantId)
          throw new IntentNotFoundError(input.intentId);
        if (existing.intent.runId !== input.runId || existing.intent.provider !== input.provider)
          throw new IntentActiveConflictError(input.tenantId, input.runId);
        return { kind: 'existing', intent: this.copy(existing) };
      }
      for (const { intent } of this.intents.values()) {
        if (
          intent.tenantId === input.tenantId &&
          intent.runId === input.runId &&
          isActiveStartRunIntent(intent.status)
        )
          throw new IntentActiveConflictError(input.tenantId, input.runId);
      }
      const now = this.nowIsoUtc();
      const owned: OwnedIntent = {
        token: randomUuidV4(),
        intent: {
          ...input,
          status: 'PENDING',
          providerOutcome: { kind: 'not_requested' },
          compensation: { kind: 'not_required' },
          reconciliation: { kind: 'pending', attempts: 0, nextAttemptAt: now },
          updatedAt: now,
          revision: 0,
        },
      };
      this.intents.set(input.intentId, owned);
      return { kind: 'acquired', intent: this.copy(owned), receipt: this.receipt(owned) };
    });
  }

  async reclaimIntent(input: ReclaimStartRunIntentInput): Promise<ReclaimStartRunIntentResult> {
    if (!Number.isFinite(input.minimumAgeMs) || input.minimumAgeMs < 0)
      throw new RangeError('INVALID_INTENT_RECLAIM_AGE');
    return this.exclusive(input.intentId, () => {
      const owned = this.intents.get(input.intentId);
      const now = this.nowIsoUtc();
      if (
        !owned ||
        owned.intent.tenantId !== input.tenantId ||
        owned.intent.revision !== input.expectedRevision ||
        !isActiveStartRunIntent(owned.intent.status) ||
        owned.intent.reconciliation.kind !== 'pending' ||
        Date.parse(owned.intent.reconciliation.nextAttemptAt) > Date.parse(now) ||
        Date.parse(owned.intent.updatedAt) > Date.parse(now) - input.minimumAgeMs
      )
        return { kind: 'not_acquired' };
      owned.token = randomUuidV4();
      owned.intent.revision += 1;
      owned.intent.updatedAt = now;
      return { kind: 'acquired', intent: this.copy(owned), receipt: this.receipt(owned) };
    });
  }

  markDispatched(
    receipt: StartRunIntentClaimReceipt,
    runRef: EngineRunRef
  ): Promise<StartRunIntentMutationResult> {
    return this.transition(receipt, { kind: 'transition', target: 'DISPATCHED', runRef });
  }

  authorizeDispatch(receipt: StartRunIntentClaimReceipt): Promise<StartRunIntentMutationResult> {
    return this.transition(receipt, { kind: 'authorize_dispatch' });
  }

  recordReconciliation(
    receipt: StartRunIntentClaimReceipt,
    command: ReconciliationCommand
  ): Promise<StartRunIntentMutationResult> {
    return this.transition(receipt, { kind: 'reconcile', command });
  }

  markResolved(receipt: StartRunIntentClaimReceipt): Promise<StartRunIntentMutationResult> {
    return this.transition(receipt, { kind: 'transition', target: 'RESOLVED' });
  }

  markExpired(receipt: StartRunIntentClaimReceipt): Promise<StartRunIntentMutationResult> {
    return this.transition(receipt, { kind: 'transition', target: 'EXPIRED' });
  }

  /** Shared transaction boundary consumed by the in-memory canonical state store. */
  async withClaim<T>(
    receipt: StartRunIntentClaimReceipt,
    write: (intent: StartRunIntent) => Promise<T>
  ): Promise<{ kind: 'applied'; value: T } | { kind: 'not_owner' | 'missing' | 'invalid_state' }> {
    return this.exclusive(receipt.intentId, async () => {
      const owned = this.intents.get(receipt.intentId);
      if (!owned || owned.intent.tenantId !== receipt.tenantId) return { kind: 'missing' };
      if (!this.owns(owned, receipt)) return { kind: 'not_owner' };
      if (
        !isActiveStartRunIntent(owned.intent.status) ||
        owned.intent.reconciliation.kind === 'escalated'
      )
        return { kind: 'invalid_state' };
      const value = await write(this.copy(owned));
      return { kind: 'applied', value };
    });
  }

  async listOrphaned(thresholdMs: number, nowMs: number, limit = 100): Promise<StartRunIntent[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
      throw new RangeError('INVALID_LIMIT: listOrphaned limit must be between 1 and 1000');
    const cutoff = nowMs - thresholdMs;
    return [...this.intents.values()]
      .filter(
        ({ intent }) =>
          isActiveStartRunIntent(intent.status) &&
          intent.reconciliation.kind === 'pending' &&
          Date.parse(intent.reconciliation.nextAttemptAt) <= nowMs &&
          Date.parse(intent.updatedAt) < cutoff
      )
      .sort(
        (a, b) =>
          a.intent.createdAt.localeCompare(b.intent.createdAt) ||
          a.intent.intentId.localeCompare(b.intent.intentId)
      )
      .slice(0, limit)
      .map((owned) => this.copy(owned));
  }

  async getIntent(ref: StartRunIntentRef): Promise<StartRunIntent | null> {
    const owned = this.intents.get(ref.intentId);
    return owned?.intent.tenantId === ref.tenantId ? this.copy(owned) : null;
  }

  private transition(
    receipt: StartRunIntentClaimReceipt,
    command: StartRunIntentCommand
  ): Promise<StartRunIntentMutationResult> {
    return this.exclusive(receipt.intentId, () => {
      const owned = this.intents.get(receipt.intentId);
      if (!owned || owned.intent.tenantId !== receipt.tenantId) return 'missing';
      if (!this.owns(owned, receipt)) return 'not_owner';
      const intent = owned.intent;
      const now = this.nowIsoUtc();
      const decision = decideStartRunIntentCommand(intent, command, now);
      if (decision.result !== 'applied') return decision.result;
      intent.status = decision.status;
      intent.providerOutcome = globalThis.structuredClone(decision.providerOutcome);
      intent.compensation = globalThis.structuredClone(decision.compensation);
      intent.reconciliation = globalThis.structuredClone(decision.reconciliation);
      intent.updatedAt = now;
      intent.revision += 1;
      return 'applied';
    });
  }

  private owns(owned: OwnedIntent, receipt: StartRunIntentClaimReceipt): boolean {
    return owned.token === receipt.token && owned.intent.runId === receipt.runId;
  }

  private copy(owned: OwnedIntent): StartRunIntent {
    return globalThis.structuredClone(owned.intent);
  }

  private receipt({ intent, token }: OwnedIntent): StartRunIntentClaimReceipt {
    return Object.freeze({
      tenantId: intent.tenantId,
      intentId: intent.intentId,
      runId: intent.runId,
      token,
    });
  }

  private async exclusive<T>(key: string, operation: () => T | Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(key, current);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.locks.get(key) === current) this.locks.delete(key);
    }
  }
}
