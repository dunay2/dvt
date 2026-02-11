/**
 * DVT Engine - Temporal Adapter
 * Phase 1: MVP implementation of IWorkflowEngine interface
 *
 * Reference: TemporalAdapter.spec.md
 *
 * Phase 1 Scope:
 * - Basic workflow start, cancel, status, signal operations
 * - StateStore integration with event persistence
 * - Outbox pattern for event delivery
 *
 * Phase 2+ (Out of Scope):
 * - Continue-as-new optimization
 * - Advanced signal buffering
 * - Complete metrics and observability
 * - Multiple workflow version management
 */

import { v4 as uuidv4 } from 'uuid';

import {
  IRunStateStore,
  IOutboxStorage,
  OutboxEvent,
} from '../../state/IRunStateStore';
import {
  IWorkflowEngine,
  EngineRunRef,
  ExecutionPlan,
  RunContext,
  RunStatusSnapshot,
  SignalType,
  RunStartedEvent,
  SignalAcceptedEvent,
} from '../../types/contracts';

import { TemporalClient, TemporalConfig } from './TemporalClient';
import {
  mapTemporalDescriptionToSnapshot,
  createTemporalEngineRunRef,
  extractTemporalIds,
  createWorkflowId,
  determineTaskQueue,
} from './WorkflowMapper';

/**
 * Configuration for TemporalAdapter.
 */
export interface TemporalAdapterConfig {
  temporal: TemporalConfig;
  stateStore: IRunStateStore;
  outboxStorage?: IOutboxStorage; // Optional for Phase 1
}

/**
 * Temporal implementation of IWorkflowEngine.
 *
 * Phase 1 Implementation Notes:
 * - Uses a simplified workflow pattern (actual interpreter workflow to be implemented in Phase 2)
 * - StateStore integration for event persistence
 * - Basic signal handling
 * - Limited error handling (expanded in Phase 2+)
 */
export class TemporalAdapter implements IWorkflowEngine {
  private client: TemporalClient;
  private stateStore: IRunStateStore;
  private outboxStorage?: IOutboxStorage;

  constructor(config: TemporalAdapterConfig) {
    this.client = new TemporalClient(config.temporal);
    this.stateStore = config.stateStore;
    this.outboxStorage = config.outboxStorage;
  }

  /**
   * Initialize the adapter (connect to Temporal).
   */
  async initialize(): Promise<void> {
    await this.client.connect();
  }

  /**
   * Close the adapter (disconnect from Temporal).
   */
  async close(): Promise<void> {
    await this.client.close();
  }

