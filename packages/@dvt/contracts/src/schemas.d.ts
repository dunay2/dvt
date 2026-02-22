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
import type { RunStatusSnapshot } from './types/contracts';
export declare const ProviderSchema: z.ZodEnum<{
    conductor: "conductor";
    temporal: "temporal";
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
}, z.core.$strip>;
export declare const RunContextSchema: z.ZodObject<{
    tenantId: z.ZodString;
    projectId: z.ZodString;
    environmentId: z.ZodString;
    runId: z.ZodString;
    targetAdapter: z.ZodEnum<{
        conductor: "conductor";
        temporal: "temporal";
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
export declare const RunStatusSnapshotSchema: z.ZodType<RunStatusSnapshot>;
export declare const EngineRunRefSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    provider: z.ZodLiteral<"temporal">;
    namespace: z.ZodString;
    workflowId: z.ZodString;
    runId: z.ZodString;
    taskQueue: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    provider: z.ZodLiteral<"conductor">;
    workflowId: z.ZodString;
    runId: z.ZodString;
    conductorUrl: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    provider: z.ZodLiteral<"mock">;
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
export declare const CanonicalEngineEventSchema: z.ZodObject<{
    runId: z.ZodString;
    runSeq: z.ZodNumber;
    eventId: z.ZodString;
    stepId: z.ZodOptional<z.ZodString>;
    engineAttemptId: z.ZodOptional<z.ZodString>;
    logicalAttemptId: z.ZodOptional<z.ZodString>;
    eventType: z.ZodString;
    eventData: z.ZodUnknown;
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
    logicalAttemptId: z.ZodString;
    engineAttemptId: z.ZodOptional<z.ZodString>;
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
        logicalAttemptId: z.ZodString;
        engineAttemptId: z.ZodOptional<z.ZodString>;
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
//# sourceMappingURL=schemas.d.ts.map