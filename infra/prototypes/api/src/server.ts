import Fastify from 'fastify';
import { config } from './config.js';
import { sseHeaders, sseSend } from './sse.js';
import { fetchRunEventsAfter } from './catchup.js';
import { appendNodeStatusTx } from './runEventsRepo.js';
import type { NodeStatus } from './contracts.js';
import { createWiring } from './wiring.js';

const app = Fastify({ logger: true });
const wiring = createWiring();

app.get('/health', async () => ({ ok: true }));

app.post('/runs', async () => {
  const runId = `r_${Date.now()}`;
  await wiring.pg
    .getPool()
    .query('INSERT INTO runs (run_id) VALUES ($1) ON CONFLICT DO NOTHING', [runId]);
  return { runId };
});

app.post('/runs/:runId/node-status', async (req) => {
  const { runId } = req.params as { runId: string };
  const body = req.body as Partial<{
    nodeId: string;
    status: NodeStatus;
    attempt: number;
    errorMessage?: string;
  }>;

  const nodeId = body.nodeId ?? 'model.alpha';
  const status = body.status ?? 'RUNNING';
  const attempt = body.attempt ?? 1;

  const evt = await wiring.pg.withTx((client) =>
    appendNodeStatusTx(client, { runId, nodeId, status, attempt, errorMessage: body.errorMessage })
  );

  return { ok: true, event: evt };
});

app.get('/runs/:runId/node-state', async (req) => {
  const { runId } = req.params as { runId: string };
  const res = await wiring.pg
    .getPool()
    .query(
      'SELECT node_id, status, attempt, updated_at, error_message FROM run_node_state WHERE run_id = $1 ORDER BY node_id ASC',
      [runId]
    );
  return { runId, nodes: res.rows };
});

app.get('/runs/:runId/stream', async (req, reply) => {
  const { runId } = req.params as { runId: string };
  sseHeaders(reply);

  const lastId = req.headers['last-event-id'];
  const afterSeq = typeof lastId === 'string' ? Number(lastId) : 0;
  const safeAfterSeq = Number.isFinite(afterSeq) && afterSeq >= 0 ? afterSeq : 0;

  const catchup = await fetchRunEventsAfter(
    wiring.pg.getPool(),
    runId,
    safeAfterSeq,
    config.sse.catchupLimit
  );
  for (const e of catchup) {
    sseSend(reply, {
      id: String(e.seq),
      event: e.type,
      data: { runId, seq: e.seq, ts: e.ts, payload: e.payload },
    });
  }

  let lastSentSeq = catchup.length > 0 ? catchup[catchup.length - 1]!.seq : safeAfterSeq;

  const unsub = wiring.hub.subscribe(runId, (evt) => {
    if (evt.seq <= lastSentSeq) return;
    lastSentSeq = evt.seq;
    sseSend(reply, { id: String(evt.seq), event: evt.type, data: evt });
  });

  const heartbeat = setInterval(() => {
    sseSend(reply, { event: 'heartbeat', data: { runId, ts: new Date().toISOString() } });
  }, config.sse.heartbeatMs);

  req.raw.on('close', () => {
    clearInterval(heartbeat);
    unsub();
  });

  return reply;
});

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

let shuttingDown = false;
async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await wiring.stop();
  } finally {
    process.exit(0);
  }
}

app
  .listen({ port: config.port, host: '0.0.0.0' })
  .then(async () => {
    app.log.info({ port: config.port }, 'listening');
    await wiring.start();
  })
  .catch((err: unknown) => {
    app.log.error(err);
    process.exit(1);
  });
