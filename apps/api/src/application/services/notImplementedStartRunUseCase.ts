import type {
  AuthorizedCommandExecutionContext,
  IStartRunUseCase,
  StartRunCommand,
  StartRunResult,
} from '../ports/auth.js';

/**
 * Placeholder until the engine-backed StartRun use case is wired.
 * Returns a rejected promise so callers surface a clear 500 rather than
 * silently accepting the request.
 */
export class NotImplementedStartRunUseCase implements IStartRunUseCase {
  public async execute(
    _command: StartRunCommand,
    _context: AuthorizedCommandExecutionContext
  ): Promise<StartRunResult> {
    throw new Error('StartRun use case is not yet implemented');
  }
}
