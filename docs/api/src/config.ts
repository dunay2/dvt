export interface AppConfig {
  port: number;
  pg: { host: string; port: number; user: string; password: string; database: string };
  kafka: { bootstrapServers: string; topic: string; groupId: string; clientId: string };
  outbox: { pollIntervalMs: number; batchSize: number };
  sse: { heartbeatMs: number; catchupLimit: number };
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const v = Number(raw);
  return Number.isFinite(v) ? v : fallback;
}

export const config: AppConfig = {
  port: envInt('PORT', 3000),
  pg: {
    host: process.env.PG_HOST ?? 'localhost',
    port: envInt('PG_PORT', 5432),
    user: process.env.PG_USER ?? 'dvt',
    password: process.env.PG_PASSWORD ?? 'dvt',
    database: process.env.PG_DB ?? 'dvt',
  },
  kafka: {
    bootstrapServers: process.env.KAFKA_BOOTSTRAP ?? 'localhost:9092',
    topic: process.env.KAFKA_TOPIC ?? 'run-events.v1',
    groupId: process.env.KAFKA_GROUP_ID ?? 'ui-stream-gw.v1',
    clientId: process.env.KAFKA_CLIENT_ID ?? 'dvt-api-full-mvp',
  },
  outbox: {
    pollIntervalMs: envInt('OUTBOX_POLL_MS', 500),
    batchSize: envInt('OUTBOX_BATCH', 100),
  },
  sse: {
    heartbeatMs: envInt('SSE_HEARTBEAT_MS', 15_000),
    catchupLimit: envInt('SSE_CATCHUP_LIMIT', 10_000),
  },
};
