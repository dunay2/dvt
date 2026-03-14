/**
 * @file packages/@dvt/contracts/src/schemas.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0006: Contract Tooling Governance
 * @decision Section 2 — Runtime schemas are formalized as canonical validation contracts
 * @decision Section 3 — Provider/run/artifact envelopes use deterministic schema boundaries
 * @consequence API and adapter boundaries validate payloads consistently against governed contract versions
 * @version 1.0.0
 * @date 2026-02-21
 */
/**
 * Zod Schemas for DVT Contracts (v1.0)
 *
 * Runtime validation schemas that mirror the TypeScript types in this package.
 * Use the parse* helpers from ./validation.ts at API boundaries.
 */
import { z } from 'zod';

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
  'CANCELLING',
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
  requiresCapabilities: z.array(z.string().min(1)).optional(),
});

export const RunContextSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().min(1),
  environmentId: z.string().min(1),
  runId: z.string().min(1),
  targetAdapter: ProviderSchema,
  logicalAttemptId: z.number().int().positive().optional(),
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
});

// ─── EngineRunRef (discriminated union) ──────────────────────────────────────

const TemporalRunRefSchema = z.object({
  provider: z.literal('temporal'),
  tenantId: z.string().min(1),
  namespace: z.string().min(1),
  workflowId: z.string().min(1),
  runId: z.string().min(1),
  taskQueue: z.string().optional(),
});

const ConductorRunRefSchema = z.object({
  provider: z.literal('conductor'),
  tenantId: z.string().min(1),
  workflowId: z.string().min(1),
  runId: z.string().min(1),
  conductorUrl: z.string().min(1),
});

const MockRunRefSchema = z.object({
  provider: z.literal('mock'),
  tenantId: z.string().min(1),
  workflowId: z.string().min(1),
  runId: z.string().min(1),
});

export const EngineRunRefSchema = z.discriminatedUnion('provider', [
  TemporalRunRefSchema,
  ConductorRunRefSchema,
  MockRunRefSchema,
]);

// ─── Artifact schemas ────────────────────────────────────────────────────────

export const ArtifactKindSchema = z.enum([
  'execution-plan',
  'compiled-sql',
  'dbt-manifest',
  'dbt-catalog',
  'dbt-run-results',
  'lineage',
]);

