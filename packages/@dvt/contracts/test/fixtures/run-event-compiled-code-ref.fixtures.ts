export const HEX_64_C = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

const BASE_STEP_STARTED_WRITE_EVENT = {
  eventType: 'StepStarted',
  payloadVersion: 1,
  emittedAt: '2026-03-07T10:00:00.000Z',
  runId: 'run-compiled-code-ref-1',
  tenantId: 'tenant-a',
  projectId: 'project-analytics',
  environmentId: 'prod',
  planId: 'plan-compiled-code-ref-1',
  planVersion: '1.0',
  engineAttemptId: 1,
  logicalAttemptId: 1,
  stepId: 'model.analytics.orders',
} as const;

export const VALID_COMPILED_CODE_REF_FIXTURE = {
  sha256: HEX_64_C,
  storageUri: 's3://dvt-artifacts/prod/compiled/model.analytics.orders.sql',
  sizeBytes: 128,
  encoding: 'utf-8',
} as const;

export const STEP_STARTED_WITH_COMPILED_CODE_REF_WRITE_FIXTURE = {
  ...BASE_STEP_STARTED_WRITE_EVENT,
  eventId: 'evt-step-started-with-ref',
  idempotencyKey: 'StepStarted|tenant-a|run-compiled-code-ref-1|1|model.analytics.orders',
  payload: {
    compiledCodeRef: VALID_COMPILED_CODE_REF_FIXTURE,
  },
} as const;

export const STEP_STARTED_WITHOUT_COMPILED_CODE_REF_WRITE_FIXTURE = {
  ...BASE_STEP_STARTED_WRITE_EVENT,
  eventId: 'evt-step-started-without-ref',
  idempotencyKey: 'StepStarted|tenant-a|run-compiled-code-ref-1|1|model.analytics.orders|no-ref',
} as const;

export const STEP_STARTED_WITH_COMPILED_CODE_REF_RECORD_FIXTURE = {
  ...STEP_STARTED_WITH_COMPILED_CODE_REF_WRITE_FIXTURE,
  runSeq: 10,
  persistedAt: '2026-03-07T10:00:01.000Z',
} as const;

export const STEP_STARTED_WITHOUT_COMPILED_CODE_REF_RECORD_FIXTURE = {
  ...STEP_STARTED_WITHOUT_COMPILED_CODE_REF_WRITE_FIXTURE,
  runSeq: 11,
  persistedAt: '2026-03-07T10:00:02.000Z',
} as const;
