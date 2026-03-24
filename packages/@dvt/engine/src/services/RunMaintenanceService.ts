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
import type { EngineRunRef, TenantId } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import type { EventType, RunEventInput, RunMetadata } from '../contracts/runEvents.js';
import type { IdempotencyKeyBuilder } from '../core/idempotency.js';
import type {
  DetectStuckCancellingRunsOptions,
  DetectStuckRunsOptions,
  DetectStuckRunsResult,
  IRunMaintenanceService,
  ReconcileOrphanedIntentsOptions,
  ReconcileOrphanedIntentsResult,
} from '../ports/IRunMaintenanceService.js';
import type { IRunStateStoreRead, IRunStateStoreWrite } from '../ports/IRunStateStore.js';
import type { IStartRunIntentStore } from '../ports/IStartRunIntentStore.js';
import type { IAuthorizer } from '../security/authorizer.js';
import type { IClock } from '../utils/clock.js';

export interface RunMaintenanceServiceDeps {
  stateStoreRead: IRunStateStoreRead;
  stateStoreWrite: IRunStateStoreWrite;
  intentStore: IStartRunIntentStore;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  authorizer: IAuthorizer;
  clock: IClock;
  idempotency: IdempotencyKeyBuilder;
  observability: IObservability;
}

type OrphanedIntent = {
  readonly intentId: string;
  readonly tenantId: string;
  readonly runId: string;
  readonly provider: EngineRunRef['provider'];
  readonly status: string;
  readonly engineRunRef?: EngineRunRef;
};

type ReconcileOrphanedIntentOutcome = {
  readonly expired?: string;
  readonly cancelled?: string;
  readonly cancelFailed?: string;
};

export class RunMaintenanceService implements IRunMaintenanceService {
  private readonly observability: IObservability;

  constructor(private readonly deps: RunMaintenanceServiceDeps) {
    this.observability = deps.observability;
  }

