/**
 * @file packages/@dvt/contracts/src/contracts/engine/RunControlBoundary.v1.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0006: Contract Tooling Governance
 * @baseline ADR-0007: Run Cancellation Semantics and Event Ownership
 * @baseline ADR-0040: Retry Ownership and Attempt Authority
 * @baseline ADR-0049: RETRY_RUN is a separate recovery use case
 * @decision Publish one run-control boundary without exposing adapter-owned lifecycle authority
 * @consequence API and web consumers share vocabulary while the engine owns behavior
 * @version 1.0.0
 * @date 2026-08-13
 */
import type { SignalType } from '../../types/contracts.js';

export const RUN_CONTROL_CONTRACT_VERSION = 'v1' as const;

export const SUPPORTED_RUN_SIGNAL_TYPES = [
  'PAUSE',
  'RESUME',
] as const satisfies readonly SignalType[];

export type SupportedRunSignalType = (typeof SUPPORTED_RUN_SIGNAL_TYPES)[number];

export interface SignalRunCommand {
  readonly runId: string;
  readonly signalType: SupportedRunSignalType;
  readonly reason?: string;
}

export interface SignalRunResult {
  readonly runId: string;
  readonly signalType: SupportedRunSignalType;
  readonly accepted: boolean;
}

export interface CancelRunCommand {
  readonly runId: string;
  readonly signalType: 'CANCEL';
}

export type CancelRunDisposition = 'requested' | 'already_requested' | 'already_cancelled';

export interface CancelRunReceipt {
  readonly contractVersion: typeof RUN_CONTROL_CONTRACT_VERSION;
  readonly runId: string;
  readonly signalType: 'CANCEL';
  readonly accepted: boolean;
  readonly disposition: CancelRunDisposition;
}

export interface RecoverRunRequest {
  readonly sourceRunId: string;
  readonly recoveryRunId: string;
}

export interface RecoverRunReceipt {
  readonly contractVersion: typeof RUN_CONTROL_CONTRACT_VERSION;
  readonly sourceRunId: string;
  readonly recoveryRunId: string;
  readonly accepted: boolean;
}

export type RunControlUnavailableReason =
  | 'cancellation_pending'
  | 'dispatch_pending'
  | 'run_active'
  | 'run_cancelled'
  | 'run_completed'
  | 'run_terminal'
  | 'recovery_evidence_unknown'
  | 'source_adapter_unavailable'
  | 'source_plan_unavailable'
  | 'source_context_untrusted';

export type RunControlActionAvailability =
  | Readonly<{ available: true }>
  | Readonly<{ available: false; reason: RunControlUnavailableReason }>;

export interface RunControlAvailability {
  readonly cancel: RunControlActionAvailability;
  readonly recover: RunControlActionAvailability;
}

export function parseSignalRunCommand(input: unknown): SignalRunCommand {
  const record = requireRecord(input, ['runId', 'signalType', 'reason']);
  const signalType = record['signalType'];
  if (!isSupportedRunSignalType(signalType)) throw invalidRunControlPayload();
  const reason = record['reason'];
  if (reason !== undefined && typeof reason !== 'string') throw invalidRunControlPayload();
  return {
    runId: requireNonBlankString(record['runId']),
    signalType,
    ...(reason === undefined ? {} : { reason }),
  };
}

export function parseCancelRunCommand(input: unknown): CancelRunCommand {
  const record = requireRecord(input, ['runId', 'signalType']);
  if (record['signalType'] !== 'CANCEL') throw invalidRunControlPayload();
  return {
    runId: requireNonBlankString(record['runId']),
    signalType: 'CANCEL',
  };
}

export function parseRecoverRunRequest(input: unknown): RecoverRunRequest {
  const record = requireRecord(input, ['sourceRunId', 'recoveryRunId']);
  const sourceRunId = requireNonBlankString(record['sourceRunId']);
  const recoveryRunId = requireNonBlankString(record['recoveryRunId']);
  if (sourceRunId === recoveryRunId) throw invalidRunControlPayload();
  return { sourceRunId, recoveryRunId };
}

export function parseCancelRunReceipt(input: unknown): CancelRunReceipt {
  return parseRunControlResponse(() => {
    const record = requireRecord(input, [
      'contractVersion',
      'runId',
      'signalType',
      'accepted',
      'disposition',
    ]);
    if (
      record['contractVersion'] !== RUN_CONTROL_CONTRACT_VERSION ||
      record['signalType'] !== 'CANCEL' ||
      record['accepted'] !== true ||
      !isCancelRunDisposition(record['disposition'])
    ) {
      throw invalidRunControlPayload();
    }
    return {
      contractVersion: RUN_CONTROL_CONTRACT_VERSION,
      runId: requireNonBlankString(record['runId']),
      signalType: 'CANCEL',
      accepted: true,
      disposition: record['disposition'],
    };
  });
}

export function parseRecoverRunReceipt(input: unknown): RecoverRunReceipt {
  return parseRunControlResponse(() => {
    const record = requireRecord(input, [
      'contractVersion',
      'sourceRunId',
      'recoveryRunId',
      'accepted',
    ]);
    if (record['contractVersion'] !== RUN_CONTROL_CONTRACT_VERSION || record['accepted'] !== true) {
      throw invalidRunControlPayload();
    }
    const request = parseRecoverRunRequest({
      sourceRunId: record['sourceRunId'],
      recoveryRunId: record['recoveryRunId'],
    });
    return {
      contractVersion: RUN_CONTROL_CONTRACT_VERSION,
      ...request,
      accepted: true,
    };
  });
}

function isSupportedRunSignalType(value: unknown): value is SupportedRunSignalType {
  return (
    typeof value === 'string' && (SUPPORTED_RUN_SIGNAL_TYPES as readonly string[]).includes(value)
  );
}

function isCancelRunDisposition(value: unknown): value is CancelRunDisposition {
  return value === 'requested' || value === 'already_requested' || value === 'already_cancelled';
}

function requireRecord(input: unknown, allowedFields: readonly string[]): Record<string, unknown> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw invalidRunControlPayload();
  }
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((field) => !allowedFields.includes(field))) {
    throw invalidRunControlPayload();
  }
  return record;
}

function requireNonBlankString(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalidRunControlPayload();
  }
  return value;
}

function invalidRunControlPayload(): Error {
  return new Error('INVALID_RUN_CONTROL_PAYLOAD');
}

function parseRunControlResponse<T>(parser: () => T): T {
  try {
    return parser();
  } catch {
    throw new Error('RUN_CONTROL_RESPONSE_INVALID');
  }
}
