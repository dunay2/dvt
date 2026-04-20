import type { OutboxRecord } from '@dvt/contracts';

export function toRecordLog(record: OutboxRecord): Record<string, unknown> {
  return {
    outboxId: record.id,
    runId: record.payload.runId,
    runSeq: record.payload.runSeq,
    eventType: record.payload.eventType,
    attempts: record.attempts,
    createdAt: record.createdAt,
  };
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error === null) {
    return 'null';
  }
  if (typeof error === 'object') {
    return stringifyObjectError(error);
  }

  return stringifyScalarError(error);
}

export function resolveLagSeconds(createdAt: string, nowMs: number): number {
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) {
    return 0;
  }

  return Math.max(0, (nowMs - createdAtMs) / 1000);
}

export function resolveOldestRecord(records: readonly OutboxRecord[]): OutboxRecord | null {
  let oldestRecord: OutboxRecord | null = null;
  let oldestCreatedAtMs = Number.POSITIVE_INFINITY;

  for (const record of records) {
    const createdAtMs = Date.parse(record.createdAt);
    if (Number.isFinite(createdAtMs) && createdAtMs < oldestCreatedAtMs) {
      oldestCreatedAtMs = createdAtMs;
      oldestRecord = record;
    }
  }

  return oldestRecord ?? records[0] ?? null;
}

export function roundToMillis(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function renderGaugeMetric(name: string, help: string, value: number): string[] {
  return renderScalarMetric(name, help, 'gauge', value);
}

export function renderCounterMetric(name: string, help: string, value: number): string[] {
  return renderScalarMetric(name, help, 'counter', value);
}

export function toUnixTimestampSeconds(epochMs: number | null): number {
  return epochMs === null ? 0 : Math.floor(epochMs / 1000);
}

export function toIso(epochMs: number | null): string | null {
  return epochMs === null ? null : new Date(epochMs).toISOString();
}

function stringifyScalarError(error: unknown): string {
  switch (typeof error) {
    case 'string':
      return error;
    case 'symbol':
      return error.description ?? error.toString();
    case 'function':
      return error.name ? `[function ${error.name}]` : '[function anonymous]';
    default:
      return `${error}`;
  }
}

function stringifyObjectError(error: object): string {
  const serialized = safeSerializeObject(error);
  if (serialized !== null) {
    return serialized;
  }

  const constructorName = error.constructor?.name;
  return constructorName && constructorName !== 'Object'
    ? constructorName
    : 'UnserializableErrorObject';
}

function safeSerializeObject(value: object): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function renderScalarMetric(
  name: string,
  help: string,
  type: 'gauge' | 'counter',
  value: number
): string[] {
  return [`# HELP ${name} ${help}`, `# TYPE ${name} ${type}`, `${name} ${value}`];
}
