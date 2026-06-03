/**
 * Owned concern: define the application-facing execution port for start-run
 * use cases inside `apps/api`.
 */
import type { StartRunCommand, StartRunResult } from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from './authContract.js';
import type { StartRunEngineError } from './startRunEngineError.js';

export type Result<TValue, TError> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };

export type StartRunUseCaseResult = Result<StartRunResult, StartRunEngineError>;

export interface IStartRunUseCase {
  execute(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunUseCaseResult>;
}
