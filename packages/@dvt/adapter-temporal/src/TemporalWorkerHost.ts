/**
 * @file packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0003: Execution Model
 * @decision Section 2 — Worker lifecycle ownership is centralized in a single host
 * @decision Section 3 — Worker startup binds deterministic workflow + activities wiring
 * @consequence Temporal worker start/shutdown behavior remains predictable across integration and runtime paths
 * @version 1.0.0
 * @date 2026-02-21
 */
import { NativeConnection, Worker } from '@temporalio/worker';

import type { ActivityDeps } from './activities/stepActivities.js';
import { createActivities } from './activities/stepActivities.js';
import type { TemporalAdapterConfig } from './config.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface TemporalWorkerHostConfig {
  temporalConfig: TemporalAdapterConfig;
  activityDeps: ActivityDeps;
  /** Override for testing; defaults to bundling RunPlanWorkflow. */
  workflowsPath?: string;
}

// ---------------------------------------------------------------------------
// WorkerHost — manages Temporal Worker lifecycle
// ---------------------------------------------------------------------------

export class TemporalWorkerHost {
  private worker: Worker | null = null;
  private running: Promise<void> | null = null;

  constructor(private readonly config: TemporalWorkerHostConfig) {}

  /**
   * Create the Temporal Worker and start polling.
   * Requires an already-established NativeConnection.
   */
  async start(connection: NativeConnection): Promise<void> {
    if (this.worker) {
      throw new Error('TEMPORAL_WORKER_ALREADY_STARTED');
    }

    const activities = createActivities(this.config.activityDeps);

    this.worker = await Worker.create({
      connection,
      namespace: this.config.temporalConfig.namespace,
      taskQueue: this.config.temporalConfig.taskQueue,
      workflowsPath: this.config.workflowsPath ?? require.resolve('./workflows/RunPlanWorkflow'),
      activities,
      identity: this.config.temporalConfig.identity,
    });

    // worker.run() blocks until shutdown; store the promise
    this.running = this.worker.run();
  }

  /** Gracefully drain in-flight work and stop polling. */
  async shutdown(): Promise<void> {
    if (!this.worker) return;

    this.worker.shutdown();
    await this.running;
    this.worker = null;
    this.running = null;
  }

  isRunning(): boolean {
    return this.worker !== null;
  }
}