  /**
   * Start a new workflow execution.
   * Maps to Temporal's client.workflow.start()
   *
   * Phase 1: Simplified implementation
   * - Creates workflow handle
   * - Persists RunStartedEvent to StateStore
   * - Queues event to Outbox
   *
   * Phase 2+: Full interpreter workflow implementation
   */
  async startRun(
    executionPlan: ExecutionPlan,
    context: RunContext,
  ): Promise<EngineRunRef> {
    const workflowId = createWorkflowId(context);
    const taskQueue = determineTaskQueue(
      context,
      this.client.getTaskQueue(),
    );

    try {
      // Phase 1: Start a simple workflow
      // Phase 2+: Replace with actual interpreterWorkflow
      // Note: In Phase 1, we simulate workflow start by just creating the reference
      // The actual workflow implementation will be in Phase 2

      // Create EngineRunRef
      const engineRunRef = createTemporalEngineRunRef(
        this.client.getNamespace(),
        workflowId,
        context.runId,
        taskQueue,
      );

      // Persist RunStartedEvent to StateStore
      const event: RunStartedEvent = {
        eventId: uuidv4(),
        eventType: 'RunStarted',
        runId: context.runId,
        runSeq: 0, // Will be assigned by StateStore
        idempotencyKey: this.generateIdempotencyKey(
          context.runId,
          '',
          'RunStarted',
          executionPlan.planVersion,
        ),
        timestamp: this.getCurrentTimestamp(),
        emittedBy: 'engine',
        engineRunRef,
        startedAt: this.getCurrentTimestamp(),
      };

      await this.stateStore.appendEvent(event);

      // Queue to outbox for EventBus delivery
      if (this.outboxStorage) {
        await this.enqueueToOutbox(event);
      }

      return engineRunRef;
    } catch (error) {
      throw new Error(
        `Failed to start workflow: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Cancel a running workflow.
   * Maps to Temporal's client.workflow.cancel()
   *
   * Phase 1: Basic cancellation
   * Phase 2+: Graceful shutdown with cleanup
   */
  async cancelRun(engineRunRef: EngineRunRef): Promise<void> {
    const { workflowId, runId } = extractTemporalIds(engineRunRef);
    const client = this.client.getClient();

    try {
      const handle = client.workflow.getHandle(workflowId, runId);
      await handle.cancel();

      // TODO Phase 2: Persist RunCancelledEvent to StateStore
    } catch (error) {
      throw new Error(
        `Failed to cancel workflow ${workflowId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get current status of a workflow run.
   * Maps to Temporal's client.workflow.describe()
   *
   * Phase 1: Basic status from Temporal + StateStore
   * Phase 2+: Enhanced with step-level details
   */
  async getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot> {
    const { workflowId, runId } = extractTemporalIds(engineRunRef);
    const client = this.client.getClient();

    try {
      const handle = client.workflow.getHandle(workflowId, runId);
      const description = await handle.describe();

      // Map Temporal status to RunStatusSnapshot
      const snapshot = mapTemporalDescriptionToSnapshot(
        description,
        engineRunRef.runId || workflowId,
      );

      // Phase 1: Merge with StateStore snapshot for complete picture
      const stateStoreSnapshot =
        await this.stateStore.getSnapshot(engineRunRef.runId || workflowId);
      if (stateStoreSnapshot) {
        snapshot.lastEventSeq = stateStoreSnapshot.lastEventSeq;
        snapshot.steps = stateStoreSnapshot.steps;
        snapshot.artifacts = stateStoreSnapshot.artifacts;
      }

      snapshot.engineRunRef = engineRunRef;

      return snapshot;
    } catch (error) {
      throw new Error(
        `Failed to get workflow status ${workflowId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Send a signal to a running workflow.
   * Maps to Temporal's client.workflow.signal()
   *
   * Phase 1: Basic signal routing
   * Phase 2+: Authorization, signal buffering, decision records
   */
  async signal(
    engineRunRef: EngineRunRef,
    signalType: SignalType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const { workflowId, runId } = extractTemporalIds(engineRunRef);
    const client = this.client.getClient();

    try {
      const handle = client.workflow.getHandle(workflowId, runId);

      // Map signal type to Temporal signal name
      const signalName = this.mapSignalTypeToTemporalSignal(signalType);

      // Send signal to workflow
      await handle.signal(signalName, payload);

      // Persist SignalAcceptedEvent to StateStore
      const event: SignalAcceptedEvent = {
        eventId: uuidv4(),
        eventType: 'SignalAccepted',
        runId: engineRunRef.runId || workflowId,
        runSeq: 0, // Will be assigned by StateStore
        idempotencyKey: this.generateIdempotencyKey(
          engineRunRef.runId || workflowId,
          '',
          'SignalAccepted',
          signalType,
        ),
        timestamp: this.getCurrentTimestamp(),
        emittedBy: 'engine',
        signalId: uuidv4(),
        signalType,
        signalPayload: payload,
        actorId: 'system', // Phase 1: System actor; Phase 2+: Real actor
        policyDecisionId: uuidv4(), // Phase 1: Placeholder; Phase 2+: IAuthorization integration
      };

      await this.stateStore.appendEvent(event);

      // Queue to outbox
      if (this.outboxStorage) {
        await this.enqueueToOutbox(event);
      }
    } catch (error) {
      throw new Error(
        `Failed to send signal ${signalType} to workflow ${workflowId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Map DVT SignalType to Temporal signal name.
   * Phase 1: Simple lowercase mapping.
   * Phase 2+: More sophisticated routing.
   */
  private mapSignalTypeToTemporalSignal(signalType: SignalType): string {
    return signalType.toLowerCase();
  }

  /**
   * Generate idempotency key for events.
   * Format: SHA256(runId | stepId | logicalAttemptId | eventType | planVersion)
   *
   * Phase 1: Simplified string concatenation
   * Phase 2+: Actual SHA256 hashing
   */
  private generateIdempotencyKey(
    runId: string,
    stepId: string,
    eventType: string,
    extra: string,
  ): string {
    // Phase 1: Simple concatenation (good enough for in-memory testing)
    // Phase 2+: Use crypto.createHash('sha256')
    return `${runId}:${stepId}:${eventType}:${extra}`;
  }

  /**
   * Enqueue event to outbox for EventBus delivery.
   * Implements Outbox pattern for eventual consistency.
   */
  private async enqueueToOutbox(
    event: RunStartedEvent | SignalAcceptedEvent,
  ): Promise<void> {
    if (!this.outboxStorage) {
      return;
    }

    const outboxEvent: OutboxEvent = {
      eventId: event.eventId,
      runId: event.runId,
      eventType: event.eventType,
      payload: event,
      status: 'pending',
      createdAt: this.getCurrentTimestamp(),
      attemptCount: 0,
    };

    await this.outboxStorage.appendOutbox(outboxEvent);
  }

  /**
   * Get current timestamp.
   * Phase 1: Uses Date.now() (non-deterministic, but acceptable outside workflow code).
   * Note: This is adapter code, not workflow code, so Date is safe here.
   */
  private getCurrentTimestamp(): string {
    // eslint-disable-next-line no-restricted-globals
    return new Date().toISOString();
  }
}
