import type { ICrashWindowTestHook } from '../contracts/ICrashWindowTestHook.js';
import type { ClaimedOutboxRecord } from '../types.js';
import { DeliveryOutcomeDecider } from './DeliveryOutcomeDecider.js';
import { DeliveryOutcomeWriter } from './DeliveryOutcomeWriter.js';
import { DeliveryTelemetry } from './DeliveryTelemetry.js';
import { SubscriberInvoker } from './SubscriberInvoker.js';
import { SubscriberResolver } from './SubscriberResolver.js';

export class DeliveryCoordinator {
  constructor(
    private readonly resolver: SubscriberResolver,
    private readonly invoker: SubscriberInvoker,
    private readonly decider: DeliveryOutcomeDecider,
    private readonly writer: DeliveryOutcomeWriter,
    private readonly telemetry: DeliveryTelemetry,
    private readonly crashWindowTestHook: ICrashWindowTestHook
  ) {}

  async execute(record: ClaimedOutboxRecord): Promise<void> {
    const subscriber = this.resolver.resolve(record);
    const result = await this.invoker.invoke(subscriber, record);
    const command = this.decider.decide(record, result);

    this.telemetry.onCommand(record, command);

    if (command.kind === 'ACK_DELIVERED' || command.kind === 'ACK_IGNORED') {
      await this.crashWindowTestHook.afterSubscriberSideEffectBeforeAck(record.recordId);
    }

    await this.writer.write(record, command);
  }
}
