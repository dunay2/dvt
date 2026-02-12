/**
 * IWorkflowEngine Contract Types (v1.1)
 *
 * TypeScript types extracted from IWorkflowEngine.v1.md
 * @see {@link docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md}
 *
 * Version 1.1 changes:
 * - startRun() now accepts PlanRef (not ExecutionPlan directly)
 * - signal() now accepts SignalRequest (includes signalId for idempotency)
 * - ConductorEngineRunRef.conductorUrl is REQUIRED (was optional)
 * - Added RunStatusSnapshot, correlation identifier semantics
 */

/**
 * Signal types supported by the workflow engine
 * @see {@link docs/architecture/engine/contracts/engine/SignalsAndAuth.v1.1.md}
 */
export type SignalType =
  | 'PAUSE'
  | 'RESUME'
  | 'RETRY_STEP'
  | 'UPDATE_PARAMS'
  | 'INJECT_OVERRIDE'
  | 'ESCALATE_ALERT'
  | 'SKIP_STEP'
  | 'UPDATE_TARGET'
  | 'EMERGENCY_STOP';

/**
 * Context information for a workflow run
 * @see IWorkflowEngine.v1.md § 2.1 - Operations
 */
export interface RunContext {
  /** Tenant identifier */
  tenantId: string;
  /** Project identifier */
  projectId: string;
  /** Environment identifier (e.g., "dev", "staging", "prod") */
  environmentId: string;
  /** Unique run identifier */
  runId: string;
  /** Target adapter to use for execution */
  targetAdapter: 'temporal' | 'conductor' | 'auto';
}

/**
 * Temporal-specific engine run reference
 * @see IWorkflowEngine.v1.md § 2.1.1 - EngineRunRef
 */
export interface TemporalEngineRunRef {
  provider: 'temporal';
  /** Temporal namespace */
  namespace: string;
  /** Workflow identifier */
  workflowId: string;
  /** Run identifier (optional) */
  runId?: string;
  /** Task queue name (optional, for debugging) */
  taskQueue?: string;
}

/**
 * Conductor-specific engine run reference
 * @see IWorkflowEngine.v1.md § 2.1.1 - EngineRunRef
 *
 * Invariant: conductorUrl MUST be present (per normative contract § 2.1.1)
 */
export interface ConductorEngineRunRef {
  provider: 'conductor';
  /** Workflow identifier */
  workflowId: string;
  /** Run identifier (optional) */
  runId?: string;
  /** Conductor API URL (REQUIRED per normative invariant) */
  conductorUrl: string;
}

/**
 * Polymorphic reference to a running workflow in any engine adapter
 * @see IWorkflowEngine.v1.md § 2.1.1 - EngineRunRef
 */
export type EngineRunRef = TemporalEngineRunRef | ConductorEngineRunRef;

/**
 * Plan reference for transport layer (not full plan due to size limits)
 * @see IWorkflowEngine.v1.md § 3.1 - PlanRef (Transport Layer)
 */
export interface PlanRef {
  /** Opaque URI to the plan (e.g., https://..., s3://..., gs://..., azure://...) */
  uri: string;
  /** SHA256 integrity hash */
  sha256: string;
  /** Schema version (MANDATORY, e.g., "v1.2") */
  schemaVersion: string;
  /** Plan identifier */
  planId: string;
  /** Plan version */
  planVersion: string;
  /** Size in bytes (optional) */
  sizeBytes?: number;
  /** Expiration timestamp (optional, ISO 8601) */
  expiresAt?: string;
}

/**
 * Execution plan structure (minimal contract)
 * Referenced by IWorkflowEngine.startRun
 * @see IWorkflowEngine.v1.md § 3 - Execution Plan Minimal Contract
 */
export interface ExecutionPlan {
  /** Plan metadata */
  metadata: {
    /** Plan identifier */
    planId: string;
    /** Plan version */
    planVersion: string;
    /** Required capabilities */
    requiresCapabilities?: string[];
    /** Fallback behavior when capabilities are missing */
    fallbackBehavior?: 'reject' | 'emulate' | 'degrade';
    /** Target adapter */
    targetAdapter?: 'temporal' | 'conductor' | 'any';
  };
  /** Plan steps (minimal structure) */
  steps: Array<{
    stepId: string;
    [key: string]: unknown;
  }>;
}

/**
 * Signal request payload
 * @see {@link docs/architecture/engine/contracts/engine/SignalsAndAuth.v1.1.md}
 *
 * Note: Implementation uses `unknown` for type safety; adapters MUST validate/decode payload at runtime.
 */
export interface SignalRequest {
  /** Client-supplied signal identifier (UUID v4) */
  signalId: string;
  /** Signal type */
  signalType: SignalType;
  /** Signal payload (varies by signal type) */
  payload: Record<string, unknown>;
}

/**
 * Query request payload
 * @see IWorkflowEngine.v1.md § 2.1 - Operations
 */
export interface QueryRequest {
  /** Query type */
  queryType: string;
  /** Query parameters */
  params?: Record<string, unknown>;
}

