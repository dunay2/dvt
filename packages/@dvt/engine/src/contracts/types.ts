/**
 * @file packages/@dvt/engine/src/contracts/types.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Re-export canonical types from @dvt/contracts — single source of truth
 * @version 2.0.0
 * @date 2026-03-03
 */
export type {
  AdapterScopedSubstatus,
  CanonicalRunStatus,
  EngineRunRef,
  IsoUtcString,
  PlanRef,
  Provider,
  ProviderRunStatusView,
  RecoverRunCommand,
  ResolvedRunContext,
  RunContext,
  RunStatusEnrichment,
  RunStatus,
  RunStatusSnapshot,
  RunSubstatus,
  SignalRequest,
  SignalType,
} from '@dvt/contracts';
