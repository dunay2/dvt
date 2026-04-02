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

import type { ExecutionPlan, PlanCore } from './contracts/planner/ExecutionPlan.v2.js';
import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
} from './contracts/planner/ExecutionPlan.v2.js';
import type { PlanAdmissionLink } from './contracts/planner/PlanAdmissionLink.v1.js';
import type {
  PlanExecutabilityRecord,
  PlanExecutabilityRejectionReport,
} from './contracts/planner/PlanExecutabilityRecord.v1.js';
import { EXECUTABILITY_REJECTION_CODES } from './contracts/planner/PlanExecutabilityValidation.v1.js';
import { PlannerPolicyClassSetSchema } from './contracts/planner/PlannerPolicyVocabulary.v2.js';
import type { PlanRecord } from './contracts/planner/PlanRecord.v1.js';
import {
  CURRENT_EXECUTION_PLAN_VERSION,
  SUPPORTED_EXECUTION_PLAN_VERSIONS,
} from './contracts/planner/PlanVersion.v1.js';
import { CompiledCodeRefSchema } from './step-registry/StepTypeRegistry.js';

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
const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, {
    message: 'String must contain at least one non-whitespace character',
  });

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

export const RunContextSchema = z
  .object({
    tenantId: z.string().min(1),
    projectId: z.string().min(1),
    environmentId: z.string().min(1),
    runId: NonBlankStringSchema,
    targetAdapter: ProviderSchema,
  })
  .strict();

export const ResolvedRunContextSchema = RunContextSchema.extend({
  logicalAttemptId: z.number().int().positive(),
  parentRunId: NonBlankStringSchema.optional(),
  originRunId: NonBlankStringSchema.optional(),
}).strict();

export const SignalRequestSchema = z.object({
  signalId: z.string().min(1),
  type: SignalTypeSchema,
  stepId: z.string().optional(),
  reason: z.string().optional(),
  requestedAt: z.string().optional(),
});

export const RunStatusSnapshotSchema = z.object({
  runId: NonBlankStringSchema,
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
  runId: NonBlankStringSchema,
  taskQueue: z.string().optional(),
});

const ConductorRunRefSchema = z.object({
  provider: z.literal('conductor'),
  tenantId: z.string().min(1),
  workflowId: z.string().min(1),
  runId: NonBlankStringSchema,
  conductorUrl: z.string().min(1),
});

const MockRunRefSchema = z.object({
  provider: z.literal('mock'),
  tenantId: z.string().min(1),
  workflowId: z.string().min(1),
  runId: NonBlankStringSchema,
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

export const RUN_EVENT_PAYLOAD_VERSION = 1 as const;

const EmptyEventPayloadSchema = z.object({}).strict();
export const RunFailureReasonSchema = z.enum([
  'QUEUED_TIMEOUT',
  'CANCELLATION_TIMEOUT',
  'START_RUN_FAILURE',
  'STEP_FAILURE',
  'WORKFLOW_FAILURE',
]);
const RunFailedPayloadSchema = z
  .object({
    reason: RunFailureReasonSchema,
  })
  .strict();
const StepStartedPayloadSchema = z
  .object({
    compiledCodeRef: CompiledCodeRefSchema,
  })
  .strict();
const StepCompletedPayloadSchema = z
  .object({
    gatewayDecision: z.boolean(),
  })
  .strict();

const RunEventCommonSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  emittedAt: z.string().min(1),
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
  payload: EmptyEventPayloadSchema.optional(),
}).strict();

const RunPausedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('RunPaused'),
  payload: EmptyEventPayloadSchema.optional(),
}).strict();

const RunResumedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('RunResumed'),
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
  payload: EmptyEventPayloadSchema.optional(),
}).strict();

const RunFailedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('RunFailed'),
  payload: RunFailedPayloadSchema,
}).strict();

const StepStartedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('StepStarted'),
  stepId: z.string().min(1),
  payload: StepStartedPayloadSchema.optional(),
}).strict();

const StepCompletedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('StepCompleted'),
  stepId: z.string().min(1),
  payload: StepCompletedPayloadSchema.optional(),
}).strict();

const StepFailedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('StepFailed'),
  stepId: z.string().min(1),
  payload: EmptyEventPayloadSchema.optional(),
}).strict();

const StepSkippedEventWriteSchema = RunEventCommonSchema.extend({
  eventType: z.literal('StepSkipped'),
  stepId: z.string().min(1),
  payload: EmptyEventPayloadSchema.optional(),
}).strict();

