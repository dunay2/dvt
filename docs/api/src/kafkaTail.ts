import type { KafkaConsumerPort } from './connections/kafkaConnection.js';
import type { RunStreamHub } from './runStreamHub.js';
import type { NodeStatusEventV1 } from './contracts.js';

export class KafkaTail {
  constructor(
    private readonly consumer: KafkaConsumerPort,
    private readonly hub: RunStreamHub,
    private readonly topics: string[]
  ) {}

  async start(): Promise<void> {
    await this.consumer.subscribe(this.topics);
    await this.consumer.runEachMessage(async (value: string) => {
      const evt = JSON.parse(value) as NodeStatusEventV1;
      this.hub.publish(evt);
    });
  }
}
