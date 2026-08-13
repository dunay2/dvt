/** Owned concern: decode versioned backend-owned run-control command receipts. */
import type { CancelRunReceipt, RecoverRunReceipt } from '../../ports/runs';

const CANCEL_DISPOSITIONS = new Set<CancelRunReceipt['disposition']>([
  'requested',
  'already_requested',
  'already_cancelled',
]);

export function parseCancelRunReceipt(input: unknown): CancelRunReceipt {
  if (!input || typeof input !== 'object') throw invalidReceipt();
  const candidate = input as Record<string, unknown>;
  if (
    candidate.contractVersion !== 'v1' ||
    !isNonBlankString(candidate.runId) ||
    candidate.signalType !== 'CANCEL' ||
    typeof candidate.accepted !== 'boolean' ||
    typeof candidate.disposition !== 'string' ||
    !CANCEL_DISPOSITIONS.has(candidate.disposition as CancelRunReceipt['disposition'])
  ) {
    throw invalidReceipt();
  }
  return {
    contractVersion: 'v1',
    runId: candidate.runId as string,
    signalType: 'CANCEL',
    accepted: candidate.accepted as boolean,
    disposition: candidate.disposition as CancelRunReceipt['disposition'],
  };
}

export function parseRecoverRunReceipt(input: unknown): RecoverRunReceipt {
  if (!input || typeof input !== 'object') throw invalidReceipt();
  const candidate = input as Record<string, unknown>;
  if (
    candidate.contractVersion !== 'v1' ||
    !isNonBlankString(candidate.sourceRunId) ||
    !isNonBlankString(candidate.recoveryRunId) ||
    typeof candidate.accepted !== 'boolean'
  ) {
    throw invalidReceipt();
  }
  return {
    contractVersion: 'v1',
    sourceRunId: candidate.sourceRunId as string,
    recoveryRunId: candidate.recoveryRunId as string,
    accepted: candidate.accepted as boolean,
  };
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function invalidReceipt(): Error {
  return new Error('RUN_CONTROL_RESPONSE_INVALID');
}