/** Write-side event envelope: what the engine/adapter emits before persistence. */
export const RunEventWriteSchema = z.discriminatedUnion('eventType', [
  RunQueuedEventWriteSchema,
  RunStartedEventWriteSchema,
  RunPausedEventWriteSchema,
  RunResumedEventWriteSchema,
  RunCancelRequestedEventWriteSchema,
  RunCancelledEventWriteSchema,
  RunCompletedEventWriteSchema,
  RunFailedEventWriteSchema,
  StepStartedEventWriteSchema,
  StepCompletedEventWriteSchema,
  StepFailedEventWriteSchema,
  StepSkippedEventWriteSchema,
]);

/** Persisted event record: extends RunEventWrite with Append Authority fields. */
export const RunEventRecordSchema = z.discriminatedUnion('eventType', [
  RunQueuedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: z.string().min(1),
  }),
  RunStartedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: z.string().min(1),
  }),
  RunPausedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: z.string().min(1),
  }),
  RunResumedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: z.string().min(1),
  }),
  RunCancelRequestedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: z.string().min(1),
  }),
  RunCancelledEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: z.string().min(1),
  }),
  RunCompletedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: z.string().min(1),
  }),
  RunFailedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: z.string().min(1),
  }),
  StepStartedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: z.string().min(1),
  }),
  StepCompletedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: z.string().min(1),
  }),
  StepFailedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: z.string().min(1),
  }),
  StepSkippedEventWriteSchema.extend({
    runSeq: z.number().int().positive(),
    persistedAt: z.string().min(1),
  }),
]);

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
  runId: NonBlankStringSchema,
  status: z.string().min(1),
  lastEventSeq: z.number().int().nonnegative(),
  steps: z.array(StepSnapshotSchema),
  artifacts: z.array(z.unknown()),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  totalDurationMs: z.number().nonnegative().optional(),
});

// ─── Planner schemas (GAP-P0-02) ─────────────────────────────────────────────
// @see specs/contracts/engine/ExecutionPlan.v1.md — Normative prose contract
// @see specs/contracts/engine/ExecutionPlan.v1.schema.json — JSON Schema (draft 2020-12)

const HexSha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const PlanVersionSchema = z.enum(SUPPORTED_EXECUTION_PLAN_VERSIONS);

