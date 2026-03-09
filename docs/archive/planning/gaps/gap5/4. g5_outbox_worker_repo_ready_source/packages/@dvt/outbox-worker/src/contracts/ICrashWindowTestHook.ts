export interface ICrashWindowTestHook {
  afterSubscriberSideEffectBeforeAck(recordId: string): Promise<void>;
}

export class NoopCrashWindowTestHook implements ICrashWindowTestHook {
  async afterSubscriberSideEffectBeforeAck(_recordId: string): Promise<void> {
    return;
  }
}
