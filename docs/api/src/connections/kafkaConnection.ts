import { createRequire } from 'node:module';
import type { AppConfig } from '../config.js';

const require = createRequire(import.meta.url);

type KafkaJsModule = {
  KafkaJS: {
    Kafka: new () => {
      producer: (cfg: Record<string, unknown>) => {
        connect: () => Promise<void>;
        disconnect: () => Promise<void>;
        send: (args: {
          topic: string;
          messages: Array<{ key?: string; value: string }>;
        }) => Promise<unknown>;
      };
      consumer: (cfg: Record<string, unknown>) => {
        connect: () => Promise<void>;
        disconnect: () => Promise<void>;
        subscribe: (args: { topics: string[] }) => Promise<void>;
        run: (args: {
          eachMessage: (args: { message: { value: Buffer } }) => Promise<void>;
        }) => Promise<void>;
      };
    };
  };
};

export interface KafkaProducerPort {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(topic: string, key: string, value: string): Promise<void>;
}

export interface KafkaConsumerPort {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(topics: string[]): Promise<void>;
  runEachMessage(onValue: (value: string) => Promise<void>): Promise<void>;
}

export class KafkaConnection {
  private producer: KafkaProducerPort | null = null;
  private consumer: KafkaConsumerPort | null = null;

  constructor(private readonly cfg: AppConfig['kafka']) {}

  getProducer(): KafkaProducerPort {
    if (!this.producer) throw new Error('Kafka producer not started');
    return this.producer;
  }

  getConsumer(): KafkaConsumerPort {
    if (!this.consumer) throw new Error('Kafka consumer not started');
    return this.consumer;
  }

  async startProducer(): Promise<void> {
    if (this.producer) return;

    const mod = require('@confluentinc/kafka-javascript') as KafkaJsModule;
    const KafkaCtor = mod.KafkaJS.Kafka;
    const kafka = new KafkaCtor();
    const p = kafka.producer({
      'bootstrap.servers': this.cfg.bootstrapServers,
      'client.id': this.cfg.clientId,
    });

    this.producer = {
      connect: async () => p.connect(),
      disconnect: async () => p.disconnect(),
      send: async (topic, key, value) => {
        await p.send({ topic, messages: [{ key, value }] });
      },
    };

    await this.producer.connect();
  }

  async startConsumer(): Promise<void> {
    if (this.consumer) return;

    const mod = require('@confluentinc/kafka-javascript') as KafkaJsModule;
    const KafkaCtor = mod.KafkaJS.Kafka;
    const kafka = new KafkaCtor();
    const c = kafka.consumer({
      'bootstrap.servers': this.cfg.bootstrapServers,
      'group.id': this.cfg.groupId,
      'client.id': this.cfg.clientId,
    });

    this.consumer = {
      connect: async () => c.connect(),
      disconnect: async () => c.disconnect(),
      subscribe: async (topics) => c.subscribe({ topics }),
      runEachMessage: async (onValue) => {
        await c.run({
          eachMessage: async ({ message }) => {
            await onValue(message.value.toString('utf-8'));
          },
        });
      },
    };

    await this.consumer.connect();
  }

  async stop(): Promise<void> {
    const tasks: Array<Promise<void>> = [];
    if (this.producer) tasks.push(this.producer.disconnect());
    if (this.consumer) tasks.push(this.consumer.disconnect());
    await Promise.allSettled(tasks);
    this.producer = null;
    this.consumer = null;
  }
}
