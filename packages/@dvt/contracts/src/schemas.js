"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlannerBuildResultV2Schema = exports.PlannerInputEnvelopeV2Schema = exports.ExecutionPlanV2Schema = exports.PlanCoreSchema = exports.ExecutionStepV2Schema = exports.DbtManifestRefSchema = exports.GraphNodeSchema = exports.PlannerEnvironmentContextSchema = exports.PlannerPoliciesSchema = exports.PlannerSelectionSchema = exports.ExecuteStepResultSchema = exports.ExecuteStepRequestSchema = exports.RunSnapshotSchema = exports.StepSnapshotSchema = exports.CanonicalEngineEventSchema = exports.RunEventRecordSchema = exports.RunEventWriteSchema = exports.StepOutputSchema = exports.StepErrorSchema = exports.ArtifactRefSchema = exports.EngineRunRefSchema = exports.RunStatusSnapshotSchema = exports.SignalRequestSchema = exports.RunContextSchema = exports.PlanRefSchema = exports.StepOutputStatusSchema = exports.SignalTypeSchema = exports.StepStatusSchema = exports.RunSubstatusSchema = exports.RunStatusSchema = exports.ProviderSchema = void 0;
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
const zod_1 = require("zod");
// ─── Primitive schemas ───────────────────────────────────────────────────────
exports.ProviderSchema = zod_1.z.enum(['temporal', 'conductor', 'mock']);
exports.RunStatusSchema = zod_1.z.enum([
    'PENDING',
    'APPROVED',
    'RUNNING',
    'PAUSED',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
]);
exports.RunSubstatusSchema = zod_1.z.enum([
    'DRAINING',
    'RETRYING',
    'CONTINUE_AS_NEW',
    'WAITING_APPROVAL',
    'RECOVERING',
    'CANCELLING',
]);
exports.StepStatusSchema = zod_1.z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED']);
exports.SignalTypeSchema = zod_1.z.enum(['PAUSE', 'RESUME', 'CANCEL', 'RETRY_STEP', 'RETRY_RUN']);
exports.StepOutputStatusSchema = zod_1.z.enum(['SUCCESS', 'FAILED', 'SKIPPED']);
// ─── Core contract schemas ───────────────────────────────────────────────────
exports.PlanRefSchema = zod_1.z.object({
    uri: zod_1.z.string().min(1),
    sha256: zod_1.z.string().min(1),
    schemaVersion: zod_1.z.string().min(1),
    planId: zod_1.z.string().min(1),
    planVersion: zod_1.z.string().min(1),
    sizeBytes: zod_1.z.number().int().nonnegative().optional(),
    expiresAt: zod_1.z.string().optional(),
    requiresCapabilities: zod_1.z.array(zod_1.z.string().min(1)).optional(),
});
exports.RunContextSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    projectId: zod_1.z.string().min(1),
    environmentId: zod_1.z.string().min(1),
    runId: zod_1.z.string().min(1),
    targetAdapter: exports.ProviderSchema,
});
exports.SignalRequestSchema = zod_1.z.object({
    signalId: zod_1.z.string().min(1),
    type: exports.SignalTypeSchema,
    stepId: zod_1.z.string().optional(),
    reason: zod_1.z.string().optional(),
    requestedAt: zod_1.z.string().optional(),
});
exports.RunStatusSnapshotSchema = zod_1.z.object({
    runId: zod_1.z.string().min(1),
    status: exports.RunStatusSchema,
    substatus: zod_1.z
        .union([exports.RunSubstatusSchema, zod_1.z.string().regex(/^(temporal|conductor|mock)\/.+$/)])
        .optional(),
    message: zod_1.z.string().optional(),
    startedAt: zod_1.z.string().optional(),
    completedAt: zod_1.z.string().optional(),
    hash: zod_1.z.string().optional(),
});
// ─── EngineRunRef (discriminated union) ──────────────────────────────────────
const TemporalRunRefSchema = zod_1.z.object({
    provider: zod_1.z.literal('temporal'),
    tenantId: zod_1.z.string().min(1),
    namespace: zod_1.z.string().min(1),
    workflowId: zod_1.z.string().min(1),
    runId: zod_1.z.string().min(1),
    taskQueue: zod_1.z.string().optional(),
});
const ConductorRunRefSchema = zod_1.z.object({
    provider: zod_1.z.literal('conductor'),
    tenantId: zod_1.z.string().min(1),
    workflowId: zod_1.z.string().min(1),
    runId: zod_1.z.string().min(1),
    conductorUrl: zod_1.z.string().min(1),
});
const MockRunRefSchema = zod_1.z.object({
    provider: zod_1.z.literal('mock'),
    tenantId: zod_1.z.string().min(1),
    workflowId: zod_1.z.string().min(1),
    runId: zod_1.z.string().min(1),
});
exports.EngineRunRefSchema = zod_1.z.discriminatedUnion('provider', [
    TemporalRunRefSchema,
    ConductorRunRefSchema,
    MockRunRefSchema,
]);
// ─── Artifact schemas ────────────────────────────────────────────────────────
exports.ArtifactRefSchema = zod_1.z.object({
    uri: zod_1.z.string().min(1),
    kind: zod_1.z.string().min(1),
    sha256: zod_1.z.string().optional(),
    sizeBytes: zod_1.z.number().int().nonnegative().optional(),
    expiresAt: zod_1.z.string().optional(),
});
exports.StepErrorSchema = zod_1.z.object({
    category: zod_1.z.string().min(1),
    code: zod_1.z.string().optional(),
    message: zod_1.z.string().min(1),
    retryable: zod_1.z.boolean().optional(),
});
exports.StepOutputSchema = zod_1.z.object({
    status: exports.StepOutputStatusSchema,
    artifactRefs: zod_1.z.array(exports.ArtifactRefSchema),
    error: exports.StepErrorSchema.optional(),
});
// ─── Event schemas (aligned to RunEvents v2.0.1) ─────────────────────────────
// @see specs/contracts/engine/RunEvents.v2.0.md — Normative event contract
/** Write-side event envelope: what the engine/adapter emits before persistence. */
exports.RunEventWriteSchema = zod_1.z.object({
    eventId: zod_1.z.string().min(1),
    eventType: zod_1.z.string().min(1),
    emittedAt: zod_1.z.string().min(1),
    runId: zod_1.z.string().min(1),
    tenantId: zod_1.z.string().min(1),
    projectId: zod_1.z.string().min(1),
    environmentId: zod_1.z.string().min(1),
    planId: zod_1.z.string().min(1),
    planVersion: zod_1.z.string().min(1),
    engineAttemptId: zod_1.z.number().int().positive(),
    logicalAttemptId: zod_1.z.number().int().positive(),
    idempotencyKey: zod_1.z.string().min(1),
    stepId: zod_1.z.string().min(1).optional(),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
/** Persisted event record: extends RunEventWrite with Append Authority fields. */
exports.RunEventRecordSchema = exports.RunEventWriteSchema.extend({
    runSeq: zod_1.z.number().int().positive(),
    persistedAt: zod_1.z.string().min(1),
});
/**
 * @deprecated Use RunEventWriteSchema / RunEventRecordSchema.
 * Kept for backward compatibility with v1 consumers.
 * The v1 CanonicalEngineEvent used `eventData` (now `payload`),
 * optional string attempt IDs (now required numbers), and extra
 * fields not in the normative v2.0 contract.
 */
exports.CanonicalEngineEventSchema = zod_1.z.object({
    runId: zod_1.z.string().min(1),
    runSeq: zod_1.z.number().int().nonnegative(),
    eventId: zod_1.z.string().min(1),
    stepId: zod_1.z.string().optional(),
    engineAttemptId: zod_1.z.number().int().positive().optional(),
    logicalAttemptId: zod_1.z.number().int().positive().optional(),
    eventType: zod_1.z.string().min(1),
    eventData: zod_1.z.unknown().optional(),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    idempotencyKey: zod_1.z.string().min(1),
    emittedAt: zod_1.z.string().min(1),
    persistedAt: zod_1.z.string().optional(),
    adapterVersion: zod_1.z.string().optional(),
    engineRunRef: zod_1.z.unknown().optional(),
    causedBySignalId: zod_1.z.string().optional(),
    parentEventId: zod_1.z.string().optional(),
});
exports.StepSnapshotSchema = zod_1.z.object({
    stepId: zod_1.z.string().min(1),
    status: exports.StepStatusSchema,
    logicalAttemptId: zod_1.z.number().int().positive(),
    engineAttemptId: zod_1.z.number().int().positive().optional(),
    startedAt: zod_1.z.string().optional(),
    completedAt: zod_1.z.string().optional(),
    artifacts: zod_1.z.array(zod_1.z.unknown()),
    error: zod_1.z
        .object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        retryable: zod_1.z.boolean(),
    })
        .optional(),
});
exports.RunSnapshotSchema = zod_1.z.object({
    runId: zod_1.z.string().min(1),
    status: zod_1.z.string().min(1),
    lastEventSeq: zod_1.z.number().int().nonnegative(),
    steps: zod_1.z.array(exports.StepSnapshotSchema),
    artifacts: zod_1.z.array(zod_1.z.unknown()),
    startedAt: zod_1.z.string().optional(),
    completedAt: zod_1.z.string().optional(),
    totalDurationMs: zod_1.z.number().nonnegative().optional(),
});
// ─── Adapter request/response schemas ────────────────────────────────────────
exports.ExecuteStepRequestSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    planId: zod_1.z.string().min(1),
    runId: zod_1.z.string().min(1),
    stepId: zod_1.z.string().min(1),
    stepType: zod_1.z.string().min(1),
    stepData: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    idempotencyKey: zod_1.z.string().optional(),
    timeout: zod_1.z.number().int().positive().optional(),
});
exports.ExecuteStepResultSchema = zod_1.z.object({
    runId: zod_1.z.string().min(1),
    stepId: zod_1.z.string().min(1),
    status: zod_1.z.string().min(1),
    output: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    error: zod_1.z
        .object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        retryable: zod_1.z.boolean(),
    })
        .optional(),
    duration: zod_1.z.number().nonnegative(),
    executedAt: zod_1.z.number(),
});
// ─── Planner schemas (GAP-P0-02) ─────────────────────────────────────────────
// @see specs/contracts/engine/ExecutionPlan.v1.md — Normative prose contract
// @see specs/contracts/engine/ExecutionPlan.v1.schema.json — JSON Schema (draft 2020-12)
const HexSha256Schema = zod_1.z.string().regex(/^[a-f0-9]{64}$/);
exports.PlannerSelectionSchema = zod_1.z
    .object({
    selectedNodeIds: zod_1.z.array(zod_1.z.string().min(1)),
    includeUpstream: zod_1.z.boolean().optional(),
    includeDownstream: zod_1.z.boolean().optional(),
})
    .strict();