export const PlannerSelectionSchema = z
  .object({
    selectedNodeIds: z.array(z.string().min(1)),
    includeUpstream: z.boolean().optional(),
    includeDownstream: z.boolean().optional(),
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

export const PlannerGraphSourceV1Schema = z
  .object({
    kind: z.literal('normalized-graph-v1'),
    nodes: z.array(GraphNodeSchema),
  })
  .strict();

export const DbtManifestRefSchema = z
  .object({
    uri: z.string().min(1),
    sha256: HexSha256Schema,
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
    type: z.enum(['task', 'gateway']).optional(),
    gateway: z
      .object({
        dslVersion: z.literal('1.0'),
        expression: z.string().min(1),
      })
      .strict()
      .optional(),
  })
  .strict();

const ExecutionPlanObservabilitySchema = z
  .object({
    tags: z.record(z.string(), z.string()).optional(),
    extra: z.record(z.string(), z.unknown()).optional(),
  })
  .catchall(z.unknown())
  .optional();
const CurrentPlanCoreSchema = z
  .object({
    metadata: z
      .object({
        planVersion: z.literal(CURRENT_EXECUTION_PLAN_VERSION),
        inputHashSha256: HexSha256Schema,
      })
      .strict(),
    steps: z.array(ExecutionStepV2Schema),
  })
  .strict();

const CurrentExecutionPlanV2Schema = CurrentPlanCoreSchema.extend({
  metadata: z
    .object({
      planVersion: z.literal(CURRENT_EXECUTION_PLAN_VERSION),
      schemaVersion: z.literal(CURRENT_EXECUTION_PLAN_SCHEMA_VERSION),
      contractVersion: z.literal(CURRENT_EXECUTION_PLAN_CONTRACT_VERSION),
      inputHashSha256: HexSha256Schema,
      planId: HexSha256Schema,
      createdAtIso: z.string().min(1),
      plannerVersion: z.string().min(1).optional(),
      plannerGitSha: z.string().length(40).optional(),
      requiresCapabilities: z.array(z.string().min(1)).optional(),
      fallbackBehavior: z.enum(['reject', 'emulate', 'degrade']).optional(),
      targetAdapter: z.enum(['temporal', 'conductor', 'any', 'mock']).optional(),
    })
    .strict(),
  observability: ExecutionPlanObservabilitySchema,
}).strict();

export const PLAN_CORE_VERSIONED_SCHEMAS = {
  [CURRENT_EXECUTION_PLAN_VERSION]: CurrentPlanCoreSchema,
} as const;

export const EXECUTION_PLAN_VERSIONED_SCHEMAS = {
  [CURRENT_EXECUTION_PLAN_VERSION]: CurrentExecutionPlanV2Schema,
} as const;

export const PlanCoreSchema = CurrentPlanCoreSchema as z.ZodType<PlanCore>;

export const ExecutionPlanSchema = CurrentExecutionPlanV2Schema as z.ZodType<ExecutionPlan>;

export const PlannerInputEnvelopeV2Schema = z
  .object({
    graphSource: PlannerGraphSourceV1Schema.optional(),
    manifest: z.record(z.string(), z.unknown()).optional(),
    manifestRef: DbtManifestRefSchema.optional(),
    nodes: z.array(GraphNodeSchema).optional(),
    selection: PlannerSelectionSchema,
    policies: PlannerPolicyClassSetSchema.optional(),
    environment: PlannerEnvironmentContextSchema.optional(),
    observability: ExecutionPlanObservabilitySchema,
    requestedBy: z.string().min(1).optional(),
    requestId: z.string().min(1).optional(),
    requestedAtIso: z.string().min(1).optional(),
  })
  .superRefine((input, ctx) => {
    const activeSources = [
      input.graphSource,
      input.manifest,
      input.manifestRef,
      input.nodes,
    ].filter((value) => value !== undefined).length;

    if (activeSources !== 1) {
      ctx.addIssue({
        code: 'custom',
        message:
          'PlannerInputEnvelopeV2 requires exactly one active source: graphSource, manifest, manifestRef, or nodes.',
      });
    }
  })
  .strict();

export const PlannerBuildResultV2Schema = z
  .object({
    plan: ExecutionPlanSchema,
    canonicalPlanJson: z.string().min(1),
  })
  .strict();

export const PlanRecordStateSchema = z.enum(['ACTIVE', 'SUPERSEDED', 'ARCHIVED']);
const PlanRecordCommonSchema = z
  .object({
    planId: HexSha256Schema,
    canonicalPlanJson: NonBlankStringSchema,
    canonicalHash: HexSha256Schema,
    planVersion: PlanVersionSchema,
    schemaVersion: z.literal(CURRENT_EXECUTION_PLAN_SCHEMA_VERSION),
    contractVersion: z.literal(CURRENT_EXECUTION_PLAN_CONTRACT_VERSION),
    sourceRef: NonBlankStringSchema,
    createdAtIso: NonBlankStringSchema,
    updatedAtIso: NonBlankStringSchema,
    derivedFromPlanId: HexSha256Schema.optional(),
    supersedesPlanId: HexSha256Schema.optional(),
  })
  .strict();

export const PlanRecordShapeSchema: z.ZodType<PlanRecord> = z.discriminatedUnion('state', [
  PlanRecordCommonSchema.extend({
    state: z.literal('ACTIVE'),
  }).strict(),
  PlanRecordCommonSchema.extend({
    state: z.literal('SUPERSEDED'),
  }).strict(),
  PlanRecordCommonSchema.extend({
    state: z.literal('ARCHIVED'),
    archivedAtIso: NonBlankStringSchema,
  }).strict(),
]);

export const PlanRecordSchema: z.ZodType<PlanRecord> = PlanRecordShapeSchema.superRefine(
  (record, ctx) => {
    let canonicalPlanInput: unknown;

    try {
      canonicalPlanInput = JSON.parse(record.canonicalPlanJson);
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: ['canonicalPlanJson'],
        message: 'canonicalPlanJson must contain valid JSON',
      });
      return;
    }

    const canonicalPlanResult = ExecutionPlanSchema.safeParse(canonicalPlanInput);
    if (!canonicalPlanResult.success) {
      for (const issue of canonicalPlanResult.error.issues) {
        ctx.addIssue({
          code: 'custom',
          path: ['canonicalPlanJson', ...issue.path],
          message: issue.message,
        });
      }
      return;
    }

    const canonicalMetadata = canonicalPlanResult.data.metadata;
    if (record.planId !== canonicalMetadata.planId) {
      ctx.addIssue({
        code: 'custom',
        path: ['planId'],
        message: 'planId must match canonicalPlanJson.metadata.planId',
      });
    }
    if (record.planVersion !== canonicalMetadata.planVersion) {
      ctx.addIssue({
        code: 'custom',
        path: ['planVersion'],
        message: 'planVersion must match canonicalPlanJson.metadata.planVersion',
      });
    }
    if (record.schemaVersion !== canonicalMetadata.schemaVersion) {
      ctx.addIssue({
        code: 'custom',
        path: ['schemaVersion'],
        message: 'schemaVersion must match canonicalPlanJson.metadata.schemaVersion',
      });
    }
    if (record.contractVersion !== canonicalMetadata.contractVersion) {
      ctx.addIssue({
        code: 'custom',
        path: ['contractVersion'],
        message: 'contractVersion must match canonicalPlanJson.metadata.contractVersion',
      });
    }
  }
);

