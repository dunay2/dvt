import type { AuthorizedCommandExecutionContext } from '../ports/auth.js';
import type {
  CancelRunCommand,
  ICancelRunUseCase,
  ISignalRunUseCase,
  SignalRunResult,
} from '../ports/runtime.js';

export class CancelRunUseCase implements ICancelRunUseCase {
  public constructor(private readonly signalRunUseCase: ISignalRunUseCase) {}

  public execute(
    command: CancelRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<SignalRunResult> {
    return this.signalRunUseCase.execute(command, context);
  }
}
