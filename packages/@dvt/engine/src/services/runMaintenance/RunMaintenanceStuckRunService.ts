import type { RunMetadata } from '../../contracts/runEvents.js';
import type {
  DetectStuckCancellingRunsOptions,
  DetectStuckRunsOptions,
  DetectStuckRunsResult,
} from '../../ports/IRunMaintenanceService.js';

import {
  buildMaintenanceContext,
  type RunMaintenanceListRunsQuery,
  type RunMaintenanceServiceDeps,
} from './RunMaintenanceContracts.js';
import {
  RUN_MAINTENANCE_EVENT_TYPE,
  RUN_MAINTENANCE_MESSAGE,
  RUN_MAINTENANCE_METRIC,
  RUN_MAINTENANCE_NUMERIC,
  RUN_MAINTENANCE_OPERATION,
  RUN_MAINTENANCE_RUN_FAILED_REASON,
  RUN_MAINTENANCE_RUN_STATUS,
} from './RunMaintenanceDomainConstants.js';
import { RunMaintenanceEventFactory } from './RunMaintenanceEventFactory.js';

export class RunMaintenanceStuckRunService {
  private readonly eventFactory: RunMaintenanceEventFactory;

  constructor(private readonly deps: RunMaintenanceServiceDeps) {
    this.eventFactory = new RunMaintenanceEventFactory(this.deps);
  }

  async detectStuckRuns(options: DetectStuckRunsOptions): Promise<DetectStuckRunsResult> {
    const { thresholdMs, tenantId, limit, dryRun } = options;
    await this.deps.authorizer.assertTenantAccess(tenantId);
    const nowMs = Date.parse(this.deps.clock.nowIsoUtc());
    const traceContext = buildMaintenanceContext(tenantId);

    const candidates = await this.listRunsWithContext(traceContext, {
      tenantId: tenantId as RunMaintenanceListRunsQuery['tenantId'],
      status: RUN_MAINTENANCE_RUN_STATUS.pending,
      limit: limit ?? RUN_MAINTENANCE_NUMERIC.defaultLimit,
    });

    const transitioned: string[] = [];
    let skipped = 0;

    for (const meta of candidates) {
      if (!meta.createdAt) {
        this.safeLogWarn({
          msg: RUN_MAINTENANCE_MESSAGE.skipStuckRunWithoutCreatedAt,
          context: traceContext,
          attributes: { runId: meta.runId },
        });
        skipped++;
        continue;
      }
      if (nowMs - Date.parse(meta.createdAt) < thresholdMs) continue;
      if (dryRun) continue;

      await this.deps.stateStoreWrite.appendAndEnqueueTx(meta.runId, [
        this.eventFactory.buildRunFailedEvent(
          meta,
          RUN_MAINTENANCE_RUN_FAILED_REASON.queuedTimeout
        ),
      ]);

      this.safeIncrementCounter(RUN_MAINTENANCE_METRIC.queuedTimeoutTotal, {
        provider: meta.provider,
        tenantId: meta.tenantId,
        operation: RUN_MAINTENANCE_OPERATION.detectStuckRuns,
      });
      this.safeLogInfo({
        msg: RUN_MAINTENANCE_MESSAGE.transitionedStuckRunToFailed,
        context: traceContext,
        attributes: {
          runId: meta.runId,
          provider: meta.provider,
          reason: RUN_MAINTENANCE_RUN_FAILED_REASON.queuedTimeout,
        },
      });
      transitioned.push(meta.runId);
    }

    return {
      tenantId,
      inspected: candidates.length,
      transitioned,
      skipped,
    };
  }

  async detectStuckCancellingRuns(
    options: DetectStuckCancellingRunsOptions
  ): Promise<DetectStuckRunsResult> {
    const { thresholdMs, tenantId, limit, dryRun } = options;
    await this.deps.authorizer.assertTenantAccess(tenantId);
    const nowMs = Date.parse(this.deps.clock.nowIsoUtc());
    const traceContext = buildMaintenanceContext(tenantId);

    const candidates = await this.listRunsWithContext(traceContext, {
      tenantId: tenantId as RunMaintenanceListRunsQuery['tenantId'],
      status: RUN_MAINTENANCE_RUN_STATUS.running,
      limit: limit ?? RUN_MAINTENANCE_NUMERIC.defaultLimit,
    });

    const transitioned: string[] = [];
    let skipped = 0;

    for (const meta of candidates) {
      const snapshot = await this.deps.stateStoreRead.getSnapshot(meta.tenantId, meta.runId);
      if (!snapshot?.cancelling) continue;

      const events = await this.deps.stateStoreRead.listEvents(meta.tenantId, meta.runId);
      const cancelEvent = events.find(
        (e) => e.eventType === RUN_MAINTENANCE_EVENT_TYPE.runCancelRequested
      );
      if (!cancelEvent) {
        skipped++;
        continue;
      }

      if (nowMs - Date.parse(cancelEvent.emittedAt) < thresholdMs) continue;
      if (dryRun) continue;

      await this.deps.stateStoreWrite.appendAndEnqueueTx(meta.runId, [
        this.eventFactory.buildRunFailedEvent(
          meta,
          RUN_MAINTENANCE_RUN_FAILED_REASON.cancellationTimeout
        ),
      ]);

      this.safeIncrementCounter(RUN_MAINTENANCE_METRIC.cancellationTimeoutTotal, {
        provider: meta.provider,
        tenantId: meta.tenantId,
        operation: RUN_MAINTENANCE_OPERATION.detectStuckCancellingRuns,
      });
      this.safeLogInfo({
        msg: RUN_MAINTENANCE_MESSAGE.transitionedCancellingRunToFailed,
        context: traceContext,
        attributes: {
          runId: meta.runId,
          provider: meta.provider,
          reason: RUN_MAINTENANCE_RUN_FAILED_REASON.cancellationTimeout,
        },
      });
      transitioned.push(meta.runId);
    }

    return {
      tenantId,
      inspected: candidates.length,
      transitioned,
      skipped,
    };
  }

  private async listRunsWithContext(
    context: ReturnType<typeof buildMaintenanceContext>,
    query: RunMaintenanceListRunsQuery
  ): Promise<RunMetadata[]> {
    const listRuns = (): Promise<RunMetadata[]> => this.deps.stateStoreRead.listRuns(query);
    try {
      return await this.deps.observability.withContext(context, listRuns);
    } catch {
      return listRuns();
    }
  }

  private safeIncrementCounter(name: string, labels: Readonly<Record<string, string>>): void {
    try {
      this.deps.observability.metrics
        .counter(name, labels)
        .add(RUN_MAINTENANCE_NUMERIC.metricIncrement);
    } catch {
      // no-op
    }
  }

  private safeLogInfo(
    entry: Parameters<RunMaintenanceServiceDeps['observability']['logs']['info']>[0]
  ): void {
    try {
      this.deps.observability.logs.info(entry);
    } catch {
      // no-op
    }
  }

  private safeLogWarn(
    entry: Parameters<RunMaintenanceServiceDeps['observability']['logs']['warn']>[0]
  ): void {
    try {
      this.deps.observability.logs.warn(entry);
    } catch {
      // no-op
    }
  }
}
