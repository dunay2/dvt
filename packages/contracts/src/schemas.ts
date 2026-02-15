/**
 * Zod Schemas for DVT Contracts (v1.0)
 *
 * Runtime validation schemas that mirror the TypeScript types in this package.
 * Use the parse* helpers from ./validation.ts at API boundaries.
 */
import { z } from 'zod';

import type { RunStatusSnapshot } from './types/contracts';

// ─── Primitive schemas ───────────────────────────────────────────────────────

export const ProviderSchema = z.enum(['temporal', 'conductor', 'mock']);

export const RunStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'RUNNING',
  'PAUSED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export const RunSubstatusSchema = z.enum([
  'DRAINING',
  'RETRYING',
  'CONTINUE_AS_NEW',
  'WAITING_APPROVAL',
  'RECOVERING',
]);

export const StepStatusSchema = z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED']);

export const SignalTypeSchema = z.enum(['PAUSE', 'RESUME', 'CANCEL', 'RETRY_STEP', 'RETRY_RUN']);

export const StepOutputStatusSchema = z.enum(['SUCCESS', 'FAILED', 'SKIPPED']);

// ─── Core contract schemas ───────────────────────────────────────────────────

export const PlanRefSchema = z.object({
  uri: z.string().min(1),
  sha256: z.string().min(1),
  schemaVersion: z.string().min(1),
  planId: z.string().min(1),
  planVersion: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional(),
  expiresAt: z.string().optional(),
});

export const RunContextSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().min(1),
  environmentId: z.string().min(1),
  runId: z.string().min(1),
  targetAdapter: ProviderSchema,
});

export const SignalRequestSchema = z.object({
  signalId: z.string().min(1),
  type: SignalTypeSchema,
  stepId: z.string().optional(),
  reason: z.string().optional(),
  requestedAt: z.string().optional(),
});

export const RunStatusSnapshotSchema = z.object({
  runId: z.string().min(1),
  status: RunStatusSchema,
  substatus: z
    .union([RunSubstatusSchema, z.string().regex(/^(temporal|conductor|mock)\/.+$/)])
    .optional(),
  message: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  hash: z.string().optional(),
}) as z.ZodType<RunStatusSnapshot>;

// ─── EngineRunRef (discriminated union) ──────────────────────────────────────

const TemporalRunRefSchema = z.object({
  provider: z.literal('temporal'),
  namespace: z.string().min(1),
  workflowId: z.string().min(1),
  runId: z.string().min(1),
  taskQueue: z.string().optional(),
});

const ConductorRunRefSchema = z.object({
  provider: z.literal('conductor'),
  workflowId: z.string().min(1),
  runId: z.string().min(1),
  conductorUrl: z.string().min(1),
});

const MockRunRefSchema = z.object({
  provider: z.literal('mock'),
  workflowId: z.string().min(1),
  runId: z.string().min(1),
});

export const EngineRunRefSchema = z.discriminatedUnion('provider', [
  TemporalRunRefSchema,
  ConductorRunRefSchema,
  MockRunRefSchema,
]);

// ─── Artifact schemas ────────────────────────────────────────────────────────

export const ArtifactRefSchema = z.object({
  uri: z.string().min(1),
  kind: z.string().min(1),
  sha256: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  expiresAt: z.string().optional(),
});

export const StepErrorSchema = z.object({
  category: z.string().min(1),
  code: z.string().optional(),
  message: z.string().min(1),
  retryable: z.boolean().optional(),
});

export const StepOutputSchema = z.object({
  status: StepOutputStatusSchema,
  artifactRefs: z.array(ArtifactRefSchema),
  error: StepErrorSchema.optional(),
});

// ─── Event & snapshot schemas ────────────────────────────────────────────────

export const CanonicalEngineEventSchema = z.object({
  runId: z.string().min(1),
  runSeq: z.number().int().nonnegative(),
  eventId: z.string().min(1),
  stepId: z.string().optional(),
  engineAttemptId: z.string().optional(),
  logicalAttemptId: z.string().optional(),
  eventType: z.string().min(1),
  eventData: z.unknown(),
  idempotencyKey: z.string().min(1),
  emittedAt: z.string().min(1),
  persistedAt: z.string().optional(),
  adapterVersion: z.string().optional(),
  engineRunRef: z.unknown().optional(),
  causedBySignalId: z.string().optional(),
  parentEventId: z.string().optional(),
});

export const StepSnapshotSchema = z.object({
  stepId: z.string().min(1),
  status: StepStatusSchema,
  logicalAttemptId: z.string().min(1),
  engineAttemptId: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
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
  runId: z.string().min(1),
  status: z.string().min(1),
  lastEventSeq: z.number().int().nonnegative(),
  steps: z.array(StepSnapshotSchema),
  artifacts: z.array(z.unknown()),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  totalDurationMs: z.number().nonnegative().optional(),
});

// ─── Adapter request/response schemas ────────────────────────────────────────

export const ExecuteStepRequestSchema = z.object({
  tenantId: z.string().min(1),
  planId: z.string().min(1),
  runId: z.string().min(1),
  stepId: z.string().min(1),
  stepType: z.string().min(1),
  stepData: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string().optional(),
  timeout: z.number().int().positive().optional(),
});

export const ExecuteStepResultSchema = z.object({
  runId: z.string().min(1),
  stepId: z.string().min(1),
  status: z.string().min(1),
  output: z.record(z.string(), z.unknown()).optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean(),
    })
    .optional(),
  duration: z.number().nonnegative(),
  executedAt: z.number(),
});
