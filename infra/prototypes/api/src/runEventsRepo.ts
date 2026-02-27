import type { PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import type { NodeStatus, NodeStatusEventV1 } from './contracts.js';

export interface AppendNodeStatusInput {
  runId: string;
  nodeId: string;
  status: NodeStatus;
  attempt: number;
  errorMessage?: string;
  ts?: string;
}

async function ensureRunTx(client: PoolClient, runId: string): Promise<void> {
  await client.query('INSERT INTO runs (run_id) VALUES ($1) ON CONFLICT DO NOTHING', [runId]);
}

async function nextSeqTx(client: PoolClient, runId: string): Promise<number> {
  const res = await client.query<{ seq: string }>(
    `INSERT INTO run_seq (run_id, next_seq)
     VALUES ($1, 2)
     ON CONFLICT (run_id)
     DO UPDATE SET next_seq = run_seq.next_seq + 1
     RETURNING (run_seq.next_seq - 1) AS seq`,
    [runId]
  );

  const seqStr = res.rows[0]?.seq;
  if (!seqStr) throw new Error('failed to allocate seq');
  const seq = Number(seqStr);
  if (!Number.isFinite(seq)) throw new Error('invalid seq');
  return seq;
}

export async function appendNodeStatusTx(
  client: PoolClient,
  input: AppendNodeStatusInput
): Promise<NodeStatusEventV1> {
  await ensureRunTx(client, input.runId);
  const seq = await nextSeqTx(client, input.runId);
  const eventId = randomUUID();
  const ts = input.ts ?? new Date().toISOString();

  const evt: NodeStatusEventV1 = {
    eventId,
    runId: input.runId,
    seq,
    type: 'node.status',
    ts,
    payload: {
      nodeId: input.nodeId,
      status: input.status,
      attempt: input.attempt,
      ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
    },
  };

  await client.query(
    `INSERT INTO run_events (run_id, seq, event_id, type, ts, payload)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [evt.runId, evt.seq, evt.eventId, evt.type, evt.ts, evt.payload]
  );

  await client.query(
    `INSERT INTO run_node_state (run_id, node_id, status, attempt, updated_at, error_message)
     VALUES ($1, $2, $3, $4, now(), $5)
     ON CONFLICT (run_id, node_id)
     DO UPDATE SET status = EXCLUDED.status,
                   attempt = EXCLUDED.attempt,
                   updated_at = now(),
                   error_message = EXCLUDED.error_message`,
    [
      evt.runId,
      evt.payload.nodeId,
      evt.payload.status,
      evt.payload.attempt,
      evt.payload.errorMessage ?? null,
    ]
  );

  await client.query(
    `INSERT INTO outbox (event_id, run_id, seq, type, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [evt.eventId, evt.runId, evt.seq, evt.type, evt]
  );

  return evt;
}
