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
