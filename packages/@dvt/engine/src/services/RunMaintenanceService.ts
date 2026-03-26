/**
 * @file packages/@dvt/engine/src/services/RunMaintenanceService.ts
 * @baseline ADR-0009: Outbox Publication Ordering Guarantees
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Batch maintenance operations (detectStuckRuns) separated from IWorkflowEngine lifecycle
 * @decision reconcileOrphanedIntents detects and cancels orphaned provider workflows per ADR-0030
 * @version 1.0.0
 * @date 2026-03-03
 */
import type {
  DetectStuckCancellingRunsOptions,
  DetectStuckRunsOptions,
  DetectStuckRunsResult,
  IRunMaintenanceService,
  ReconcileOrphanedIntentsOptions,
  ReconcileOrphanedIntentsResult,
} from '../ports/IRunMaintenanceService.js';

import type { RunMaintenanceServiceDeps } from './runMaintenance/RunMaintenanceContracts.js';
import { RunMaintenanceOrphanedIntentService } from './runMaintenance/RunMaintenanceOrphanedIntentService.js';
import { RunMaintenanceStuckRunService } from './runMaintenance/RunMaintenanceStuckRunService.js';

export type { RunMaintenanceServiceDeps } from './runMaintenance/RunMaintenanceContracts.js';

export class RunMaintenanceService implements IRunMaintenanceService {
  private readonly stuckRunService: RunMaintenanceStuckRunService;
  private readonly orphanedIntentService: RunMaintenanceOrphanedIntentService;

  constructor(private readonly deps: RunMaintenanceServiceDeps) {
    this.stuckRunService = new RunMaintenanceStuckRunService(this.deps);
    this.orphanedIntentService = new RunMaintenanceOrphanedIntentService(this.deps);
  }

  async detectStuckRuns(options: DetectStuckRunsOptions): Promise<DetectStuckRunsResult> {
    return this.stuckRunService.detectStuckRuns(options);
  }

  async detectStuckCancellingRuns(
    options: DetectStuckCancellingRunsOptions
  ): Promise<DetectStuckRunsResult> {
    return this.stuckRunService.detectStuckCancellingRuns(options);
  }

  async reconcileOrphanedIntents(
    options: ReconcileOrphanedIntentsOptions
  ): Promise<ReconcileOrphanedIntentsResult> {
    return this.orphanedIntentService.reconcileOrphanedIntents(options);
  }
}
