/**
 * @file packages/@dvt/engine/src/contracts/intentErrors.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Intent store errors follow the DvtError hierarchy with stable codes
 * @consequence Callers can match on error.code for programmatic recovery
 * @version 1.0.0
 * @date 2026-03-03
 */
import { DvtError } from './errors.js';

export class IntentNotFoundError extends DvtError {
  constructor(intentId: string) {
    super('INTENT_NOT_FOUND', `Start-run intent not found: ${intentId}`);
    this.name = 'IntentNotFoundError';
  }
}

export class IntentInvalidTransitionError extends DvtError {
  constructor(intentId: string, from: string, to: string) {
    super(
      'INTENT_INVALID_TRANSITION',
      `Cannot transition intent ${intentId} from ${from} to ${to}`,
      undefined,
      { details: { intentId, from, to } }
    );
    this.name = 'IntentInvalidTransitionError';
  }
}
