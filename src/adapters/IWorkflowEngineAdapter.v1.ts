/**
 * IWorkflowEngineAdapter.v1
 *
 * Normative contract for the core workflow orchestration engine.
 *
 * Role: Drive workflow execution through state transitions, step coordination,
 *       determinism guarantee, and failure recovery.
 *
 * Context: The heart of the distributed workflow execution system.
 * Implements the state machine, handles retries, ensures idempotency, and
 * coordinates with adapters.
 *
 * Key Principles:
 * - Determinism: Same inputs always produce same outputs (for replay/recovery)
 * - Idempotency: Duplicate requests produce same result without side effects
 * - Durability: State transitions are atomic with outbox pattern
 * - Fairness: No single workflow monopolizes execution
 */

import { TenantId, PlanId, RunId, StepId, IdempotencyKey, RunState, StepState } from './../../contracts/types'

/**
 * Request to execute a workflow step.
 */
export interface ExecuteStepRequest {
  tenantId: TenantId
  planId: PlanId
  runId: RunId
  stepId: StepId
  stepType: string
  stepData: Record<string, unknown>
  idempotencyKey?: IdempotencyKey // For idempotency guarantee
  timeout?: number // Max execution time in milliseconds
}

/**
 * Result after step execution.
 */
export interface ExecuteStepResult {
  runId: RunId
  stepId: StepId
  status: StepState
  output?: Record<string, unknown>
  error?: {
    code: string
    message: string
    retryable: boolean
  }
  duration: number
  executedAt: number
}

/**
 * Workflow run state for inspection/recovery.
 */
export interface WorkflowRunState {
  tenantId: TenantId
  planId: PlanId
  runId: RunId
  status: RunState
  currentStep?: StepId
  completedSteps: Map<StepId, StepState>
  failedSteps: Map<StepId, string> // stepId -> error reason
  startedAt: number
  completedAt?: number
  totalDuration?: number
}

/**
 * IWorkflowEngineAdapter - Normative contract for workflow orchestration.
 *
 * Responsibilities:
 * 1. Accept workflow execution requests
 * 2. Maintain run state and step states
 * 3. Coordinate step execution in order
 * 4. Handle failures and retries
 * 5. Record events for auditing
 * 6. Ensure deterministic replay
 */
export interface IWorkflowEngineAdapter {
  /**
   * Create a new workflow run.
   *
   * @param tenantId - Tenant identifier
   * @param planId - Workflow plan identifier
   * @param planData - Workflow definition/configuration
   * @returns Ready-to-execute run state
   *
   * Contract:
   * - Must create exactly one run per request (idempotent with runId dedup)
   * - Must transition to INITIALIZING state
   * - Must record creation event
   * - Must be durable before returning
   */
  createRun(
    tenantId: TenantId,
    planId: PlanId,
    planData: Record<string, unknown>
  ): Promise<WorkflowRunState>

  /**
   * Start execution of a workflow run.
   *
   * @param tenantId - Tenant identifier
   * @param runId - Workflow run identifier
   * @returns Updated run state (should be RUNNING)
   *
   * Contract:
   * - Idempotent: Calling multiple times returns same result
   * - Transitions from INITIALIZING to RUNNING
   * - Records start event
   * - Routes first step for execution
   */
  startRun(tenantId: TenantId, runId: RunId): Promise<WorkflowRunState>

  /**
   * Execute a single workflow step.
   *
   * @param request - Step execution details
   * @returns Result with status and output
   *
   * Contract:
   * - Idempotent: Same idempotencyKey returns cached result
   * - Validates step is current/waiting
   * - Calls plugin/adapter for actual step logic
   * - Records event with result
   * - Routes next step after success
   * - Handles failure with retry/error record
   *
   * Example:
   * const result = await engine.executeStep({
   *   tenantId: 'tenant-001',
   *   runId: 'run-001',
   *   stepId: 'step-001',
   *   stepType: 'http_request',
   *   stepData: { method: 'GET', url: 'https://...' }
   * })
   */
  executeStep(request: ExecuteStepRequest): Promise<ExecuteStepResult>

  /**
   * Execute multiple steps (batch).
   *
   * More efficient than individual calls for parallel steps.
   *
   * @param requests - Multiple step requests
   * @returns Results after execution
   *
   * Contract:
   * - Process in parallel where possible (depends on workflow topology)
   * - Coordinate dependencies (if step A depends on B, wait for B)
   * - Apply same idempotency/durability as individual executeStep
   */
  executeStepBatch(requests: ExecuteStepRequest[]): Promise<ExecuteStepResult[]>

