import type { ExecutionPlan } from '@dvt/engine';

export function parseStoredExecutablePlan(bytes: Uint8Array): ExecutionPlan {
  const parsed: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
  if (!isExecutionPlan(parsed)) {
    throw new Error('INVALID_EXECUTABLE_PLAN');
  }
  return parsed;
}

function isExecutionPlan(value: unknown): value is ExecutionPlan {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record['steps'])) {
    return false;
  }

  const metadata = record['metadata'];
  if (metadata === null || typeof metadata !== 'object') {
    return false;
  }

  const meta = metadata as Record<string, unknown>;
  return (
    typeof meta['planId'] === 'string' &&
    typeof meta['planVersion'] === 'string' &&
    typeof meta['schemaVersion'] === 'string' &&
    typeof meta['contractVersion'] === 'string'
  );
}