exports.PlannerPoliciesSchema = zod_1.z
    .object({
    stepTimeoutMs: zod_1.z.number().positive().optional(),
    retries: zod_1.z
        .object({
        maxAttempts: zod_1.z.number().int().positive(),
        backoffMs: zod_1.z.number().nonnegative(),
    })
        .strict()
        .optional(),
    concurrency: zod_1.z
        .object({
        maxInFlight: zod_1.z.number().int().positive(),
    })
        .strict()
        .optional(),
    gatewayDslVersion: zod_1.z.string().min(1).optional(),
    custom: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
})
    .strict();
exports.PlannerEnvironmentContextSchema = zod_1.z
    .object({
    environmentId: zod_1.z.string().min(1).optional(),
    targetProfile: zod_1.z.string().min(1).optional(),
    vars: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
})
    .strict();
exports.GraphNodeSchema = zod_1.z
    .object({
    nodeId: zod_1.z.string().min(1),
    resourceType: zod_1.z.string().min(1),
    dependsOn: zod_1.z.array(zod_1.z.string().min(1)),
})
    .strict();
exports.DbtManifestRefSchema = zod_1.z
    .object({
    uri: zod_1.z.string().min(1),
    sha256: HexSha256Schema.optional(),
    artifactId: zod_1.z.string().min(1).optional(),
})
    .strict();
