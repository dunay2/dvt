/**
 * IWorkflowEngine Contract Types (v1.0)
 *
 * TypeScript types extracted from IWorkflowEngine.v1.md
 * @see {@link docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md}
 */

/**
 * Signal types supported by the workflow engine
 * @see IWorkflowEngine.v1.md § 2.3 - Supported Signals Catalog
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
  /** URI to the plan (e.g., s3://bucket/plans/{planId}.json) */
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
 * @see IWorkflowEngine.v1.md § 2.3 - Supported Signals Catalog
 *
 * Note: Normative contract uses `Record<string, any>` for payload.
 * Implementation uses `unknown` for type safety; adapters MUST validate/decode payload at runtime.
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
 * @see IWorkflowEngine.v1.md § 2.4 - Authorization & Signal Decision Records
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
 * @see IWorkflowEngine.v1.md § 2.4 - Authorization & Signal Decision Records
 *
 * Note: Normative contract uses `Record<string, any>` for payloads.
 * Implementation uses `unknown` for type safety; implementations MUST validate at runtime.
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
   * @param executionPlan - The execution plan to run
   * @param context - Run context (tenant, project, environment, etc.)
   * @returns Engine run reference for tracking and operations
   */
  startRun(executionPlan: ExecutionPlan, context: RunContext): Promise<EngineRunRef>;

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
   * @param signalType - Type of signal to send
   * @param payload - Signal payload
   *
   * Note: Normative contract specifies `Record<string, any>`.
   * Implementation uses `unknown` for type safety; adapters MUST validate/decode payload.
   */
  signal(
    engineRunRef: EngineRunRef,
    signalType: SignalType,
    payload: Record<string, unknown>
  ): Promise<void>;
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
