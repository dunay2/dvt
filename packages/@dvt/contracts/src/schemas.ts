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

import {
  RunExecutionContextRefSchema,
  RunExecutionContextSchema,
} from './contracts/engine/RunExecutionContext.v1.js';
import { RunExecutionPolicySchema } from './contracts/engine/RunExecutionPolicy.v1.js';
import type { ExecutionPlan, PlanCore } from './contracts/planner/ExecutionPlan.v1.js';
import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  GENERIC_GRAPH_SOURCE_KIND,
} from './contracts/planner/ExecutionPlan.v1.js';
export { RunExecutionPolicySchema } from './contracts/engine/RunExecutionPolicy.v1.js';
export {
  RunExecutionContextRefSchema,
  RunExecutionContextSchema,
} from './contracts/engine/RunExecutionContext.v1.js';
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
import { CompiledCodeRefSchema, StepArtifactRefSchema } from './step-registry/StepTypeRegistry.js';
import {
  isIsoUtcString,
  isNonBlankString,
  isSha256HexString,
  NON_BLANK_STRING_MESSAGE,
  SHA256_HEX_STRING_MESSAGE,
  STRICT_ISO_UTC_STRING_MESSAGE,
} from './utils/contractPrimitives.js';
import { jcsCanonicalize } from './utils/jcsCanonicalize.js';
import { sha256HexUtf8 } from './utils/sha256HexUtf8.js';

// ─── Primitive schemas ───────────────────────────────────────────────────────

export const ProviderSchema = z.enum(['temporal', 'conductor', 'mock']);
export const TransformationExecutorSchema = z.enum(['postgres', 'dbt']);

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

export const SignalTypeSchema = z.enum(['PAUSE', 'RESUME', 'CANCEL']);

export const StepOutputStatusSchema = z.enum(['SUCCESS', 'FAILED', 'SKIPPED']);
export const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => isNonBlankString(value), {
    message: NON_BLANK_STRING_MESSAGE,
  })
  .brand<'NonBlankString'>();
export const IsoUtcStringSchema = NonBlankStringSchema.refine((value) => isIsoUtcString(value), {
  message: STRICT_ISO_UTC_STRING_MESSAGE,
}).brand<'IsoUtcString'>();
export const Sha256HexStringSchema = NonBlankStringSchema.refine(
  (value) => isSha256HexString(value),
  {
    message: SHA256_HEX_STRING_MESSAGE,
  }
).brand<'Sha256HexString'>();
export const StepIdSchema = NonBlankStringSchema.brand<'StepId'>();

// ─── Core contract schemas ───────────────────────────────────────────────────

export const PlanRefSchema = z.object({
  uri: NonBlankStringSchema,
  sha256: NonBlankStringSchema,
  schemaVersion: NonBlankStringSchema,
  planId: NonBlankStringSchema,
  planVersion: NonBlankStringSchema,
  sizeBytes: z.number().int().nonnegative().optional(),
  expiresAt: IsoUtcStringSchema.optional(),
});

export const RunContextSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
    runId: NonBlankStringSchema,
    targetAdapter: ProviderSchema,
    runExecutionContextRef: RunExecutionContextRefSchema.optional(),
  })
  .strict();

export const ResolvedRunContextSchema = RunContextSchema.extend({
  logicalAttemptId: z.number().int().positive(),
  parentRunId: NonBlankStringSchema.optional(),
  originRunId: NonBlankStringSchema.optional(),
}).strict();

export const SignalRequestSchema = z.object({
  signalId: NonBlankStringSchema,
  type: SignalTypeSchema,
  reason: z.string().optional(),
  requestedAt: IsoUtcStringSchema.optional(),
});

export const RecoverRunCommandSchema = z
  .object({
    sourceRunId: NonBlankStringSchema,
    planRef: PlanRefSchema,
    context: RunContextSchema,
  })
  .superRefine((input, ctx) => {
    if (input.sourceRunId === input.context.runId) {
      ctx.addIssue({
        code: 'custom',
        path: ['context', 'runId'],
        message: 'Recovery runId must differ from sourceRunId',
      });
    }
  })
  .strict();

export const RunFailureEvidenceSchema = z
  .object({
    stepId: StepIdSchema,
    reason: NonBlankStringSchema.optional(),
    message: NonBlankStringSchema.optional(),
    failedAt: IsoUtcStringSchema,
  })
  .strict();

export const RunExecutionEvidenceSchema = z
  .object({
    activeStepId: StepIdSchema.optional(),
    failure: RunFailureEvidenceSchema.optional(),
    materialization: z.lazy(() => MaterializationEvidenceSchema).optional(),
  })
  .strict();

export const RunStatusSnapshotSchema = z.object({
  runId: NonBlankStringSchema,
  status: RunStatusSchema,
  substatus: z
    .union([RunSubstatusSchema, z.string().regex(/^(temporal|conductor|mock)\/.+$/)])
    .optional(),
  message: z.string().optional(),
  startedAt: IsoUtcStringSchema.optional(),
  completedAt: IsoUtcStringSchema.optional(),
  execution: RunExecutionEvidenceSchema.optional(),
});

