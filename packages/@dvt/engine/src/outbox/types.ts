/**
 * @file packages/@dvt/engine/src/outbox/types.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision â€” Engine outbox contracts are re-exported from @dvt/contracts so runtime consumers do not depend on engine-local duplicates
 * @consequence Engine internals and infra apps share a single outbox contract surface
 * @version 1.0.0
 * @date 2026-03-12
 */
export {
  MAX_OUTBOX_ATTEMPTS,
  type DeadLetterRecord,
  type IEventBus,
  type IOutboxStorage,
  type OutboxClaimSelection,
  type OutboxFailureDisposition,
  type OutboxRecord,
  type OutboxTickResult,
  type OutboxWorkerObserver,
} from '@dvt/contracts';