  /**
   * Pause a running workflow.
   *
   * @param tenantId - Tenant identifier
   * @param runId - Workflow run identifier
   * @param reason - Why paused (user, error recovery, etc.)
   * @returns Updated run state (status = PAUSED)
   *
   * Contract:
   * - Idempotent (can pause multiple times)
   * - Prevents new steps from starting
   * - Records pause event with reason
   * - Does not cancel in-flight steps (graceful drain)
   *
   * Note: Conductor has limitation - cannot cancel in-flight steps,
   *       only prevent new ones. Same here.
   */
  pauseRun(tenantId: TenantId, runId: RunId, reason: string): Promise<WorkflowRunState>

  /**
   * Resume a paused workflow.
   *
   * @param tenantId - Tenant identifier
   * @param runId - Workflow run identifier
   * @returns Updated run state (status = RUNNING)
   *
   * Contract:
   * - Idempotent (can resume multiple times)
   * - Routes next pending step
   * - Records resume event
   */
  resumeRun(tenantId: TenantId, runId: RunId): Promise<WorkflowRunState>

  /**
   * Terminate a workflow run (final failure).
   *
   * @param tenantId - Tenant identifier
   * @param runId - Workflow run identifier
   * @param reason - Why terminated (error, user request, etc.)
   * @returns Updated run state (status = FAILED or CANCELLED)
   *
   * Contract:
   * - Idempotent
   * - Prevents any future execution
   * - Records termination event
   * - Status should be CANCELLED if user requested, FAILED if error
   */
  terminateRun(tenantId: TenantId, runId: RunId, reason: string): Promise<WorkflowRunState>

  /**
   * Get current run state.
   *
   * @param tenantId - Tenant identifier
   * @param runId - Workflow run identifier
   * @returns Current state snapshot
   *
   * Contract:
   * - Returns most recent state
   * - Should be eventually consistent (may be stale temporarily)
   * - Returns undefined if run not found
   * - Should be fast (cached allowed)
   */
  getRunState(tenantId: TenantId, runId: RunId): Promise<WorkflowRunState | undefined>

  /**
   * Get run state for recovery/replay.
   *
   * Includes full event history for determinism verification.
   *
   * @param tenantId - Tenant identifier
   * @param runId - Workflow run identifier
   * @returns State + complete event sequence
   *
   * Contract:
   * - Returns events in sequence order
   * - Events are immutable
   * - States can be replayed from events
   */
  getRunStateWithHistory(
    tenantId: TenantId,
    runId: RunId
  ): Promise<{
    state: WorkflowRunState
    events: Array<{
      eventId: string
      type: string
      data: Record<string, unknown>
      sequence: number
      timestamp: number
    }>
  } | undefined>

  /**
   * Replay a workflow from events for determinism verification.
   *
   * @param tenantId - Tenant identifier
   * @param runId - Workflow run identifier
   * @returns Replayed state to compare against golden master
   *
   * Contract:
   * - Must produce identical state from same events (determinism)
   * - Uses same Clock and PRNG services
   * - No external calls allowed (pure determinism)
   * - Used for correctness verification
   */
  replayRun(tenantId: TenantId, runId: RunId): Promise<WorkflowRunState>

  /**
   * Archive a completed workflow run.
   *
   * @param tenantId - Tenant identifier
   * @param runId - Workflow run identifier
   *
   * Contract:
   * - Idempotent
   * - Can only archive completed runs (COMPLETED, FAILED, CANCELLED)
   * - Moves from hot to cold storage
   * - Event log still available for audit
   */
  archiveRun(tenantId: TenantId, runId: RunId): Promise<void>

  /**
   * Health check for engine availability.
   *
   * @returns { healthy: boolean, message?: string, components: Object }
   *
   * Contract:
   * - Should return quickly
   * - Should check state store, outbox, adapter connectivity
   * - Components object details each adapter health
   */
  health(): Promise<{
    healthy: boolean
    message?: string
    components: Record<string, { healthy: boolean; message?: string }>
  }>

  /**
   * Graceful shutdown.
   *
   * Contract:
   * - Must complete all in-flight steps
   * - Must flush outbox
   * - Timeout after reasonable duration (e.g., 30 seconds)
   */
  close(): Promise<void>
}

/**
 * Adapter-specific implementations can extend with:
 * - Custom step routing logic (DAG, linear, conditional)
 * - Retry strategies (exponential backoff, jitter, max retries)
 * - Concurrency control (rate limiting, fairness)
 * - Timeout handling (escalation, fallback)
 * - Determinism verification (snapshot comparison)
 */
