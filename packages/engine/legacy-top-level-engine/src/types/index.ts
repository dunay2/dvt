/**
 * DVT Engine Types
 *
 * Centralized export of all TypeScript types for engine contracts
 * Based on normative contract documentation:
 * - IWorkflowEngine.v1.md
 * - ExecutionSemantics.v1.md
 * - State Store Contract
 */

// Contract types (IWorkflowEngine interface and related types)
export type {
  // Engine interface
  IWorkflowEngine,
  IAuthorization,
  // Core types
  SignalType,
  RunContext,
  EngineRunRef,
  TemporalEngineRunRef,
  ConductorEngineRunRef,
  RunStatus,
  RunStatusSnapshot,
  // Plan types
  PlanRef,
  ExecutionPlan,
  // Request/Response types
  SignalRequest,
  QueryRequest,
  SignalDecisionRecord,
  // Validation types
  ValidationReport,
} from './contracts';

// Artifact types
export type { ArtifactRef, StepOutput, StepError, SecretRef, ISecretsProvider } from './artifacts';

// State Store types
export type {
  // Core interfaces
  IRunStateStore,
  StateStoreAdapter,
  SnapshotProjector,
  IRunQueueReconciler,
  // Event types
  CanonicalEngineEvent,
  // Note: AppendResult and OutboxEvent are exported from core/types.ts
  // Snapshot types
  RunSnapshot,
  StepSnapshot,
  WorkflowState,
  StepStatus,
  // Options
  FetchEventsOptions,
} from './state-store';