exports.ExecutionStepV2Schema = zod_1.z
    .object({
    stepId: zod_1.z.string().min(1),
    kind: zod_1.z.string().min(1),
    dependsOn: zod_1.z.array(zod_1.z.string().min(1)),
    stepTypeConfig: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
})
    .strict();
exports.PlanCoreSchema = zod_1.z
    .object({
    metadata: zod_1.z
        .object({
        planVersion: zod_1.z.literal('2.3'),
        inputHashSha256: HexSha256Schema,
    })
        .strict(),
    steps: zod_1.z.array(exports.ExecutionStepV2Schema),
})
    .strict();
exports.ExecutionPlanV2Schema = exports.PlanCoreSchema.extend({
    metadata: zod_1.z
        .object({
        planVersion: zod_1.z.literal('2.3'),
        inputHashSha256: HexSha256Schema,
        planId: HexSha256Schema,
        createdAtIso: zod_1.z.string().min(1),
    })
        .strict(),
    observability: zod_1.z
        .object({
        tags: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
        extra: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    })
        .catchall(zod_1.z.unknown())
        .optional(),
}).strict();
exports.PlannerInputEnvelopeV2Schema = zod_1.z
    .object({
    manifest: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    manifestRef: exports.DbtManifestRefSchema.optional(),
    nodes: zod_1.z.array(exports.GraphNodeSchema),
    selection: exports.PlannerSelectionSchema,
    policies: exports.PlannerPoliciesSchema.optional(),
    environment: exports.PlannerEnvironmentContextSchema.optional(),
    observability: exports.ExecutionPlanV2Schema.shape.observability,
    requestedBy: zod_1.z.string().min(1).optional(),
    requestId: zod_1.z.string().min(1).optional(),
    requestedAtIso: zod_1.z.string().min(1).optional(),
})
    .strict();
exports.PlannerBuildResultV2Schema = zod_1.z
    .object({
    plan: exports.ExecutionPlanV2Schema,
    canonicalPlanJson: zod_1.z.string().min(1),
})
    .strict();
//# sourceMappingURL=schemas.js.map