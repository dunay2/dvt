/**
 * @file packages/@dvt/run-domain/src/errors.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Domain-level error for invalid state transitions in run projection.
 * @consequence Projection consumers share one stable error code and details shape.
 * @version 1.0.0
 * @date 2026-03-15
 */

export class InvalidStateTransitionError extends Error {
  readonly code = 'INVALID_STATE_TRANSITION' as const;
  readonly details: Record<string, unknown>;
  readonly runId: string;

  constructor(params: { runId: string; fromStatus: string; eventType: string; stepId?: string }) {
    const { runId, fromStatus, eventType, stepId } = params;
    const subject = stepId === undefined ? 'run' : `step ${stepId}`;
    super(`Cannot apply ${eventType} to ${subject} from status ${fromStatus}: runId=${runId}`);
    this.name = 'InvalidStateTransitionError';
    this.runId = runId;
    this.details = {
      fromStatus,
      eventType,
      ...(stepId === undefined ? {} : { stepId }),
    };
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
