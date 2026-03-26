import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type { StartRunCommand } from '../ports/startRunCommandContract.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCaseContract.js';

const NOT_IMPLEMENTED_ERROR_MESSAGE = 'StartRun use case is not yet implemented';

/**
 * Placeholder until the engine-backed StartRun use case is wired.
 * Returns a rejected promise so callers surface a clear 500 rather than
 * silently accepting the request.
 */
export class NotImplementedStartRunUseCase implements IStartRunUseCase {
  public async execute(
    _command: StartRunCommand,
    _context: AuthorizedCommandExecutionContext
  ): Promise<StartRunUseCaseResult> {
    throw new Error(NOT_IMPLEMENTED_ERROR_MESSAGE);
  }
}
