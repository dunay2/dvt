import { z } from 'zod';

import { StepArtifactRefSchema } from '../step-registry/StepTypeRegistry.js';

import {
  IsoUtcStringSchema,
  StepResultEvidenceSchema,
  NonBlankStringSchema,
  StepIdSchema,
  StepStatusSchema,
  TransformationExecutorSchema,
} from './common.js';

// Event schemas aligned to the active RunEvents v1 contract.
// @see docs/architecture/components/engine/contracts/engine/RunEvents.v1.md

export const RUN_EVENT_PAYLOAD_VERSION = 1 as const;

const EmptyEventPayloadSchema = z.object({}).strict();

export const RunFailureReasonSchema = z.enum([
  'QUEUED_TIMEOUT',
  'CANCELLATION_TIMEOUT',
  'START_RUN_FAILURE',
  'STEP_FAILURE',
  'WORKFLOW_FAILURE',
  'CURSOR_OVERFLOW',
  'PLAN_REF_EXPIRED',
  'PLAN_REF_UNAVAILABLE',
]);

const RunStartedPayloadSchema = z
  .object({
    executor: TransformationExecutorSchema,
  })
  .strict();

const RunFailedPayloadSchema = z
  .object({
    reason: RunFailureReasonSchema,
    executor: TransformationExecutorSchema.optional(),
    message: NonBlankStringSchema.optional(),
  })
  .strict();

const StepStartedPayloadSchema = z
  .object({
    stepArtifactRef: StepArtifactRefSchema,
  })
  .strict();

const StepCompletedPayloadSchema = z
  .object({
    gatewayDecision: z.boolean().optional(),
    resultEvidence: StepResultEvidenceSchema.optional(),
  })
  .refine(
    (payload) => payload.gatewayDecision !== undefined || payload.resultEvidence !== undefined,
    {
      message: 'StepCompleted payload must contain gatewayDecision or resultEvidence',
    }
  )
  .strict();

const StepFailedPayloadSchema = z
  .object({
    reason: NonBlankStringSchema.optional(),
    message: NonBlankStringSchema.optional(),
  })
  .refine((payload) => payload.reason !== undefined || payload.message !== undefined, {
    message: 'StepFailed payload must contain reason or message',
  })
  .strict();

const RunCompletedPayloadSchema = z
  .object({
    executor: TransformationExecutorSchema.optional(),
    resultEvidence: StepResultEvidenceSchema.optional(),
  })
  .refine((payload) => payload.executor !== undefined || payload.resultEvidence !== undefined, {
    message: 'RunCompleted payload must contain executor or resultEvidence',
  })
  .strict();

const RunEventCommonSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  emittedAt: IsoUtcStringSchema,
  runId: NonBlankStringSchema,
  tenantId: z.string().min(1),
  projectId: z.string().min(1),
  environmentId: z.string().min(1),
  planId: z.string().min(1),
  planVersion: z.string().min(1),
  engineAttemptId: z.number().int().positive(),
  logicalAttemptId: z.number().int().positive(),
  idempotencyKey: z.string().min(1),
  payloadVersion: z.literal(RUN_EVENT_PAYLOAD_VERSION),
});

const RunQueuedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('RunQueued'),
  payload: EmptyEventPayloadSchema.optional(),
}).strict();

const RunStartedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('RunStarted'),
  payload: z.union([EmptyEventPayloadSchema, RunStartedPayloadSchema]).optional(),
}).strict();

const RunPausedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('RunPaused'),
  payload: EmptyEventPayloadSchema.optional(),
}).strict();

const RunResumedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('RunResumed'),
  payload: EmptyEventPayloadSchema.optional(),
}).strict();

const RunCancelSubmittedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('RunCancelSubmitted'),
  payload: EmptyEventPayloadSchema.optional(),
}).strict();

const RunCancelRequestedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('RunCancelRequested'),
  payload: EmptyEventPayloadSchema.optional(),
}).strict();

const RunCancelledEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('RunCancelled'),
  payload: EmptyEventPayloadSchema.optional(),
}).strict();

const RunCompletedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('RunCompleted'),
  payload: z.union([EmptyEventPayloadSchema, RunCompletedPayloadSchema]).optional(),
}).strict();

const RunFailedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('RunFailed'),
  payload: RunFailedPayloadSchema,
}).strict();

const StepStartedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('StepStarted'),
  stepId: StepIdSchema,
  payload: StepStartedPayloadSchema.optional(),
}).strict();

const StepCompletedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('StepCompleted'),
  stepId: StepIdSchema,
  payload: StepCompletedPayloadSchema.optional(),
}).strict();

const StepFailedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('StepFailed'),
  stepId: StepIdSchema,
  payload: z.union([EmptyEventPayloadSchema, StepFailedPayloadSchema]).optional(),
}).strict();

const StepSkippedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('StepSkipped'),
  stepId: StepIdSchema,
  payload: EmptyEventPayloadSchema.optional(),
}).strict();

export const RunEventWriteSchema = z.discriminatedUnion('eventType', [
  RunQueuedEventWriteSchema,
  RunStartedEventWriteSchema,
  RunPausedEventWriteSchema,
  RunResumedEventWriteSchema,
  RunCancelSubmittedEventWriteSchema,
  RunCancelRequestedEventWriteSchema,
  RunCancelledEventWriteSchema,
  RunCompletedEventWriteSchema,
  RunFailedEventWriteSchema,
  StepStartedEventWriteSchema,
  StepCompletedEventWriteSchema,
  StepFailedEventWriteSchema,
  StepSkippedEventWriteSchema,
]);

export const RunEventRecordSchema = z.discriminatedUnion('eventType', [
  RunQueuedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: IsoUtcStringSchema,
  }),
  RunStartedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: IsoUtcStringSchema,
  }),
  RunPausedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: IsoUtcStringSchema,
  }),
  RunResumedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: IsoUtcStringSchema,
  }),
  RunCancelSubmittedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: IsoUtcStringSchema,
  }),
  RunCancelRequestedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: IsoUtcStringSchema,
  }),
  RunCancelledEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: IsoUtcStringSchema,
  }),
  RunCompletedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: IsoUtcStringSchema,
  }),
  RunFailedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: IsoUtcStringSchema,
  }),
  StepStartedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: IsoUtcStringSchema,
  }),
  StepCompletedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: IsoUtcStringSchema,
  }),
  StepFailedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: IsoUtcStringSchema,
  }),
  StepSkippedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: IsoUtcStringSchema,
  }),
]);

export const StepSnapshotSchema = z.object({
  stepId: StepIdSchema,
  status: StepStatusSchema,
  logicalAttemptId: z.number().int().positive(),
  engineAttemptId: z.number().int().positive().optional(),
  startedAt: IsoUtcStringSchema.optional(),
  completedAt: IsoUtcStringSchema.optional(),
  artifacts: z.array(z.unknown()),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean(),
    })
    .optional(),
});

export const RunSnapshotSchema = z.object({
  runId: NonBlankStringSchema,
  status: z.string().min(1),
  lastEventSeq: z.number().int().nonnegative(),
  steps: z.array(StepSnapshotSchema),
  artifacts: z.array(z.unknown()),
  startedAt: IsoUtcStringSchema.optional(),
  completedAt: IsoUtcStringSchema.optional(),
  totalDurationMs: z.number().nonnegative().optional(),
});

export type RunEventWriteSchemaT = z.infer<typeof RunEventWriteSchema>;
export type RunEventRecordSchemaT = z.infer<typeof RunEventRecordSchema>;
export type StepSnapshotSchemaT = z.infer<typeof StepSnapshotSchema>;
export type RunSnapshotSchemaT = z.infer<typeof RunSnapshotSchema>;
