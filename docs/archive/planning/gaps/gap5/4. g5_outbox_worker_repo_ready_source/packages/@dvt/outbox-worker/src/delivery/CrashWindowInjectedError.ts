export class CrashWindowInjectedError extends Error {
  constructor(public readonly recordId: string) {
    super(`crash window injected for outbox record ${recordId}`);
    this.name = 'CrashWindowInjectedError';
  }
}
