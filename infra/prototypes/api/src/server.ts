import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify';
import { config } from './config.js';
import { sseHeaders, sseSend } from './sse.js';
import { fetchRunEventsAfter } from './catchup.js';
import { appendNodeStatusTx } from './runEventsRepo.js';
import type { NodeStatus } from './contracts.js';
import { createWiring } from './wiring.js';

// ========================================
// Type Definitions
// ========================================

interface NodeState {
  node_id: string;
  status: NodeStatus;
  attempt: number;
  updated_at: string;
  error_message?: string;
}

interface NodeStatusRequestBody {
  nodeId?: string;
  status?: NodeStatus;
  attempt?: number;
  errorMessage?: string;
}

interface RunIdParams {
  runId: string;
}

interface NodeStateResponse {
  runId: string;
  nodes: NodeState[];
}

interface NodeStatusResponse {
  ok: boolean;
  event: unknown;
}

// ========================================
// Application Setup
// ========================================

const app = Fastify({ logger: true });
const wiring = createWiring();

// ========================================
// Health Check
// ========================================

app.get('/health', async () => ({ ok: true }));

// ========================================
// Run Management
// ========================================

app.post<{ Reply: { runId: string } }>('/runs', async () => {
  const runId = `r_${Date.now()}`;
  await wiring.pg
    .getPool()
    .query('INSERT INTO runs (run_id) VALUES ($1) ON CONFLICT DO NOTHING', [runId]);
  return { runId };
});

// ========================================
// Node Status Management
// ========================================

app.post<{
  Body: NodeStatusRequestBody;
  Params: RunIdParams;
  Reply: NodeStatusResponse;
}>(
  '/runs/:runId/node-status',
  async (
    req: FastifyRequest<{
      Body: NodeStatusRequestBody;
      Params: RunIdParams;
    }>
  ): Promise<NodeStatusResponse> => {
    const { runId } = req.params;
    const body = req.body;

    const nodeId = body.nodeId ?? 'model.alpha';
    const status = body.status ?? 'RUNNING';
    const attempt = body.attempt ?? 1;
    const errorMessage = body.errorMessage;

    const evt = await wiring.pg.withTx((client) =>
      appendNodeStatusTx(client, {
        runId,
        nodeId,
        status,
        attempt,
        ...(errorMessage && { errorMessage }),
      })
    );

    return { ok: true, event: evt };
  }
);

// ========================================
// Node State Query
// ========================================

app.get<{
  Params: RunIdParams;
  Reply: NodeStateResponse;
}>(
  '/runs/:runId/node-state',
  async (req: FastifyRequest<{ Params: RunIdParams }>): Promise<NodeStateResponse> => {
    const { runId } = req.params;
    const res = await wiring.pg
      .getPool()
      .query(
        'SELECT node_id, status, attempt, updated_at, error_message FROM run_node_state WHERE run_id = $1 ORDER BY node_id ASC',
        [runId]
      );
    return { runId, nodes: res.rows };
  }
);

// ========================================
// Server-Sent Events Stream
// ========================================

app.get<{ Params: RunIdParams }>(
  '/runs/:runId/stream',
  async (req: FastifyRequest<{ Params: RunIdParams }>, reply: FastifyReply) => {
    const { runId } = req.params;
    sseHeaders(reply);

    // Parse last event ID for catchup
    const lastId = req.headers['last-event-id'];
    const afterSeq = typeof lastId === 'string' ? Number(lastId) : 0;
    const safeAfterSeq = Number.isFinite(afterSeq) && afterSeq >= 0 ? afterSeq : 0;

    // Send catchup events
    const catchup = await fetchRunEventsAfter(
      wiring.pg.getPool(),
      runId,
      safeAfterSeq,
      config.sse.catchupLimit
    );

    for (const event of catchup) {
      sseSend(reply, {
        id: String(event.seq),
        event: event.type,
        data: { runId, seq: event.seq, ts: event.ts, payload: event.payload },
      });
    }

    // Track last sent sequence
    const lastCatchupEvent = catchup.at(-1);
    let lastSentSeq = lastCatchupEvent ? lastCatchupEvent.seq : safeAfterSeq;

    // Subscribe to live updates
    const unsub = wiring.hub.subscribe(runId, (evt) => {
      if (evt.seq <= lastSentSeq) return;
      lastSentSeq = evt.seq;
      sseSend(reply, { id: String(evt.seq), event: evt.type, data: evt });
    });

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      sseSend(reply, {
        event: 'heartbeat',
        data: { runId, ts: new Date().toISOString() },
      });
    }, config.sse.heartbeatMs);

    // Cleanup on disconnect
    req.raw.on('close', () => {
      clearInterval(heartbeat);
      unsub();
    });

    return reply;
  }
);

// ========================================
// Graceful Shutdown
// ========================================

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

// ========================================
// Application Startup
// ========================================

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info({ port: config.port }, 'listening');
  await wiring.start();
} catch (err: unknown) {
  app.log.error(err);
  process.exit(1);
}