/**
 * Run status returned by getRunStatus
 * @see ExecutionSemantics.v1.md § 1.2 - Append-Only Event Model
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
 * Snapshot of run status
 * @see IWorkflowEngine.v1.md § 2.1 - Operations
 */
export interface RunStatusSnapshot {
  /** Run identifier */
  runId: string;
  /** Current status */
  status: RunStatus;
  /** Substatus (e.g., "DRAINING" during pause) */
  substatus?: string;
  /** Human-readable message */
  message?: string;
  /** Start timestamp (ISO 8601) */
  startedAt?: string;
  /** Completion timestamp (ISO 8601) */
  completedAt?: string;
}

/**
 * Signal decision record for authorization and audit
 * @see {@link docs/architecture/engine/contracts/engine/SignalsAndAuth.v1.1.md}
 */
export interface SignalDecisionRecord {
  /** Unique signal decision identifier (UUID v4) */
  signalDecisionId: string;
  /** Client-supplied signal identifier */
  signalId: string;
  /** Decision result */
  decision: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED';
  /** Reason for decision (optional) */
  reason?: string;
  /** Reference to authorization policy decision */
  policyDecisionId: string;
  /** Audit trail */
  audit: {
    /** Actor identifier (user ID or "system") */
    actorId: string;
    /** Actor role (e.g., "Operator", "Engineer", "Admin", "System") */
    actorRole: string;
    /** Tenant identifier */
    tenantId: string;
    /** Decision timestamp (ISO 8601 UTC) */
    timestamp: string;
    /** Reason for action (REQUIRED for destructive signals) */
    reason?: string;
    /** Source IP address (optional) */
    sourceIp?: string;
  };
  /** Signal type */
  signalType: SignalType;
  /** Signal payload */
  signalPayload: Record<string, unknown>;
  /** Timestamp when engine processed signal (ISO 8601, optional) */
  engineProcessedAt?: string;
  /** Result of engine processing (optional) */
  engineResult?: {
    status: 'success' | 'failure';
    errorCode?: string;
  };
  /** Whether approval is required (optional) */
  approvalRequired?: boolean;
  /** User who approved (optional) */
  approvedBy?: string;
  /** Approval timestamp (ISO 8601, optional) */
  approvalTimestamp?: string;
}

/**
 * Authorization interface for signal evaluation
 * @see {@link docs/architecture/engine/contracts/engine/SignalsAndAuth.v1.1.md}
 *
 * Note: Contract v1.1 uses `Record<string, unknown>` for type safety.
 * Implementations MUST validate/decode payload at runtime.
 */
export interface IAuthorization {
  /**
   * Evaluate whether a signal is authorized
   */
  evaluateSignal(request: {
    /** Actor information */
    actor: {
      userId: string;
      roles: string[];
    };
    /** Signal details */
    signal: {
      type: SignalType;
      payload: Record<string, unknown>;
    };
    /** Tenant identifier */
    tenantId: string;
    /** Run identifier */
    runId: string;
  }): Promise<{
    /** Whether the signal is allowed */
    allowed: boolean;
    /** Reason for denial (if not allowed) */
    reason?: string;
    /** Whether approval is required */
    requiresApproval?: boolean;
    /** Policy decision identifier */
    policyDecisionId: string;
  }>;
}

/**
 * Main workflow engine interface
 * @see IWorkflowEngine.v1.md § 2.1 - Operations
 */
export interface IWorkflowEngine {
  /**
   * Start a new workflow run
   * @param planRef - Reference to the execution plan (fetched from storage via Activity)
   * @param context - Run context (tenant, project, environment, etc.)
   * @returns Engine run reference for tracking and operations
   *
   * Note: Engine receives PlanRef, not full ExecutionPlan (respects payload limits).
   * Full plan is fetched via Activity from planRef.uri.
   */
  startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;

  /**
   * Cancel a running workflow
   * @param engineRunRef - Reference to the running workflow
   */
  cancelRun(engineRunRef: EngineRunRef): Promise<void>;

  /**
   * Get current status of a workflow run
   * @param engineRunRef - Reference to the workflow run
   * @returns Current run status snapshot
   */
  getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot>;

  /**
   * Send a signal to a running workflow
   * @param engineRunRef - Reference to the running workflow
   * @param request - Signal request including signalId (for idempotency), signalType, and payload
   *
   * Note: Normative contract v1.1 changed signature from (ref, signalType, payload) to (ref, SignalRequest)
   * to enforce idempotency via signalId.
   */
  signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>;
}

/**
 * Validation report for plan capability checks
 * @see IWorkflowEngine.v1.md § 4 - Cross-Adapter Capability Validation
 */
export interface ValidationReport {
  /** Plan identifier */
  planId: string;
  /** Validation status */
  status: 'VALID' | 'WARNINGS' | 'ERRORS';
  /** Validation errors */
  errors: Array<{
    code: string;
    capability: string;
    message: string;
  }>;
  /** Validation warnings */
  warnings: Array<{
    code: string;
    message: string;
  }>;
}
