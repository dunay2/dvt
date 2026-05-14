/**
 * @file packages/@dvt/engine/src/contracts/runEvents.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Re-export canonical event types from @dvt/contracts without engine-local compatibility aliases.
 * @version 2.0.0
 * @date 2026-03-03
 */

export type {
  AppendResult,
  EventInput,
  EventEnvelope,
  EventType,
  RunEventInputBase,
  RunEventInput,
  RunMetadata,
  StepEventInput,
  WorkflowSnapshot,
} from '@dvt/contracts';
