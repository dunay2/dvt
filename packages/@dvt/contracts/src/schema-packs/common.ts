import { z } from 'zod';

import {
  RunExecutionContextRefSchema,
  RunExecutionContextSchema,
} from '../contracts/engine/RunExecutionContext.v1.js';
import { RunExecutionPolicySchema } from '../contracts/engine/RunExecutionPolicy.v1.js';
import type { PlanRef } from '../types/contracts.js';
import {
  isIsoUtcString,
  isNonBlankString,
  isSha256HexString,
  NON_BLANK_STRING_MESSAGE,
  SHA256_HEX_STRING_MESSAGE,
  STRICT_ISO_UTC_STRING_MESSAGE,
} from '../utils/contractPrimitives.js';

export { RunExecutionPolicySchema } from '../contracts/engine/RunExecutionPolicy.v1.js';
export {
  RunExecutionContextRefSchema,
  RunExecutionContextSchema,
} from '../contracts/engine/RunExecutionContext.v1.js';

export const ProviderSchema = z.enum(['temporal', 'conductor']);
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

export const PlanRefSchema = z
  .object({
    uri: NonBlankStringSchema,
    sha256: NonBlankStringSchema,
    schemaVersion: NonBlankStringSchema,
    planId: NonBlankStringSchema,
    planVersion: NonBlankStringSchema,
    sizeBytes: z.number().int().nonnegative().optional(),
    expiresAt: IsoUtcStringSchema.optional(),
  })
  .strict() satisfies z.ZodType<PlanRef>;

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

export const RunExecutionEvidenceSchema = z
  .object({
    activeStepId: StepIdSchema.optional(),
    failure: RunFailureEvidenceSchema.optional(),
    materialization: MaterializationEvidenceSchema.optional(),
  })
  .strict();

export const CanonicalRunStatusSchema = z
  .object({
    runId: NonBlankStringSchema,
    status: RunStatusSchema,
    substatus: RunSubstatusSchema.optional(),
    message: z.string().optional(),
    startedAt: IsoUtcStringSchema.optional(),
    completedAt: IsoUtcStringSchema.optional(),
    execution: RunExecutionEvidenceSchema.optional(),
  })
  .strict();

export const ProviderRunStatusViewSchema = z
  .object({
    provider: ProviderSchema,
    providerStatus: NonBlankStringSchema,
    providerSubstatus: NonBlankStringSchema.optional(),
    message: z.string().optional(),
    observedAt: z.string().optional(),
  })
  .strict();

export const RunStatusEnrichmentSchema = z
  .object({
    canonical: CanonicalRunStatusSchema,
    providerView: ProviderRunStatusViewSchema,
  })
  .strict();

export const TransformationFlowRuntimeBindingSchema = z
  .object({
    previewProfile: NonBlankStringSchema,
    executor: TransformationExecutorSchema,
  })
  .strict();

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

export const EngineRunRefSchema = z.discriminatedUnion('provider', [
  TemporalRunRefSchema,
  ConductorRunRefSchema,
]);

export const ArtifactKindSchema = z.enum([
  'execution-plan',
  'compiled-sql',
  'dbt-project-bundle',
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

export type PlanRefSchemaT = PlanRef;
export type RunExecutionPolicySchemaT = z.infer<typeof RunExecutionPolicySchema>;
export type RunExecutionContextRefSchemaT = z.infer<typeof RunExecutionContextRefSchema>;
export type RunExecutionContextSchemaT = z.infer<typeof RunExecutionContextSchema>;
export type RunContextSchemaT = z.infer<typeof RunContextSchema>;
export type ResolvedRunContextSchemaT = z.infer<typeof ResolvedRunContextSchema>;
export type SignalRequestSchemaT = z.infer<typeof SignalRequestSchema>;
export type RecoverRunCommandSchemaT = z.infer<typeof RecoverRunCommandSchema>;
export type CanonicalRunStatusSchemaT = z.infer<typeof CanonicalRunStatusSchema>;
export type ProviderRunStatusViewSchemaT = z.infer<typeof ProviderRunStatusViewSchema>;
export type RunStatusEnrichmentSchemaT = z.infer<typeof RunStatusEnrichmentSchema>;
export type EngineRunRefSchemaT = z.infer<typeof EngineRunRefSchema>;
export type ArtifactRefSchemaT = z.infer<typeof ArtifactRefSchema>;
export type StepOutputSchemaT = z.infer<typeof StepOutputSchema>;