export const MaterializationEvidenceSchema = z
  .object({
    executor: TransformationExecutorSchema,
    environmentId: NonBlankStringSchema,
    sinkTable: NonBlankStringSchema,
    rowsWritten: z.number().int().nonnegative(),
    startedAt: IsoUtcStringSchema,
    completedAt: IsoUtcStringSchema,
    durationMs: z.number().int().nonnegative(),
  })
  .strict();

export const TransformationFlowRuntimeBindingSchema = z
  .object({
    previewProfile: NonBlankStringSchema,
    executor: TransformationExecutorSchema,
  })
  .strict();

// ─── EngineRunRef (discriminated union) ──────────────────────────────────────

const TemporalRunRefSchema = z.object({
  provider: z.literal('temporal'),
  tenantId: NonBlankStringSchema,
  namespace: NonBlankStringSchema,
  workflowId: NonBlankStringSchema,
  runId: NonBlankStringSchema,
  taskQueue: NonBlankStringSchema.optional(),
});

const ConductorRunRefSchema = z.object({
  provider: z.literal('conductor'),
  tenantId: NonBlankStringSchema,
  workflowId: NonBlankStringSchema,
  runId: NonBlankStringSchema,
  conductorUrl: NonBlankStringSchema,
});

const MockRunRefSchema = z.object({
  provider: z.literal('mock'),
  tenantId: NonBlankStringSchema,
  workflowId: NonBlankStringSchema,
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

// ─── Event schemas (aligned to RunEvents v2.0.2) ─────────────────────────────
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
    stepArtifactRef: StepArtifactRefSchema.optional(),
    compiledCodeRef: CompiledCodeRefSchema.optional(),
  })
  .refine(
    (payload) => payload.stepArtifactRef !== undefined || payload.compiledCodeRef !== undefined,
    {
      message: 'StepStarted payload must contain stepArtifactRef or compiledCodeRef',
    }
  )
  .strict();
