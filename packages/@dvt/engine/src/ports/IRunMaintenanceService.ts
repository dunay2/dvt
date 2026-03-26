/**
 * @file packages/@dvt/engine/src/ports/IRunMaintenanceService.ts
 * @baseline ADR-0029: Run Maintenance Service Extraction
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Batch/operational maintenance operations are separated from lifecycle methods on IWorkflowEngine
 * @decision reconcileOrphanedIntents added per ADR-0030 for intent orphan detection
 * @consequence Orphaned provider workflows from process crashes are automatically detected and cancelled
 * @version 1.0.0
 * @date 2026-03-03
 */

export interface DetectStuckRunsOptions {
  tenantId: string;
  thresholdMs: number;
  limit?: number;
  dryRun?: boolean;
}

export interface DetectStuckRunsResult {
  tenantId: string;
  inspected: number;
  transitioned: string[];
  skipped: number;
}

export interface DetectStuckCancellingRunsOptions {
  tenantId: string;
  thresholdMs: number;
  limit?: number;
  dryRun?: boolean;
}

export interface ReconcileOrphanedIntentsOptions {
  thresholdMs: number;
  limit?: number;
  dryRun?: boolean;
}

export interface ReconcileOrphanedIntentsResult {
  inspected: number;
  /** Intent IDs expired (PENDING beyond threshold, no provider workflow). */
  expired: string[];
  /** Intent IDs cancelled/resolved (DISPATCHED, provider workflow cleaned up). */
  cancelled: string[];
  /** Intent IDs where cancellation failed (will be retried next sweep). */
  cancelFailed: string[];
  /**
   * Intent IDs intentionally left unresolved by policy (for example: lookup unsupported,
   * lookup failure, or run already bootstrapped without provider workflow).
   * In `dryRun` mode, inspected intent IDs are returned as deferred because no mutation
   * is executed.
   */
  deferred: string[];
}

export interface IRunMaintenanceService {
  detectStuckRuns(options: DetectStuckRunsOptions): Promise<DetectStuckRunsResult>;
  detectStuckCancellingRuns(
    options: DetectStuckCancellingRunsOptions
  ): Promise<DetectStuckRunsResult>;
  reconcileOrphanedIntents(
    options: ReconcileOrphanedIntentsOptions
  ): Promise<ReconcileOrphanedIntentsResult>;
}
