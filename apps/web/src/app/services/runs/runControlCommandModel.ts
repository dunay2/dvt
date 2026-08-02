import type { CancelRunReceipt, RecoverRunReceipt } from '../../ports/runs';

export type RunControlCommandAction = 'cancel' | 'recover';

export type RunControlCommandRequest = Readonly<{
  action: RunControlCommandAction;
  runId: string;
}>;

export type RunControlCommandOutcome =
  | Readonly<{
      action: 'cancel';
      runId: string;
      receipt: CancelRunReceipt;
    }>
  | Readonly<{
      action: 'recover';
      runId: string;
      receipt: RecoverRunReceipt;
    }>;

export type RunControlCommandFailure = Readonly<{
  action: RunControlCommandAction;
  runId: string;
  error: Error;
}>;
