/**
 * Owned concern: provide the explicit failure-mode placeholder for start-run
 * use case wiring when no real implementation is bound.
 */
import type { StartRunCommand } from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCasePort.js';

const NOT_IMPLEMENTED_ERROR_MESSAGE = 'StartRun use case is not yet implemented';
export class NotImplementedStartRunUseCase implements IStartRunUseCase {
  public async execute(
    _command: StartRunCommand,
    _context: AuthorizedCommandExecutionContext
  ): Promise<StartRunUseCaseResult> {
    throw new Error(NOT_IMPLEMENTED_ERROR_MESSAGE);
  }
}
