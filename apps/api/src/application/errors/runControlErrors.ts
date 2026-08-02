/** Owned concern: publish typed API application failures for unavailable run controls. */
import type { CanonicalRunStatus } from '@dvt/contracts';

import type { RunControlUnavailableReason } from '../ports/runtime.js';

export class RunControlUnavailableError extends Error {
  public readonly name = 'RunControlUnavailableError';

  public constructor(
    public readonly action: 'cancel' | 'recover',
    public readonly status: CanonicalRunStatus['status'],
    public readonly reason: RunControlUnavailableReason
  ) {
    super(`Run ${action} is unavailable for ${status}: ${reason}`);
  }
}

export type RunRecoveryUnavailableReason =
  'recovery_identity_conflict' | 'source_plan_unavailable' | 'source_context_untrusted';

export class RunRecoveryUnavailableError extends Error {
  public readonly name = 'RunRecoveryUnavailableError';

  public constructor(
    public readonly sourceRunId: string,
    public readonly reason: RunRecoveryUnavailableReason
  ) {
    super(`Run recovery is unavailable for ${sourceRunId}: ${reason}`);
  }
}
