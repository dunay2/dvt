/** Owned concern: decode protected runtime cost attribution read-model payloads for web ports. */
import type {
  CostAttributionObservedWindow,
  CostAttributionRun,
  CostAttributionStep,
  CostAttributionSummary,
} from '../../ports/cost';

const VALID_STEP_EVENT_TYPES = new Set<CostAttributionStep['eventType']>([
  'StepCompleted',
  'StepFailed',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(path: string, expected: string): never {
  throw new Error(`COST_ATTRIBUTION_SUMMARY_INVALID ${path}: expected ${expected}`);
}

function readString(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fail(path, 'non-empty string');
  }
  return value;
}

function readNullableString(record: Record<string, unknown>, key: string, path: string): string | null {
  const value = record[key];
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return fail(path, 'string or null');
}

function readNumber(record: Record<string, unknown>, key: string, path: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return fail(path, 'non-negative finite number');
  }
  return value;
}

function readNull(record: Record<string, unknown>, key: string, path: string): null {
  if (record[key] !== null) {
    return fail(path, 'null');
  }
  return null;
}

function readCostCaptureStatus(record: Record<string, unknown>): CostAttributionSummary['costCaptureStatus'] {
  if (record.costCaptureStatus !== 'unavailable') {
    return fail('costCaptureStatus', 'unavailable');
  }
  return 'unavailable';
}

function readRecord(record: Record<string, unknown>, key: string, path: string): Record<string, unknown> {
  const value = record[key];
  if (!isRecord(value)) {
    return fail(path, 'object');
  }
  return value;
}

function readArray(record: Record<string, unknown>, key: string, path: string): readonly unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    return fail(path, 'array');
  }
  return value;
}

function decodeObservedWindow(input: unknown): CostAttributionObservedWindow {
  if (!isRecord(input)) {
    return fail('observedWindow', 'object');
  }
  return {
    firstEventAt: readNullableString(input, 'firstEventAt', 'observedWindow.firstEventAt'),
    lastEventAt: readNullableString(input, 'lastEventAt', 'observedWindow.lastEventAt'),
  };
}

function decodeRun(input: unknown, index: number): CostAttributionRun {
  if (!isRecord(input)) {
    return fail(`runs[${index}]`, 'object');
  }
  return {
    runId: readString(input, 'runId', `runs[${index}].runId`),
    projectId: readString(input, 'projectId', `runs[${index}].projectId`),
    environmentId: readString(input, 'environmentId', `runs[${index}].environmentId`),
    planId: readString(input, 'planId', `runs[${index}].planId`),
    planVersion: readString(input, 'planVersion', `runs[${index}].planVersion`),
    status: readNullableString(input, 'status', `runs[${index}].status`),
    completedStepCount: readNumber(input, 'completedStepCount', `runs[${index}].completedStepCount`),
    failedStepCount: readNumber(input, 'failedStepCount', `runs[${index}].failedStepCount`),
    totalStepDurationMs: readNumber(input, 'totalStepDurationMs', `runs[${index}].totalStepDurationMs`),
    costAmount: readNull(input, 'costAmount', `runs[${index}].costAmount`),
    currency: readNull(input, 'currency', `runs[${index}].currency`),
  };
}

function readStepEventType(input: Record<string, unknown>, index: number): CostAttributionStep['eventType'] {
  const value = input.eventType;
  if (typeof value !== 'string' || !VALID_STEP_EVENT_TYPES.has(value as CostAttributionStep['eventType'])) {
    return fail(`steps[${index}].eventType`, 'StepCompleted or StepFailed');
  }
  return value as CostAttributionStep['eventType'];
}

function decodeStep(input: unknown, index: number): CostAttributionStep {
  if (!isRecord(input)) {
    return fail(`steps[${index}]`, 'object');
  }
  return {
    runId: readString(input, 'runId', `steps[${index}].runId`),
    stepId: readString(input, 'stepId', `steps[${index}].stepId`),
    eventType: readStepEventType(input, index),
    durationMs: readNumber(input, 'durationMs', `steps[${index}].durationMs`),
    costAmount: readNull(input, 'costAmount', `steps[${index}].costAmount`),
    currency: readNull(input, 'currency', `steps[${index}].currency`),
  };
}

export function decodeCostAttributionSummary(input: unknown): CostAttributionSummary {
  if (!isRecord(input)) {
    return fail('payload', 'object');
  }

  const observedWindow = decodeObservedWindow(readRecord(input, 'observedWindow', 'observedWindow'));
  const runs = readArray(input, 'runs', 'runs').map(decodeRun);
  const steps = readArray(input, 'steps', 'steps').map(decodeStep);

  return {
    tenantId: readString(input, 'tenantId', 'tenantId'),
    projectId: readNullableString(input, 'projectId', 'projectId'),
    environmentId: readNullableString(input, 'environmentId', 'environmentId'),
    runCount: readNumber(input, 'runCount', 'runCount'),
    completedStepCount: readNumber(input, 'completedStepCount', 'completedStepCount'),
    failedStepCount: readNumber(input, 'failedStepCount', 'failedStepCount'),
    totalStepDurationMs: readNumber(input, 'totalStepDurationMs', 'totalStepDurationMs'),
    totalCostAmount: readNull(input, 'totalCostAmount', 'totalCostAmount'),
    currency: readNull(input, 'currency', 'currency'),
    costCaptureStatus: readCostCaptureStatus(input),
    observedWindow,
    runs,
    steps,
    nextCursor: readNullableString(input, 'nextCursor', 'nextCursor'),
  };
}
