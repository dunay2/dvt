import type { AuthorizedCommandExecutionContext } from './authContract.js';
import type { StartRunCommand } from './startRunCommandContract.js';
import type { StartRunEngineError } from './startRunEngineErrorContract.js';
import type { StartRunResult } from './startRunResultContract.js';

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
