/**
 * @file packages/@dvt/engine/src/contracts/runEvents.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Re-export event types from @dvt/contracts with engine-legacy aliases
 * @version 2.0.0
 * @date 2026-03-03
 */

// Direct re-exports (names match between engine and contracts)
export type {
  AppendResult,
  EventEnvelope,
  EventType,
  RunEventInputBase,
  RunMetadata,
  WorkflowSnapshot,
} from '@dvt/contracts';

// Alias re-exports (engine uses different names than contracts)

// Engine "RunEventInput" (the union) = contracts "EventInput"
export type { EventInput as RunEventInput } from '@dvt/contracts';

// Engine "RunEventPersisted" = contracts "EventEnvelope"
export type { EventEnvelope as RunEventPersisted } from '@dvt/contracts';

// Engine "RunLevelEventInput" = contracts "RunEventInput" (run-level sub-type)
export type { RunEventInput as RunLevelEventInput } from '@dvt/contracts';

// Engine "StepLevelEventInput" = contracts "StepEventInput"
export type { StepEventInput as StepLevelEventInput } from '@dvt/contracts';