const StepCompletedPayloadSchema = z
  .object({
    gatewayDecision: z.boolean().optional(),
    resultEvidence: MaterializationEvidenceSchema.optional(),
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
    resultEvidence: MaterializationEvidenceSchema.optional(),
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

export const GenericGraphNodeV1Schema = z
  .object({
    nodeId: z.string().min(1),
    stepKind: z.string().min(1),
    dependsOn: z.array(z.string().min(1)),
    stepTypeConfig: z.record(z.string(), z.unknown()).optional(),
    metadata: z
      .object({
        displayName: z.string().min(1).optional(),
        sourceRef: z.string().min(1).optional(),
        tags: z.record(z.string(), z.string()).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const GenericGraphSourceV1Schema = z
  .object({
    kind: z.literal(GENERIC_GRAPH_SOURCE_KIND),
    sourceFamily: z.string().min(1),
    sourceVersion: z.string().min(1),
    nodes: z.array(GenericGraphNodeV1Schema).min(1),
  })
  .superRefine((graphSource, ctx) => {
    const nodeIds = new Set<string>();
    for (const [index, node] of graphSource.nodes.entries()) {
      if (nodeIds.has(node.nodeId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['nodes', index, 'nodeId'],
          message: `Duplicate nodeId: ${node.nodeId}`,
        });
      }
      nodeIds.add(node.nodeId);
    }

    for (const [index, node] of graphSource.nodes.entries()) {
      for (const [depIndex, dep] of node.dependsOn.entries()) {
        if (!nodeIds.has(dep)) {
          ctx.addIssue({
            code: 'custom',
            path: ['nodes', index, 'dependsOn', depIndex],
            message: `Node ${node.nodeId} dependsOn missing node: ${dep}`,
          });
        }
      }
    }
  })
  .strict();

export const DbtManifestRefSchema = z
  .object({
    uri: z
      .string()
      .min(1)
      .regex(/^[a-z][a-z0-9+.-]*:\/\//i, 'uri must be an absolute URI'),
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
export const ExecutionStepV1Schema = z
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
    steps: z.array(ExecutionStepV1Schema),
  })
  .strict();

const CurrentExecutionPlanV1Schema = CurrentPlanCoreSchema.extend({
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
    })
    .strict(),
  observability: ExecutionPlanObservabilitySchema,
}).strict();

export const PLAN_CORE_VERSIONED_SCHEMAS = {
  [CURRENT_EXECUTION_PLAN_VERSION]: CurrentPlanCoreSchema,
} as const;

export const EXECUTION_PLAN_VERSIONED_SCHEMAS = {
  [CURRENT_EXECUTION_PLAN_VERSION]: CurrentExecutionPlanV1Schema,
} as const;

export const PlanCoreSchema = CurrentPlanCoreSchema as z.ZodType<PlanCore>;

export const ExecutionPlanSchema = CurrentExecutionPlanV1Schema as z.ZodType<ExecutionPlan>;

export const PlannerInputEnvelopeV1Schema = z
  .object({
    graphSource: GenericGraphSourceV1Schema.optional(),
    manifestRef: DbtManifestRefSchema.optional(),
    selection: PlannerSelectionSchema,
    policies: PlannerPolicyClassSetSchema.optional(),
    environment: PlannerEnvironmentContextSchema.optional(),
    observability: ExecutionPlanObservabilitySchema,
    requestedBy: z.string().min(1).optional(),
    requestId: z.string().min(1).optional(),
    requestedAtIso: z.string().min(1).optional(),
  })
  .superRefine((input, ctx) => {
    const activeSources = [input.graphSource, input.manifestRef].filter(
      (value) => value !== undefined
    ).length;

    if (activeSources !== 1) {
      ctx.addIssue({
        code: 'custom',
        message:
          'PlannerInputEnvelopeV1 requires exactly one active source: graphSource or manifestRef.',
      });
    }
  })
  .strict();

export const PlannerBuildResultV1Schema = z
  .object({
    plan: ExecutionPlanSchema,
    executionPolicy: RunExecutionPolicySchema,
    canonicalPlanCoreJson: NonBlankStringSchema,
  })
  .strict()
  .superRefine((result, ctx) => {
    let canonicalPlanCoreInput: unknown;

    try {
      canonicalPlanCoreInput = JSON.parse(result.canonicalPlanCoreJson);
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: ['canonicalPlanCoreJson'],
        message: 'canonicalPlanCoreJson must contain valid JSON',
      });
      return;
    }

    const canonicalPlanCoreResult = PlanCoreSchema.safeParse(canonicalPlanCoreInput);
    if (!canonicalPlanCoreResult.success) {
      for (const issue of canonicalPlanCoreResult.error.issues) {
        ctx.addIssue({
          code: 'custom',
          path: ['canonicalPlanCoreJson', ...issue.path],
          message: issue.message,
        });
      }
      return;
    }

    const expectedPlanCore = {
      metadata: {
        planVersion: result.plan.metadata.planVersion,
        inputHashSha256: result.plan.metadata.inputHashSha256,
      },
      steps: result.plan.steps,
    } satisfies PlanCore;
    const expectedCanonicalPlanCoreJson = jcsCanonicalize(expectedPlanCore);

    if (result.canonicalPlanCoreJson !== expectedCanonicalPlanCoreJson) {
      ctx.addIssue({
        code: 'custom',
        path: ['canonicalPlanCoreJson'],
        message:
          'canonicalPlanCoreJson must equal JCS(planCore) derived from plan.metadata.{planVersion,inputHashSha256} and plan.steps',
      });
      return;
    }

    if (sha256HexUtf8(result.canonicalPlanCoreJson) !== result.plan.metadata.planId.toLowerCase()) {
      ctx.addIssue({
        code: 'custom',
        path: ['plan', 'metadata', 'planId'],
        message: 'plan.metadata.planId must match sha256(canonicalPlanCoreJson)',
      });
    }
  });

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

    const canonicalPlan = canonicalPlanResult.data;
    const expectedCanonicalPlanJson = jcsCanonicalize(canonicalPlan);
    if (record.canonicalPlanJson !== expectedCanonicalPlanJson) {
      ctx.addIssue({
        code: 'custom',
        path: ['canonicalPlanJson'],
        message: 'canonicalPlanJson must equal JCS(canonical ExecutionPlan)',
      });
      return;
    }

    if (record.canonicalHash !== sha256HexUtf8(record.canonicalPlanJson)) {
      ctx.addIssue({
        code: 'custom',
        path: ['canonicalHash'],
        message: 'canonicalHash must match sha256(canonicalPlanJson)',
      });
    }

    const canonicalMetadata = canonicalPlan.metadata;
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
export type RunExecutionPolicySchemaT = z.infer<typeof RunExecutionPolicySchema>;
export type RunExecutionContextRefSchemaT = z.infer<typeof RunExecutionContextRefSchema>;
export type RunExecutionContextSchemaT = z.infer<typeof RunExecutionContextSchema>;
export type RunContextSchemaT = z.infer<typeof RunContextSchema>;
export type ResolvedRunContextSchemaT = z.infer<typeof ResolvedRunContextSchema>;
export type SignalRequestSchemaT = z.infer<typeof SignalRequestSchema>;
export type RecoverRunCommandSchemaT = z.infer<typeof RecoverRunCommandSchema>;
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
export type GenericGraphNodeV1SchemaT = z.infer<typeof GenericGraphNodeV1Schema>;
export type GenericGraphSourceV1SchemaT = z.infer<typeof GenericGraphSourceV1Schema>;
export type DbtManifestRefSchemaT = z.infer<typeof DbtManifestRefSchema>;
export type ExecutionStepV1SchemaT = z.infer<typeof ExecutionStepV1Schema>;
export type PlanCoreSchemaT = z.infer<typeof PlanCoreSchema>;
export type ExecutionPlanSchemaT = z.infer<typeof ExecutionPlanSchema>;
export type PlannerInputEnvelopeV1SchemaT = z.infer<typeof PlannerInputEnvelopeV1Schema>;
export type PlannerBuildResultV1SchemaT = z.infer<typeof PlannerBuildResultV1Schema>;
