export interface IWakeupSignal {
  waitForWakeupOrTimeout(timeoutMs: number, signal: AbortSignal): Promise<'wakeup' | 'timeout'>;
}

export class TimerWakeupSignal implements IWakeupSignal {
  async waitForWakeupOrTimeout(
    timeoutMs: number,
    signal: AbortSignal
  ): Promise<'wakeup' | 'timeout'> {
    return new Promise<'timeout'>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        resolve('timeout');
      }, timeoutMs);

      const onAbort = (): void => {
        cleanup();
        reject(new Error('aborted'));
      };

      const cleanup = (): void => {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
      };

      signal.addEventListener('abort', onAbort, { once: true });
    });
  }
}
