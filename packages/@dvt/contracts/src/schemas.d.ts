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
export declare const ProviderSchema: z.ZodEnum<{
    temporal: "temporal";
    conductor: "conductor";
    mock: "mock";
}>;
export declare const RunStatusSchema: z.ZodEnum<{
    PENDING: "PENDING";
    APPROVED: "APPROVED";
    RUNNING: "RUNNING";
    PAUSED: "PAUSED";
    COMPLETED: "COMPLETED";
    FAILED: "FAILED";
    CANCELLED: "CANCELLED";
}>;
export declare const RunSubstatusSchema: z.ZodEnum<{
    DRAINING: "DRAINING";
    RETRYING: "RETRYING";
    CONTINUE_AS_NEW: "CONTINUE_AS_NEW";
    WAITING_APPROVAL: "WAITING_APPROVAL";
    RECOVERING: "RECOVERING";
    CANCELLING: "CANCELLING";
}>;
export declare const StepStatusSchema: z.ZodEnum<{
    PENDING: "PENDING";
    RUNNING: "RUNNING";
    FAILED: "FAILED";
    SUCCESS: "SUCCESS";
    SKIPPED: "SKIPPED";
}>;
export declare const SignalTypeSchema: z.ZodEnum<{
    PAUSE: "PAUSE";
    RESUME: "RESUME";
    CANCEL: "CANCEL";
    RETRY_STEP: "RETRY_STEP";
    RETRY_RUN: "RETRY_RUN";
}>;
export declare const StepOutputStatusSchema: z.ZodEnum<{
    FAILED: "FAILED";
    SUCCESS: "SUCCESS";
    SKIPPED: "SKIPPED";
}>;
export declare const PlanRefSchema: z.ZodObject<{
    uri: z.ZodString;
    sha256: z.ZodString;
    schemaVersion: z.ZodString;
    planId: z.ZodString;
    planVersion: z.ZodString;
    sizeBytes: z.ZodOptional<z.ZodNumber>;
    expiresAt: z.ZodOptional<z.ZodString>;
    requiresCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const RunContextSchema: z.ZodObject<{
    tenantId: z.ZodString;
    projectId: z.ZodString;
    environmentId: z.ZodString;
    runId: z.ZodString;
    targetAdapter: z.ZodEnum<{
        temporal: "temporal";
        conductor: "conductor";
        mock: "mock";
    }>;
}, z.core.$strip>;
export declare const SignalRequestSchema: z.ZodObject<{
    signalId: z.ZodString;
    type: z.ZodEnum<{
        PAUSE: "PAUSE";
        RESUME: "RESUME";
        CANCEL: "CANCEL";
        RETRY_STEP: "RETRY_STEP";
        RETRY_RUN: "RETRY_RUN";
    }>;
    stepId: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    requestedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const RunStatusSnapshotSchema: z.ZodObject<{
    runId: z.ZodString;
    status: z.ZodEnum<{
        PENDING: "PENDING";
        APPROVED: "APPROVED";
        RUNNING: "RUNNING";
        PAUSED: "PAUSED";
        COMPLETED: "COMPLETED";
        FAILED: "FAILED";
        CANCELLED: "CANCELLED";
    }>;
    substatus: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
        DRAINING: "DRAINING";
        RETRYING: "RETRYING";
        CONTINUE_AS_NEW: "CONTINUE_AS_NEW";
        WAITING_APPROVAL: "WAITING_APPROVAL";
        RECOVERING: "RECOVERING";
        CANCELLING: "CANCELLING";
    }>, z.ZodString]>>;
    message: z.ZodOptional<z.ZodString>;
    startedAt: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
    hash: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const EngineRunRefSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    provider: z.ZodLiteral<"temporal">;
    tenantId: z.ZodString;
    namespace: z.ZodString;
    workflowId: z.ZodString;
    runId: z.ZodString;
    taskQueue: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    provider: z.ZodLiteral<"conductor">;
    tenantId: z.ZodString;
    workflowId: z.ZodString;
    runId: z.ZodString;
    conductorUrl: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    provider: z.ZodLiteral<"mock">;
    tenantId: z.ZodString;
    workflowId: z.ZodString;
    runId: z.ZodString;
}, z.core.$strip>], "provider">;
export declare const ArtifactRefSchema: z.ZodObject<{
    uri: z.ZodString;
    kind: z.ZodString;
    sha256: z.ZodOptional<z.ZodString>;
    sizeBytes: z.ZodOptional<z.ZodNumber>;
    expiresAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const StepErrorSchema: z.ZodObject<{
    category: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    message: z.ZodString;
    retryable: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const StepOutputSchema: z.ZodObject<{
    status: z.ZodEnum<{
        FAILED: "FAILED";
        SUCCESS: "SUCCESS";
        SKIPPED: "SKIPPED";
    }>;
    artifactRefs: z.ZodArray<z.ZodObject<{
        uri: z.ZodString;
        kind: z.ZodString;
        sha256: z.ZodOptional<z.ZodString>;
        sizeBytes: z.ZodOptional<z.ZodNumber>;
        expiresAt: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    error: z.ZodOptional<z.ZodObject<{
        category: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
        message: z.ZodString;
        retryable: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/** Write-side event envelope: what the engine/adapter emits before persistence. */
export declare const RunEventWriteSchema: z.ZodObject<{
    eventId: z.ZodString;
    eventType: z.ZodString;
    emittedAt: z.ZodString;
    runId: z.ZodString;
    tenantId: z.ZodString;
    projectId: z.ZodString;
    environmentId: z.ZodString;
    planId: z.ZodString;
    planVersion: z.ZodString;
    engineAttemptId: z.ZodNumber;
    logicalAttemptId: z.ZodNumber;
    idempotencyKey: z.ZodString;
    stepId: z.ZodOptional<z.ZodString>;
    payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
/** Persisted event record: extends RunEventWrite with Append Authority fields. */
export declare const RunEventRecordSchema: z.ZodObject<{
    eventId: z.ZodString;
    eventType: z.ZodString;
    emittedAt: z.ZodString;
    runId: z.ZodString;
    tenantId: z.ZodString;
    projectId: z.ZodString;
    environmentId: z.ZodString;
    planId: z.ZodString;
    planVersion: z.ZodString;
    engineAttemptId: z.ZodNumber;
    logicalAttemptId: z.ZodNumber;
    idempotencyKey: z.ZodString;
    stepId: z.ZodOptional<z.ZodString>;
    payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    runSeq: z.ZodNumber;
    persistedAt: z.ZodString;
}, z.core.$strip>;
/**
 * @deprecated Use RunEventWriteSchema / RunEventRecordSchema.
 * Kept for backward compatibility with v1 consumers.
 * The v1 CanonicalEngineEvent used `eventData` (now `payload`),
 * optional string attempt IDs (now required numbers), and extra
 * fields not in the normative v2.0 contract.
 */
export declare const CanonicalEngineEventSchema: z.ZodObject<{
    runId: z.ZodString;
    runSeq: z.ZodNumber;
    eventId: z.ZodString;
    stepId: z.ZodOptional<z.ZodString>;
    engineAttemptId: z.ZodOptional<z.ZodNumber>;
    logicalAttemptId: z.ZodOptional<z.ZodNumber>;
    eventType: z.ZodString;
    eventData: z.ZodOptional<z.ZodUnknown>;
    payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    idempotencyKey: z.ZodString;
    emittedAt: z.ZodString;
    persistedAt: z.ZodOptional<z.ZodString>;
    adapterVersion: z.ZodOptional<z.ZodString>;
    engineRunRef: z.ZodOptional<z.ZodUnknown>;
    causedBySignalId: z.ZodOptional<z.ZodString>;
    parentEventId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const StepSnapshotSchema: z.ZodObject<{
    stepId: z.ZodString;
    status: z.ZodEnum<{
        PENDING: "PENDING";
        RUNNING: "RUNNING";
        FAILED: "FAILED";
        SUCCESS: "SUCCESS";
        SKIPPED: "SKIPPED";
    }>;
    logicalAttemptId: z.ZodNumber;
    engineAttemptId: z.ZodOptional<z.ZodNumber>;
    startedAt: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
    artifacts: z.ZodArray<z.ZodUnknown>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        retryable: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const RunSnapshotSchema: z.ZodObject<{
    runId: z.ZodString;
    status: z.ZodString;
    lastEventSeq: z.ZodNumber;
    steps: z.ZodArray<z.ZodObject<{
        stepId: z.ZodString;
        status: z.ZodEnum<{
            PENDING: "PENDING";
            RUNNING: "RUNNING";
            FAILED: "FAILED";
            SUCCESS: "SUCCESS";
            SKIPPED: "SKIPPED";
        }>;
        logicalAttemptId: z.ZodNumber;
        engineAttemptId: z.ZodOptional<z.ZodNumber>;
        startedAt: z.ZodOptional<z.ZodString>;
        completedAt: z.ZodOptional<z.ZodString>;
        artifacts: z.ZodArray<z.ZodUnknown>;
        error: z.ZodOptional<z.ZodObject<{
            code: z.ZodString;
            message: z.ZodString;
            retryable: z.ZodBoolean;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    artifacts: z.ZodArray<z.ZodUnknown>;
    startedAt: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
    totalDurationMs: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const ExecuteStepRequestSchema: z.ZodObject<{
    tenantId: z.ZodString;
    planId: z.ZodString;
    runId: z.ZodString;
    stepId: z.ZodString;
    stepType: z.ZodString;
    stepData: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const ExecuteStepResultSchema: z.ZodObject<{
    runId: z.ZodString;
    stepId: z.ZodString;
    status: z.ZodString;
    output: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        retryable: z.ZodBoolean;
    }, z.core.$strip>>;
    duration: z.ZodNumber;
    executedAt: z.ZodNumber;
}, z.core.$strip>;
export declare const PlannerSelectionSchema: z.ZodObject<{
    selectedNodeIds: z.ZodArray<z.ZodString>;
    includeUpstream: z.ZodOptional<z.ZodBoolean>;
    includeDownstream: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export declare const PlannerPoliciesSchema: z.ZodObject<{
    stepTimeoutMs: z.ZodOptional<z.ZodNumber>;
    retries: z.ZodOptional<z.ZodObject<{
        maxAttempts: z.ZodNumber;
        backoffMs: z.ZodNumber;
    }, z.core.$strict>>;
    concurrency: z.ZodOptional<z.ZodObject<{
        maxInFlight: z.ZodNumber;
    }, z.core.$strict>>;
    gatewayDslVersion: z.ZodOptional<z.ZodString>;
    custom: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strict>;
export declare const PlannerEnvironmentContextSchema: z.ZodObject<{
    environmentId: z.ZodOptional<z.ZodString>;
    targetProfile: z.ZodOptional<z.ZodString>;
    vars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strict>;
export declare const GraphNodeSchema: z.ZodObject<{
    nodeId: z.ZodString;
    resourceType: z.ZodString;
    dependsOn: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const DbtManifestRefSchema: z.ZodObject<{
    uri: z.ZodString;
    sha256: z.ZodOptional<z.ZodString>;
    artifactId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const ExecutionStepV2Schema: z.ZodObject<{
    stepId: z.ZodString;
    kind: z.ZodString;
    dependsOn: z.ZodArray<z.ZodString>;
    stepTypeConfig: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strict>;
export declare const PlanCoreSchema: z.ZodObject<{
    metadata: z.ZodObject<{
        planVersion: z.ZodLiteral<"2.3">;
        inputHashSha256: z.ZodString;
    }, z.core.$strict>;
    steps: z.ZodArray<z.ZodObject<{
        stepId: z.ZodString;
        kind: z.ZodString;
        dependsOn: z.ZodArray<z.ZodString>;
        stepTypeConfig: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const ExecutionPlanV2Schema: z.ZodObject<{
    steps: z.ZodArray<z.ZodObject<{
        stepId: z.ZodString;
        kind: z.ZodString;
        dependsOn: z.ZodArray<z.ZodString>;
        stepTypeConfig: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strict>>;
    metadata: z.ZodObject<{
        planVersion: z.ZodLiteral<"2.3">;
        inputHashSha256: z.ZodString;
        planId: z.ZodString;
        createdAtIso: z.ZodString;
    }, z.core.$strict>;
    observability: z.ZodOptional<z.ZodObject<{
        tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        extra: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$catchall<z.ZodUnknown>>>;
}, z.core.$strict>;
export declare const PlannerInputEnvelopeV2Schema: z.ZodObject<{
    manifest: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    manifestRef: z.ZodOptional<z.ZodObject<{
        uri: z.ZodString;
        sha256: z.ZodOptional<z.ZodString>;
        artifactId: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    nodes: z.ZodArray<z.ZodObject<{
        nodeId: z.ZodString;
        resourceType: z.ZodString;
        dependsOn: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    selection: z.ZodObject<{
        selectedNodeIds: z.ZodArray<z.ZodString>;
        includeUpstream: z.ZodOptional<z.ZodBoolean>;
        includeDownstream: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>;
    policies: z.ZodOptional<z.ZodObject<{
        stepTimeoutMs: z.ZodOptional<z.ZodNumber>;
        retries: z.ZodOptional<z.ZodObject<{
            maxAttempts: z.ZodNumber;
            backoffMs: z.ZodNumber;
        }, z.core.$strict>>;
        concurrency: z.ZodOptional<z.ZodObject<{
            maxInFlight: z.ZodNumber;
        }, z.core.$strict>>;
        gatewayDslVersion: z.ZodOptional<z.ZodString>;
        custom: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strict>>;
    environment: z.ZodOptional<z.ZodObject<{
        environmentId: z.ZodOptional<z.ZodString>;
        targetProfile: z.ZodOptional<z.ZodString>;
        vars: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strict>>;
    observability: z.ZodOptional<z.ZodObject<{
        tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        extra: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$catchall<z.ZodUnknown>>>;
    requestedBy: z.ZodOptional<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
    requestedAtIso: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const PlannerBuildResultV2Schema: z.ZodObject<{
    plan: z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            stepId: z.ZodString;
            kind: z.ZodString;
            dependsOn: z.ZodArray<z.ZodString>;
            stepTypeConfig: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strict>>;
        metadata: z.ZodObject<{
            planVersion: z.ZodLiteral<"2.3">;
            inputHashSha256: z.ZodString;
            planId: z.ZodString;
            createdAtIso: z.ZodString;
        }, z.core.$strict>;
        observability: z.ZodOptional<z.ZodObject<{
            tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            extra: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$catchall<z.ZodUnknown>>>;
    }, z.core.$strict>;
    canonicalPlanJson: z.ZodString;
}, z.core.$strict>;
export type PlanRefSchemaT = z.infer<typeof PlanRefSchema>;
export type RunContextSchemaT = z.infer<typeof RunContextSchema>;
export type SignalRequestSchemaT = z.infer<typeof SignalRequestSchema>;
export type RunStatusSnapshotSchemaT = z.infer<typeof RunStatusSnapshotSchema>;
export type EngineRunRefSchemaT = z.infer<typeof EngineRunRefSchema>;
export type ArtifactRefSchemaT = z.infer<typeof ArtifactRefSchema>;
export type StepOutputSchemaT = z.infer<typeof StepOutputSchema>;
export type RunEventWriteSchemaT = z.infer<typeof RunEventWriteSchema>;
export type RunEventRecordSchemaT = z.infer<typeof RunEventRecordSchema>;
/** @deprecated Use RunEventWriteSchemaT / RunEventRecordSchemaT */
export type CanonicalEngineEventSchemaT = z.infer<typeof CanonicalEngineEventSchema>;
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
//# sourceMappingURL=schemas.d.ts.map