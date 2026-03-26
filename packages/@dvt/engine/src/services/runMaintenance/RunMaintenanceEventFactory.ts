import type { EventType, RunEventInput, RunMetadata } from '../../contracts/runEvents.js';

import type { RunMaintenanceServiceDeps } from './RunMaintenanceContracts.js';
import {
  RUN_MAINTENANCE_EVENT_TYPE,
  RUN_MAINTENANCE_NUMERIC,
  type RunMaintenanceRunFailedReason,
} from './RunMaintenanceDomainConstants.js';

type RunMaintenanceEventFactoryDeps = Pick<RunMaintenanceServiceDeps, 'clock' | 'idempotency'>;

export class RunMaintenanceEventFactory {
  constructor(private readonly deps: RunMaintenanceEventFactoryDeps) {}

  buildRunFailedEvent(meta: RunMetadata, reason: RunMaintenanceRunFailedReason): RunEventInput {
    return this.buildRunEvent(meta, RUN_MAINTENANCE_EVENT_TYPE.runFailed, { reason });
  }

  private buildRunEvent(
    meta: RunMetadata,
    eventType: EventType,
    payload?: RunEventInput['payload']
  ): RunEventInput {
    return {
      eventId: this.deps.idempotency.eventId(),
      eventType,
      payloadVersion: RUN_MAINTENANCE_NUMERIC.eventPayloadVersion,
      emittedAt: this.deps.clock.nowIsoUtc(),
      tenantId: meta.tenantId,
      projectId: meta.projectId,
      environmentId: meta.environmentId,
      runId: meta.runId,
      planId: meta.planId,
      planVersion: meta.planVersion,
      engineAttemptId: RUN_MAINTENANCE_NUMERIC.engineAttemptId,
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
