import type { Pool } from 'pg';

export interface RunEventRow {
  seq: number;
  type: string;
  ts: string;
  payload: unknown;
}

export async function fetchRunEventsAfter(
  pool: Pool,
  runId: string,
  afterSeq: number,
  limit: number
): Promise<RunEventRow[]> {
  const res = await pool.query<{ seq: string; type: string; ts: string; payload: unknown }>(
    `SELECT seq::text, type, ts::text, payload
     FROM run_events
     WHERE run_id = $1 AND seq > $2
     ORDER BY seq ASC
     LIMIT $3`,
    [runId, afterSeq, limit]
  );

  return res.rows.map((r) => ({
    seq: Number(r.seq),
    type: r.type,
    ts: new Date(r.ts).toISOString(),
    payload: r.payload,
  }));
}