export const PlanExecutabilityStateSchema = z.enum(['PENDING', 'VALID', 'INVALID']);

export const PlanExecutabilityRejectionReportSchema: z.ZodType<PlanExecutabilityRejectionReport> = z
  .object({
    code: z.enum(EXECUTABILITY_REJECTION_CODES),
    reason: NonBlankStringSchema,
    degradable: z.boolean(),
    cause: NonBlankStringSchema.optional(),
  })
  .strict();

const PlanExecutabilityRecordCommonSchema = z
  .object({
    planId: HexSha256Schema,
    adapterId: NonBlankStringSchema,
  })
  .strict();

export const PlanExecutabilityRecordSchema: z.ZodType<PlanExecutabilityRecord> =
  z.discriminatedUnion('state', [
    PlanExecutabilityRecordCommonSchema.extend({
      state: z.literal('PENDING'),
    }).strict(),
    PlanExecutabilityRecordCommonSchema.extend({
      state: z.literal('VALID'),
      validatedAtIso: NonBlankStringSchema,
    }).strict(),
    PlanExecutabilityRecordCommonSchema.extend({
      state: z.literal('INVALID'),
      validatedAtIso: NonBlankStringSchema,
      rejectionReport: PlanExecutabilityRejectionReportSchema,
    }).strict(),
  ]);

export const PlanAdmissionLinkSchema: z.ZodType<PlanAdmissionLink> = z
  .object({
    planId: HexSha256Schema,
    runId: NonBlankStringSchema,
    adapterId: NonBlankStringSchema,
    admittedAtIso: NonBlankStringSchema,
  })
  .strict();

// ─── Inferred types from schemas (B1) ────────────────────────────────────────

export type PlanRefSchemaT = z.infer<typeof PlanRefSchema>;
export type RunContextSchemaT = z.infer<typeof RunContextSchema>;
export type ResolvedRunContextSchemaT = z.infer<typeof ResolvedRunContextSchema>;
export type SignalRequestSchemaT = z.infer<typeof SignalRequestSchema>;
export type RunStatusSnapshotSchemaT = z.infer<typeof RunStatusSnapshotSchema>;
export type EngineRunRefSchemaT = z.infer<typeof EngineRunRefSchema>;

export type ArtifactRefSchemaT = z.infer<typeof ArtifactRefSchema>;
export type StepOutputSchemaT = z.infer<typeof StepOutputSchema>;

export type RunEventWriteSchemaT = z.infer<typeof RunEventWriteSchema>;
export type RunEventRecordSchemaT = z.infer<typeof RunEventRecordSchema>;
export type StepSnapshotSchemaT = z.infer<typeof StepSnapshotSchema>;
export type RunSnapshotSchemaT = z.infer<typeof RunSnapshotSchema>;

export type PlannerSelectionSchemaT = z.infer<typeof PlannerSelectionSchema>;
export type { PlannerPolicyClassSetSchemaT } from './contracts/planner/PlannerPolicyVocabulary.v2.js';
export type PlannerEnvironmentContextSchemaT = z.infer<typeof PlannerEnvironmentContextSchema>;
export type GraphNodeSchemaT = z.infer<typeof GraphNodeSchema>;
export type PlannerGraphSourceV1SchemaT = z.infer<typeof PlannerGraphSourceV1Schema>;
export type DbtManifestRefSchemaT = z.infer<typeof DbtManifestRefSchema>;
export type ExecutionStepV2SchemaT = z.infer<typeof ExecutionStepV2Schema>;
export type PlanCoreSchemaT = z.infer<typeof PlanCoreSchema>;
export type ExecutionPlanSchemaT = z.infer<typeof ExecutionPlanSchema>;
export type PlannerInputEnvelopeV2SchemaT = z.infer<typeof PlannerInputEnvelopeV2Schema>;
export type PlannerBuildResultV2SchemaT = z.infer<typeof PlannerBuildResultV2Schema>;
