import { config } from './config.js';
import { PgConnection } from './connections/pgConnection.js';
import { KafkaConnection } from './connections/kafkaConnection.js';
import { RunStreamHub } from './runStreamHub.js';
import { OutboxPublisher } from './outboxPublisher.js';
import { KafkaTail } from './kafkaTail.js';

export interface Wiring {
  pg: PgConnection;
  kafka: KafkaConnection;
  hub: RunStreamHub;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createWiring(): Wiring {
  const pg = new PgConnection(config.pg);
  const kafka = new KafkaConnection(config.kafka);
  const hub = new RunStreamHub();
  let outboxPublisher: OutboxPublisher | null = null;

  return {
    pg,
    kafka,
    hub,
    async start(): Promise<void> {
      await pg.start();
      await kafka.startProducer();
      await kafka.startConsumer();

      outboxPublisher = new OutboxPublisher(
        pg.getPool(),
        kafka.getProducer(),
        config.kafka.topic,
        config.outbox.pollIntervalMs,
        config.outbox.batchSize
      );
      outboxPublisher.start();

      const tail = new KafkaTail(kafka.getConsumer(), hub, [config.kafka.topic]);
      await tail.start();
    },
    async stop(): Promise<void> {
      if (outboxPublisher) outboxPublisher.stop();
      await kafka.stop();
      await pg.stop();
      outboxPublisher = null;
    },
  };
}
