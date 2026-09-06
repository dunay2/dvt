export const HEX_64_C = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

const BASE_STEP_STARTED_WRITE_EVENT = {
  eventType: 'StepStarted',
  payloadVersion: 1,
  emittedAt: '2026-03-07T10:00:00.000Z',
  runId: 'run-step-artifact-ref-1',
  tenantId: 'tenant-a',
  projectId: 'project-analytics',
  environmentId: 'prod',
  planId: 'plan-step-artifact-ref-1',
  planVersion: '1.0',
  engineAttemptId: 1,
  logicalAttemptId: 1,
  stepId: 'model.analytics.orders',
} as const;

export const VALID_STEP_ARTIFACT_REF_FIXTURE = {
  artifactKind: 'compiled-sql',
  sha256: HEX_64_C,
  storageUri: 's3://dvt-artifacts/prod/artifacts/model.analytics.orders.sql',
  sizeBytes: 128,
  encoding: 'utf-8',
} as const;

export const STEP_STARTED_WITH_STEP_ARTIFACT_REF_WRITE_FIXTURE = {
  ...BASE_STEP_STARTED_WRITE_EVENT,
  eventId: 'evt-step-started-with-step-artifact-ref',
  idempotencyKey: 'StepStarted|tenant-a|run-step-artifact-ref-1|1|model.analytics.orders',
  payload: {
    stepArtifactRef: VALID_STEP_ARTIFACT_REF_FIXTURE,
  },
} as const;

export const STEP_STARTED_WITHOUT_PAYLOAD_WRITE_FIXTURE = {
  ...BASE_STEP_STARTED_WRITE_EVENT,
  eventId: 'evt-step-started-without-payload',
  idempotencyKey:
    'StepStarted|tenant-a|run-step-artifact-ref-1|1|model.analytics.orders|no-payload',
} as const;

export const STEP_STARTED_WITH_STEP_ARTIFACT_REF_RECORD_FIXTURE = {
  ...STEP_STARTED_WITH_STEP_ARTIFACT_REF_WRITE_FIXTURE,
  runSeq: 10,
  persistedAt: '2026-03-07T10:00:01.000Z',
} as const;
