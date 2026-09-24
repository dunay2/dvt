/** Cancel one consumer without cancelling shared work needed by another consumer. */
export function awaitAnalysis<T>(work: Promise<T>, signal: globalThis.AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const cancel = (): void => reject(signal.reason);
    const cleanup = (): void => signal.removeEventListener('abort', cancel);
    signal.addEventListener('abort', cancel, { once: true });
    void work.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      }
    );
    if (signal.aborted) cancel();
  });
}