export const ArtifactRefSchema = z.object({
  uri: z.string().min(1),
  kind: ArtifactKindSchema,
  sha256: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  expiresAt: z.string().optional(),
  tenantId: z.string().min(1).optional(),
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

// ─── Event schemas (aligned to RunEvents v2.0.1) ─────────────────────────────
// @see specs/contracts/engine/RunEvents.v2.0.md — Normative event contract

/** Write-side event envelope: what the engine/adapter emits before persistence. */
export const RunEventWriteSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  emittedAt: z.string().min(1),
  runId: z.string().min(1),
  tenantId: z.string().min(1),
  projectId: z.string().min(1),
  environmentId: z.string().min(1),
  planId: z.string().min(1),
  planVersion: z.string().min(1),
  engineAttemptId: z.number().int().positive(),
  logicalAttemptId: z.number().int().positive(),
  idempotencyKey: z.string().min(1),
  stepId: z.string().min(1).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

/** Persisted event record: extends RunEventWrite with Append Authority fields. */
export const RunEventRecordSchema = RunEventWriteSchema.extend({
  runSeq: z.number().int().positive(),
  persistedAt: z.string().min(1),
});

export const StepSnapshotSchema = z.object({
  stepId: z.string().min(1),
  status: StepStatusSchema,
  logicalAttemptId: z.number().int().positive(),
  engineAttemptId: z.number().int().positive().optional(),
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

// ─── Planner schemas (GAP-P0-02) ─────────────────────────────────────────────
// @see specs/contracts/engine/ExecutionPlan.v1.md — Normative prose contract
// @see specs/contracts/engine/ExecutionPlan.v1.schema.json — JSON Schema (draft 2020-12)

const HexSha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const PlannerSelectionSchema = z
  .object({
    selectedNodeIds: z.array(z.string().min(1)),
    includeUpstream: z.boolean().optional(),
    includeDownstream: z.boolean().optional(),
  })
  .strict();

export const PlannerPoliciesSchema = z
  .object({
    stepTimeoutMs: z.number().positive().optional(),
    retries: z
      .object({
        maxAttempts: z.number().int().positive(),
        backoffMs: z.number().nonnegative(),
      })
      .strict()
      .optional(),
    concurrency: z
      .object({
        maxInFlight: z.number().int().positive(),
      })
      .strict()
      .optional(),
    gatewayDslVersion: z.string().min(1).optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const PlannerEnvironmentContextSchema = z
  .object({
    environmentId: z.string().min(1).optional(),
    targetProfile: z.string().min(1).optional(),
    vars: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const GraphNodeSchema = z
  .object({
    nodeId: z.string().min(1),
    resourceType: z.string().min(1),
    dependsOn: z.array(z.string().min(1)),
  })
  .strict();

export const DbtManifestRefSchema = z
  .object({
    uri: z.string().min(1),
    sha256: HexSha256Schema.optional(),
    artifactId: z.string().min(1).optional(),
  })
  .strict();

/**
 * Generic structural schema for an execution step.
 * stepTypeConfig is intentionally untyped here — per-kind validation is
 * delegated to IStepTypeRegistry at Planner build-time (G9).
 * For DBT_* kinds the canonical shape is DbtStepTypeConfig / DbtStepTypeConfigSchema.
 */
export const ExecutionStepV2Schema = z
  .object({
    stepId: z.string().min(1),
    kind: z.string().min(1),
    dependsOn: z.array(z.string().min(1)),
    stepTypeConfig: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const PlanCoreSchema = z
  .object({
    metadata: z
      .object({
        planVersion: z.literal('2.3'),
        inputHashSha256: HexSha256Schema,
      })
      .strict(),
    steps: z.array(ExecutionStepV2Schema),
  })
  .strict();

export const ExecutionPlanV2Schema = PlanCoreSchema.extend({
  metadata: z
    .object({
      planVersion: z.literal('2.3'),
      inputHashSha256: HexSha256Schema,
      planId: HexSha256Schema,
      createdAtIso: z.string().min(1),
    })
    .strict(),
  observability: z
    .object({
      tags: z.record(z.string(), z.string()).optional(),
      extra: z.record(z.string(), z.unknown()).optional(),
    })
    .catchall(z.unknown())
    .optional(),
}).strict();

export const PlannerInputEnvelopeV2Schema = z
  .object({
    manifest: z.record(z.string(), z.unknown()).optional(),
    manifestRef: DbtManifestRefSchema.optional(),
    nodes: z.array(GraphNodeSchema),
    selection: PlannerSelectionSchema,
    policies: PlannerPoliciesSchema.optional(),
    environment: PlannerEnvironmentContextSchema.optional(),
    observability: ExecutionPlanV2Schema.shape.observability,
    requestedBy: z.string().min(1).optional(),
    requestId: z.string().min(1).optional(),
    requestedAtIso: z.string().min(1).optional(),
  })
  .strict();

export const PlannerBuildResultV2Schema = z
  .object({
    plan: ExecutionPlanV2Schema,
    canonicalPlanJson: z.string().min(1),
  })
  .strict();

// ─── Inferred types from schemas (B1) ────────────────────────────────────────

export type PlanRefSchemaT = z.infer<typeof PlanRefSchema>;
export type RunContextSchemaT = z.infer<typeof RunContextSchema>;
export type SignalRequestSchemaT = z.infer<typeof SignalRequestSchema>;
export type RunStatusSnapshotSchemaT = z.infer<typeof RunStatusSnapshotSchema>;
export type EngineRunRefSchemaT = z.infer<typeof EngineRunRefSchema>;

export type ArtifactRefSchemaT = z.infer<typeof ArtifactRefSchema>;
export type StepOutputSchemaT = z.infer<typeof StepOutputSchema>;

export type RunEventWriteSchemaT = z.infer<typeof RunEventWriteSchema>;
export type RunEventRecordSchemaT = z.infer<typeof RunEventRecordSchema>;
export type StepSnapshotSchemaT = z.infer<typeof StepSnapshotSchema>;
export type RunSnapshotSchemaT = z.infer<typeof RunSnapshotSchema>;

export type ExecuteStepRequestSchemaT = z.infer<typeof ExecuteStepRequestSchema>;
export type ExecuteStepResultSchemaT = z.infer<typeof ExecuteStepResultSchema>;
export type PlannerSelectionSchemaT = z.infer<typeof PlannerSelectionSchema>;
export type PlannerPoliciesSchemaT = z.infer<typeof PlannerPoliciesSchema>;
export type PlannerEnvironmentContextSchemaT = z.infer<typeof PlannerEnvironmentContextSchema>;
export type GraphNodeSchemaT = z.infer<typeof GraphNodeSchema>;
export type DbtManifestRefSchemaT = z.infer<typeof DbtManifestRefSchema>;
export type ExecutionStepV2SchemaT = z.infer<typeof ExecutionStepV2Schema>;
export type PlanCoreSchemaT = z.infer<typeof PlanCoreSchema>;
export type ExecutionPlanV2SchemaT = z.infer<typeof ExecutionPlanV2Schema>;
export type PlannerInputEnvelopeV2SchemaT = z.infer<typeof PlannerInputEnvelopeV2Schema>;
export type PlannerBuildResultV2SchemaT = z.infer<typeof PlannerBuildResultV2Schema>;
