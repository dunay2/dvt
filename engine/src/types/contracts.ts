/**
 * DVT Engine - Core Type Contracts
 * Based on IWorkflowEngine.v1.md and ExecutionSemantics.v1.md
 * Phase 1: MVP types for TemporalAdapter
 */

// ============================================================================
// IWorkflowEngine Interface
// ============================================================================

/**
 * Core workflow engine interface.
 * Reference: IWorkflowEngine.v1.md § 2.1
 */
export interface IWorkflowEngine {
  /**
   * Start a new workflow execution.
   * Maps to Temporal's client.workflow.start()
   */
  startRun(
    executionPlan: ExecutionPlan,
    context: RunContext,
  ): Promise<EngineRunRef>;

  /**
   * Cancel a running workflow.
   * Maps to Temporal's client.workflow.cancel()
   */
  cancelRun(engineRunRef: EngineRunRef): Promise<void>;

  /**
   * Get current status of a workflow run.
   * Maps to Temporal's client.workflow.describe()
   */
  getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot>;

  /**
   * Send a signal to a running workflow.
   * Maps to Temporal's client.workflow.signal()
   */
  signal(
    engineRunRef: EngineRunRef,
    signalType: SignalType,
    payload: Record<string, unknown>,
  ): Promise<void>;
}

// ============================================================================
// Run Context & Engine References
// ============================================================================

/**
 * Context for workflow execution.
 * Reference: IWorkflowEngine.v1.md § 2.1
 */
export interface RunContext {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  targetAdapter: 'temporal' | 'conductor' | 'auto';
}

/**
 * Engine-specific workflow reference (polymorphic).
 * Reference: IWorkflowEngine.v1.md § 2.1.1
 */
export type EngineRunRef =
  | {
      provider: 'temporal';
      namespace: string;
      workflowId: string;
      runId?: string;
      taskQueue?: string;
    }
  | {
      provider: 'conductor';
      workflowId: string;
      runId?: string;
      conductorUrl?: string;
    };

// ============================================================================
// Execution Plan Types
// ============================================================================

/**
 * Plan reference (not full plan - Temporal payload limit mitigation).
 * Reference: TemporalAdapter.spec.md § 1
 */
export interface PlanRef {
  uri: string; // e.g., s3://bucket/plans/{planId}.json
  sha256: string; // integrity hash
  schemaVersion: string; // MANDATORY, e.g., "v1.2"
  planId: string;
  planVersion: string;

  sizeBytes?: number;
  compression?: 'gzip' | 'none';
  expiresAt?: string; // ISO 8601 UTC
  schemaEvolutionPath?: string; // e.g., "v1 → v1.1 → v1.2"
  migrationHint?: {
    sourceVersion: string;
    targetVersion: string;
    transformScript?: string;
  };
}

/**
 * Execution plan structure (simplified for Phase 1).
 * Reference: IWorkflowEngine.v1.md § 3
 */
export interface ExecutionPlan {
  planId: string;
  planVersion: string;
  schemaVersion: string;
  steps: Step[];
  dependencies?: Record<string, string[]>; // stepId -> [dependsOn stepIds]
  metadata?: {
    createdBy?: string;
    createdAt?: string;
    approvedBy?: string;
    approvedAt?: string;
  };
}

/**
 * Individual step in an execution plan.
 */
export interface Step {
  stepId: string;
  type: StepType;
  name: string;
  dependsOn?: string[]; // step dependencies
  params?: Record<string, unknown>;
  retry?: RetryPolicy;
  timeout?: string; // ISO 8601 duration, e.g., "PT5M"
  dispatch?: {
    taskQueue?: string;
    class?: 'control' | 'data' | 'isolation';
  };
}

/**
 * Step types supported by the engine.
 */
export type StepType =
  | 'HTTP_REQUEST'
  | 'DBT_RUN'
  | 'DBT_TEST'
  | 'SQL_QUERY'
  | 'SCRIPT'
  | 'APPROVAL'
  | 'WEBHOOK'
  | 'CUSTOM';

/**
 * Retry policy for a step.
 */
export interface RetryPolicy {
  maxAttempts?: number; // default: 3
  initialInterval?: string; // ISO 8601 duration, e.g., "PT1S"
  backoffCoefficient?: number; // default: 2.0
  maxInterval?: string; // ISO 8601 duration, e.g., "PT1M"
  nonRetryableErrors?: string[];
}

// ============================================================================
// Signal Types
// ============================================================================

/**
 * Supported signal types.
 * Reference: IWorkflowEngine.v1.md § 2.3
 */
export type SignalType =
  | 'PAUSE'
  | 'RESUME'
  | 'RETRY_STEP'
  | 'UPDATE_PARAMS'
  | 'CANCEL';

// ============================================================================
// Status & Snapshots
// ============================================================================

/**
 * Workflow run status enumeration.
 * Reference: ExecutionSemantics.v1.md § 1.4
 */
export type RunStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * Step status enumeration.
 */
export type StepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'SKIPPED';

/**
 * Run status snapshot (derived from events).
 * Reference: ExecutionSemantics.v1.md § 1.4
 */