  async detectStuckRuns(options: DetectStuckRunsOptions): Promise<DetectStuckRunsResult> {
    const { thresholdMs, tenantId, limit, dryRun } = options;
    await this.deps.authorizer.assertTenantAccess(tenantId);
    const nowMs = Date.parse(this.deps.clock.nowIsoUtc());
    const traceContext = buildMaintenanceContext(tenantId);

    const candidates = await this.observability.withContext(traceContext, () =>
      this.deps.stateStoreRead.listRuns({
        tenantId: tenantId as TenantId,
        status: 'PENDING',
        limit: limit ?? 100,
      })
    );

    const transitioned: string[] = [];
    let skipped = 0;

    for (const meta of candidates) {
      if (!meta.createdAt) {
        this.observability.logs.warn({
          msg: 'Skipping stuck-run candidate without createdAt',
          context: traceContext,
          attributes: { runId: meta.runId },
        });
        skipped++;
        continue;
      }
      if (nowMs - Date.parse(meta.createdAt) < thresholdMs) continue;
      if (dryRun) continue;

      await this.deps.stateStoreWrite.appendAndEnqueueTx(meta.runId, [
        this.buildRunEvent(meta, 'RunFailed', { reason: 'QUEUED_TIMEOUT' }),
      ]);

      this.observability.metrics
        .counter('dvt.run.queued_timeout_total', {
          provider: meta.provider,
          tenantId: meta.tenantId,
          operation: 'detectStuckRuns',
        })
        .add(1);
      this.observability.logs.info({
        msg: 'Transitioned stuck run to RunFailed',
        context: traceContext,
        attributes: {
          runId: meta.runId,
          provider: meta.provider,
          reason: 'QUEUED_TIMEOUT',
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

    // Query RUNNING runs — CANCELLING is a substatus (snapshot.cancelling = true)
    // so we must post-filter after checking the snapshot.
    const candidates = await this.deps.stateStoreRead.listRuns({
      tenantId: tenantId as TenantId,
      status: 'RUNNING',
      limit: limit ?? 100,
    });

    const transitioned: string[] = [];
    let skipped = 0;

    for (const meta of candidates) {
      const snapshot = await this.deps.stateStoreRead.getSnapshot(meta.tenantId, meta.runId);
      if (!snapshot?.cancelling) continue;

      const events = await this.deps.stateStoreRead.listEvents(meta.tenantId, meta.runId);
      const cancelEvent = events.find((e) => e.eventType === 'RunCancelRequested');
      if (!cancelEvent) {
        skipped++;
        continue;
      }

      if (nowMs - Date.parse(cancelEvent.emittedAt) < thresholdMs) continue;
      if (dryRun) continue;

      // ADR-0007: Do NOT synthesize RunCancelled — only the adapter may emit that.
      // Instead, transition to FAILED with a clear reason.
      await this.deps.stateStoreWrite.appendAndEnqueueTx(meta.runId, [
        this.buildRunEvent(meta, 'RunFailed', { reason: 'CANCELLATION_TIMEOUT' }),
      ]);

      this.observability.metrics
        .counter('dvt.run.cancellation_timeout_total', {
          provider: meta.provider,
          tenantId: meta.tenantId,
          operation: 'detectStuckCancellingRuns',
        })
        .add(1);
      this.observability.logs.info({
        msg: 'Transitioned cancelling run to RunFailed',
        context: traceContext,
        attributes: {
          runId: meta.runId,
          provider: meta.provider,
          reason: 'CANCELLATION_TIMEOUT',
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

  async reconcileOrphanedIntents(
    options: ReconcileOrphanedIntentsOptions
  ): Promise<ReconcileOrphanedIntentsResult> {
    const { thresholdMs, limit, dryRun } = options;
    const nowMs = Date.parse(this.deps.clock.nowIsoUtc());
    const traceContext = buildMaintenanceContext('system');

    const orphaned = await this.deps.intentStore.listOrphaned(thresholdMs, nowMs, limit ?? 100);

    const expired: string[] = [];
    const cancelled: string[] = [];
    const cancelFailed: string[] = [];

    for (const intent of orphaned) {
      if (dryRun) continue;

      const outcome = await this.reconcileOrphanedIntent(intent, traceContext);
      if (outcome.expired !== undefined) {
        expired.push(outcome.expired);
      }
      if (outcome.cancelled !== undefined) {
        cancelled.push(outcome.cancelled);
      }
      if (outcome.cancelFailed !== undefined) {
        cancelFailed.push(outcome.cancelFailed);
      }
    }

    return { inspected: orphaned.length, expired, cancelled, cancelFailed };
  }

  private async reconcileOrphanedIntent(
    intent: OrphanedIntent,
    traceContext: ReturnType<typeof buildMaintenanceContext>
  ): Promise<ReconcileOrphanedIntentOutcome> {
    if (intent.status === 'PENDING') {
      return this.reconcilePendingOrphanedIntent(intent, traceContext);
    }

    if (intent.status === 'DISPATCHED') {
      return this.reconcileDispatchedOrphanedIntent(intent, traceContext);
    }

    return {};
  }

  private async reconcilePendingOrphanedIntent(
    intent: OrphanedIntent,
    traceContext: ReturnType<typeof buildMaintenanceContext>
  ): Promise<ReconcileOrphanedIntentOutcome> {
    const existingMeta = await this.deps.stateStoreRead
      .getRunMetadataByRunId(intent.tenantId, intent.runId)
      .catch(() => null);

    const adapter = this.deps.adapters.get(intent.provider);

    // ADR-0030 §3.3: A PENDING intent may still have an orphaned provider workflow if the
    // process crashed between adapter.startRun() returning and markDispatched() being called.
    // Use lookupRunRef (if the adapter supports it) to detect this case.
    if (adapter?.lookupRunRef === undefined) {
      this.observability.logs.warn({
        msg: 'Keeping orphaned PENDING intent unresolved because provider lookup is unsupported',
        context: traceContext,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
          provider: intent.provider,
          hasBootstrappedRun: String(existingMeta !== null),
        },
      });
      return {};
    }

    let runRef: EngineRunRef | null = null;
    try {
      runRef = await adapter.lookupRunRef(intent.runId, intent.tenantId);
    } catch (lookupErr) {
      this.observability.logs.warn({
        msg: 'Keeping orphaned PENDING intent unresolved because provider lookup failed',
        context: traceContext,
        err: lookupErr,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
          provider: intent.provider,
        },
      });
      return {};
    }

    if (runRef !== null) {
      // Workflow exists on the provider side without a DVT+ state record.
      // Cancel it before expiring the intent. On cancel failure, leave the intent as PENDING
      // so the next reconciliation sweep retries (INV-INTENT-011).
      try {
        await adapter.cancelRun(runRef);
        await this.deps.intentStore.markExpired(intent.intentId);
        this.observability.metrics
          .counter('dvt.intent.expired_after_cancel_total', {
            provider: intent.provider,
            operation: 'reconcileOrphanedIntents',
          })
          .add(1);
        this.observability.logs.info({
          msg: 'Expired PENDING intent and cancelled orphaned provider workflow',
          context: traceContext,
          attributes: {
            intentId: intent.intentId,
            runId: intent.runId,
            provider: intent.provider,
          },
        });
        return { expired: intent.intentId };
      } catch (cancelErr) {
        // Cancel failed - leave intent as PENDING for retry on next sweep.
        this.observability.logs.error({
          msg: 'Failed to cancel orphaned provider workflow for PENDING intent',
          context: traceContext,
          err: cancelErr,
          attributes: { intentId: intent.intentId, runId: intent.runId },
        });
        return { cancelFailed: intent.intentId };
      }
    }

    if (existingMeta !== null) {
      this.observability.logs.warn({
        msg: 'Keeping orphaned PENDING intent unresolved because run is bootstrapped but provider workflow was not found',
        context: traceContext,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
          provider: intent.provider,
        },
      });
      return {};
    }

    await this.deps.intentStore.markExpired(intent.intentId);
    this.observability.logs.info({
      msg: 'Expired orphaned PENDING intent (no provider workflow)',
      context: traceContext,
      attributes: { intentId: intent.intentId, runId: intent.runId },
    });
    this.observability.metrics
      .counter('dvt.intent.expired_total', { operation: 'reconcileOrphanedIntents' })
      .add(1);
    return { expired: intent.intentId };
  }

  private async reconcileDispatchedOrphanedIntent(
    intent: OrphanedIntent,
    traceContext: ReturnType<typeof buildMaintenanceContext>
  ): Promise<ReconcileOrphanedIntentOutcome> {
    const existingMeta = await this.deps.stateStoreRead
      .getRunMetadataByRunId(intent.tenantId, intent.runId)
      .catch(() => null);

    if (existingMeta !== null) {
      // Run was bootstrapped successfully - just mark intent resolved.
      await this.deps.intentStore.markResolved(intent.intentId);
      this.observability.logs.info({
        msg: 'Resolved orphaned DISPATCHED intent (run already bootstrapped)',
        context: traceContext,
        attributes: { intentId: intent.intentId, runId: intent.runId },
      });
      return { cancelled: intent.intentId };
    }

    // Run was never bootstrapped - cancel provider workflow.
    const adapter = this.deps.adapters.get(intent.provider);
    if (adapter === undefined || intent.engineRunRef === undefined) {
      this.observability.logs.error({
        msg: 'Cannot cancel orphaned intent: adapter or engineRunRef missing',
        context: traceContext,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
          provider: intent.provider,
          hasRunRef: String(intent.engineRunRef !== undefined),
        },
      });
      return { cancelFailed: intent.intentId };
    }

    try {
      await adapter.cancelRun(intent.engineRunRef);
      await this.deps.intentStore.markResolved(intent.intentId);
      this.observability.metrics
        .counter('dvt.intent.cancelled_total', {
          provider: intent.provider,
          operation: 'reconcileOrphanedIntents',
        })
        .add(1);
      this.observability.logs.info({
        msg: 'Cancelled orphaned provider workflow from DISPATCHED intent',
        context: traceContext,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
          provider: intent.provider,
        },
      });
      return { cancelled: intent.intentId };
    } catch (cancelErr) {
      this.observability.logs.error({
        msg: 'Failed to cancel orphaned provider workflow',
        context: traceContext,
        err: cancelErr,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
        },
      });
      return { cancelFailed: intent.intentId };
    }
  }

  private buildRunEvent(
    meta: RunMetadata,
    eventType: EventType,
    payload?: Record<string, unknown>
  ): RunEventInput {
    return {
      eventId: this.deps.idempotency.eventId(),
      eventType,
      emittedAt: this.deps.clock.nowIsoUtc(),
      tenantId: meta.tenantId,
      projectId: meta.projectId,
      environmentId: meta.environmentId,
      runId: meta.runId,
      planId: meta.planId,
      planVersion: meta.planVersion,
      engineAttemptId: 1,
      logicalAttemptId: meta.logicalAttemptId,
      idempotencyKey: this.deps.idempotency.runEventKey({
        eventType,
        runId: meta.runId,
        logicalAttemptId: meta.logicalAttemptId,
        planId: meta.planId,
        planVersion: meta.planVersion,
      }),
      ...(payload === undefined ? {} : { payload }),
    };
  }
}

function buildMaintenanceContext(tenantId: string): {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
} {
  return {
    tenantId,
    projectId: 'maintenance',
    environmentId: 'maintenance',
    runId: 'maintenance',
  };
}
