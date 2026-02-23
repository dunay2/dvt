import type { Pool } from 'pg';
import type { KafkaProducerPort } from './connections/kafkaConnection.js';
import type { NodeStatusEventV1 } from './contracts.js';

interface OutboxRow {
  event_id: string;
  payload: NodeStatusEventV1;
}

export class OutboxPublisher {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly pool: Pool,
    private readonly producer: KafkaProducerPort,
    private readonly topic: string,
    private readonly pollIntervalMs: number,
    private readonly batchSize: number
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), this.pollIntervalMs);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query<OutboxRow>(
        `SELECT event_id, payload
         FROM outbox
         WHERE published_at IS NULL
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [this.batchSize]
      );

      for (const row of res.rows) {
        try {
          await this.producer.send(this.topic, row.payload.runId, JSON.stringify(row.payload));
          await client.query(
            `UPDATE outbox
             SET published_at = now(),
                 publish_attempts = publish_attempts + 1,
                 last_error = NULL
             WHERE event_id = $1`,
            [row.event_id]
          );
        } catch (err) {
          await client.query(
            `UPDATE outbox
             SET publish_attempts = publish_attempts + 1,
                 last_error = $2
             WHERE event_id = $1`,
            [row.event_id, String(err)]
          );
          break;
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {}
      throw err;
    } finally {
      client.release();
      this.running = false;
    }
  }
}
