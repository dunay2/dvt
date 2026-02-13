import type { SignalRequest } from '@dvt/contracts';

import type { EventType } from '../contracts/runEvents.js';

export interface EventIdempotencyInput {
  eventType: EventType;
  tenantId: string;
  runId: string;
  logicalAttemptId: number;
  stepId?: string;
}

/**
 * Idempotency keys MUST derive from logicalAttemptId (not engineAttemptId).
 * This builder is deterministic and stable.
 */
export class IdempotencyKeyBuilder {
  runEventKey(e: EventIdempotencyInput): string {
    const scope = isStepEventType(e.eventType) ? 'STEP' : 'RUN';

    const base = ['evt', scope, e.tenantId, e.runId, e.eventType, `la:${e.logicalAttemptId}`];

    if (scope === 'STEP') {
      if (!e.stepId) {
        throw new Error(`IdempotencyKeyBuilder: stepId required for ${e.eventType}`);
      }
      base.push(`step:${e.stepId}`);
    }

    return base.join('|');
  }

  signalKey(tenantId: string, runId: string, req: SignalRequest): string {
    // Contract: (tenantId, runId, signalId)
    return ['sig', tenantId, runId, req.signalId].join('|');
  }
}

function isStepEventType(t: EventType): boolean {
  return t === 'StepStarted' || t === 'StepCompleted' || t === 'StepFailed';
}