export interface RunStatusSnapshot {
  runId: string;
  status: RunStatus;
  lastEventSeq: number; // High-water mark for UI sync
  steps: StepSnapshot[];
  artifacts: ArtifactRef[];
  startedAt?: string; // ISO 8601 UTC
  completedAt?: string; // ISO 8601 UTC
  totalDurationMs?: number;
  engineRunRef?: EngineRunRef;
}

/**
 * Complete run snapshot with full state.
 * Reference: ExecutionSemantics.v1.md § 1.4
 */
export interface RunSnapshot extends RunStatusSnapshot {
  tenantId: string;
  projectId: string;
  environmentId: string;
  planRef?: PlanRef;
  context?: Record<string, unknown>;
}

/**
 * Step execution snapshot.
 */
export interface StepSnapshot {
  stepId: string;
  status: StepStatus;
  logicalAttemptId: string;
  engineAttemptId?: string;
  startedAt?: string; // ISO 8601 UTC
  completedAt?: string; // ISO 8601 UTC
  artifacts: ArtifactRef[];
  error?: ErrorInfo;
  retryCount?: number;
  durationMs?: number;
}

/**
 * Artifact reference.
 */
export interface ArtifactRef {
  artifactId: string;
  stepId: string;
  type: 'log' | 'result' | 'metric' | 'file';
  uri: string; // e.g., s3://bucket/artifacts/{artifactId}
  sizeBytes?: number;
  createdAt: string; // ISO 8601 UTC
}

/**
 * Error information.
 */
export interface ErrorInfo {
  code: string;
  message: string;
  category: 'TRANSIENT' | 'VALIDATION_ERROR' | 'FATAL' | 'TIMEOUT';
  retryable: boolean;
  stackTrace?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Event Types (StateStore)
// ============================================================================

/**
 * Canonical engine event (append-only).
 * Reference: ExecutionSemantics.v1.md § 1.2
 */
export type CanonicalEngineEvent =
  | RunApprovedEvent
  | RunStartedEvent
  | StepStartedEvent
  | StepCompletedEvent
  | StepFailedEvent
  | StepSkippedEvent
  | SignalAcceptedEvent
  | SignalRejectedEvent
  | RunPausedEvent
  | RunResumedEvent
  | RunCompletedEvent
  | RunFailedEvent
  | RunCancelledEvent;

/**
 * Base event structure.
 */
interface BaseEvent {
  eventId: string; // UUID v4
  eventType: string;
  runId: string;
  runSeq: number; // Assigned by StateStore
  idempotencyKey: string; // SHA256(runId | stepId | logicalAttemptId | eventType | planVersion)
  timestamp: string; // ISO 8601 UTC
  emittedBy: 'planner' | 'engine' | 'activity' | 'authorization';
}

export interface RunApprovedEvent extends BaseEvent {
  eventType: 'RunApproved';
  approvedBy: string;
  approvedAt: string;
}

export interface RunStartedEvent extends BaseEvent {
  eventType: 'RunStarted';
  engineRunRef: EngineRunRef;
  startedAt: string;
}

export interface StepStartedEvent extends BaseEvent {
  eventType: 'StepStarted';
  stepId: string;
  logicalAttemptId: string;
  engineAttemptId: string;
  startedAt: string;
}

export interface StepCompletedEvent extends BaseEvent {
  eventType: 'StepCompleted';
  stepId: string;
  logicalAttemptId: string;
  completedAt: string;
  durationMs: number;
  artifacts?: ArtifactRef[];
}

export interface StepFailedEvent extends BaseEvent {
  eventType: 'StepFailed';
  stepId: string;
  logicalAttemptId: string;
  error: ErrorInfo;
  failedAt: string;
}

export interface StepSkippedEvent extends BaseEvent {
  eventType: 'StepSkipped';
  stepId: string;
  reason: string;
  skippedAt: string;
}

export interface SignalAcceptedEvent extends BaseEvent {
  eventType: 'SignalAccepted';
  signalId: string;
  signalType: SignalType;
  signalPayload: Record<string, unknown>;
  actorId: string;
  policyDecisionId: string;
}

export interface SignalRejectedEvent extends BaseEvent {
  eventType: 'SignalRejected';
  signalId: string;
  signalType: SignalType;
  reason: string;
  actorId: string;
  policyDecisionId: string;
}

export interface RunPausedEvent extends BaseEvent {
  eventType: 'RunPaused';
  pausedAt: string;
  reason?: string;
}

export interface RunResumedEvent extends BaseEvent {
  eventType: 'RunResumed';
  resumedAt: string;
}

export interface RunCompletedEvent extends BaseEvent {
  eventType: 'RunCompleted';
  completedAt: string;
  totalDurationMs: number;
}

export interface RunFailedEvent extends BaseEvent {
  eventType: 'RunFailed';
  failedAt: string;
  error: ErrorInfo;
}

export interface RunCancelledEvent extends BaseEvent {
  eventType: 'RunCancelled';
  cancelledAt: string;
  cancelledBy: string;
  reason?: string;
}
