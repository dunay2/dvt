export interface TemporalAdapterConfig {
  address: string;
  namespace: string;
  taskQueue: string;
  identity?: string;
  connectTimeoutMs: number;
  requestTimeoutMs: number;
}

const DEFAULTS: TemporalAdapterConfig = {
  address: '127.0.0.1:7233',
  namespace: 'default',
  taskQueue: 'dvt-temporal',
  connectTimeoutMs: 5000,
  requestTimeoutMs: 10000,
};

export function loadTemporalAdapterConfig(
  env: Record<string, string | undefined>
): TemporalAdapterConfig {
  const cfg: TemporalAdapterConfig = {
    address: toRequiredTrimmed(env.TEMPORAL_ADDRESS, DEFAULTS.address),
    namespace: toRequiredTrimmed(env.TEMPORAL_NAMESPACE, DEFAULTS.namespace),
    taskQueue: toRequiredTrimmed(env.TEMPORAL_TASK_QUEUE, DEFAULTS.taskQueue),
    identity: toOptionalTrimmed(env.TEMPORAL_IDENTITY),
    connectTimeoutMs: parsePositiveInt(env.TEMPORAL_CONNECT_TIMEOUT_MS, DEFAULTS.connectTimeoutMs),
    requestTimeoutMs: parsePositiveInt(env.TEMPORAL_REQUEST_TIMEOUT_MS, DEFAULTS.requestTimeoutMs),
  };

  validateTemporalAdapterConfig(cfg);
  return cfg;
}

export function validateTemporalAdapterConfig(cfg: TemporalAdapterConfig): void {
  if (!cfg.address.trim()) throw new Error('TEMPORAL_CONFIG_INVALID: address is required');
  if (!cfg.namespace.trim()) throw new Error('TEMPORAL_CONFIG_INVALID: namespace is required');
  if (!cfg.taskQueue.trim()) throw new Error('TEMPORAL_CONFIG_INVALID: taskQueue is required');
  if (cfg.identity !== undefined && !cfg.identity.trim()) {
    throw new Error('TEMPORAL_CONFIG_INVALID: identity must be non-empty when provided');
  }
  if (!Number.isInteger(cfg.connectTimeoutMs) || cfg.connectTimeoutMs <= 0) {
    throw new Error('TEMPORAL_CONFIG_INVALID: connectTimeoutMs must be a positive integer');
  }
  if (!Number.isInteger(cfg.requestTimeoutMs) || cfg.requestTimeoutMs <= 0) {
    throw new Error('TEMPORAL_CONFIG_INVALID: requestTimeoutMs must be a positive integer');
  }
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function toOptionalTrimmed(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  return value.length > 0 ? value : undefined;
}

function toRequiredTrimmed(raw: string | undefined, fallback: string): string {
  const value = raw?.trim();
  if (value && value.length > 0) return value;
  return fallback;
}
