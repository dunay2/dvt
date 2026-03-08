import { CrashWindowInjectedError } from '../delivery/CrashWindowInjectedError.js';
import type { ICrashWindowTestHook } from '../contracts/ICrashWindowTestHook.js';

export class CrashAfterSuccessHook implements ICrashWindowTestHook {
  private activated = false;

  async afterSubscriberSideEffectBeforeAck(recordId: string): Promise<void> {
    if (this.activated) {
      return;
    }
    this.activated = true;
    throw new CrashWindowInjectedError(recordId);
  }
}
