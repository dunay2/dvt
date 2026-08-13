/** Canonical serialized vocabulary for the public run-control rail. */
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
