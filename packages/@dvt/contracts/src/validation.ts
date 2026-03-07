/**
 * @file packages/@dvt/contracts/src/validation.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0006: Contract Tooling Governance
 * @decision Section 2 — Contract validation functions are centralized at runtime boundaries
 * @decision Section 3 — Validation errors are normalized into deterministic API-safe payloads
 * @consequence Invalid contract payloads fail fast with canonical diagnostics across modules
 * @version 1.0.0
 * @date 2026-02-21
 */
import { z, ZodError, type ZodType } from 'zod';

import {
  ArtifactRefSchema,
  type ArtifactRefSchemaT,
  DbtManifestRefSchema,
  type DbtManifestRefSchemaT,
  EngineRunRefSchema,
  type EngineRunRefSchemaT,
  ExecutionPlanV2Schema,
  type ExecutionPlanV2SchemaT,
  ExecutionStepV2Schema,
  type ExecutionStepV2SchemaT,
  ExecuteStepRequestSchema,
  type ExecuteStepRequestSchemaT,
  ExecuteStepResultSchema,
  type ExecuteStepResultSchemaT,
  GraphNodeSchema,
  type GraphNodeSchemaT,
  PlannerBuildResultV2Schema,
  type PlannerBuildResultV2SchemaT,
  PlannerEnvironmentContextSchema,
  type PlannerEnvironmentContextSchemaT,
  PlannerInputEnvelopeV2Schema,
  type PlannerInputEnvelopeV2SchemaT,
  PlannerPoliciesSchema,
  type PlannerPoliciesSchemaT,
  PlannerSelectionSchema,
  type PlannerSelectionSchemaT,
  PlanCoreSchema,
  type PlanCoreSchemaT,
  PlanRefSchema,
  type PlanRefSchemaT,
  RunContextSchema,
  type RunContextSchemaT,
  RunEventWriteSchema,
  type RunEventWriteSchemaT,
  RunEventRecordSchema,
  type RunEventRecordSchemaT,
  RunSnapshotSchema,
  type RunSnapshotSchemaT,
  RunStatusSnapshotSchema,
  type RunStatusSnapshotSchemaT,
  SignalRequestSchema,
  type SignalRequestSchemaT,
  StepOutputSchema,
  type StepOutputSchemaT,
  StepSnapshotSchema,
  type StepSnapshotSchemaT,
} from './schemas';

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ValidationErrorResponse {
  statusCode: 400;
  error: 'Bad Request';
  message: 'Validation failed';
  details: ValidationIssue[];
}

export class ContractValidationError extends Error {
  readonly statusCode: 400;
  readonly error: 'Bad Request';
  readonly details: ValidationIssue[];

  constructor(details: ValidationIssue[]) {
    super('Validation failed');
    this.name = 'ContractValidationError';
    this.statusCode = 400;
    this.error = 'Bad Request';
    this.details = details;
  }

  toResponse(): ValidationErrorResponse {
    return {
      statusCode: this.statusCode,
      error: this.error,
      message: 'Validation failed',
      details: this.details,
    };
  }
}

export function toValidationErrorResponse(error: unknown): ValidationErrorResponse {
  if (error instanceof ContractValidationError) {
    return error.toResponse();
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      details: mapZodIssues(error),
    };
  }

  return {
    statusCode: 400,
    error: 'Bad Request',
    message: 'Validation failed',
    details: [{ path: '$', code: 'unknown', message: 'Unknown validation error' }],
  };
}

function parseWithSchema<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new ContractValidationError(mapZodIssues(result.error));
}

function mapZodIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : '$',
    code: issue.code,
    message: issue.message,
  }));
}

export function parsePlanRef(input: unknown): PlanRefSchemaT {
  return parseWithSchema(PlanRefSchema, input);
}

export function parseRunContext(input: unknown): RunContextSchemaT {
  return parseWithSchema(RunContextSchema, input);
}

export function parseSignalRequest(input: unknown): SignalRequestSchemaT {
  return parseWithSchema(SignalRequestSchema, input);
}

export function parseEngineRunRef(input: unknown): EngineRunRefSchemaT {
  return parseWithSchema(EngineRunRefSchema, input);
}

export function parseRunStatusSnapshot(input: unknown): RunStatusSnapshotSchemaT {
  return parseWithSchema(RunStatusSnapshotSchema, input);
}

export function parseArtifactRef(input: unknown): ArtifactRefSchemaT {
  return parseWithSchema(ArtifactRefSchema, input);
}

export function parseStepOutput(input: unknown): StepOutputSchemaT {
  return parseWithSchema(StepOutputSchema, input);
}

/** Validate a write-side event envelope (RunEvents v2.0.1). */
export function parseRunEventWrite(input: unknown): RunEventWriteSchemaT {
  return parseWithSchema(RunEventWriteSchema, input);
}

const LegacyCanonicalEngineEventSchema = z.object({
  runId: z.string().min(1),
  runSeq: z.number().int().positive().optional(),
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  eventData: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().min(1),
  emittedAt: z.string().min(1),
});

export type LegacyCanonicalEngineEvent = z.infer<typeof LegacyCanonicalEngineEventSchema>;

/**
 * Backward-compatible validator consumed by contract golden checks.
 * New code should use parseRunEventWrite/parseRunEventRecord.
 */
export function parseCanonicalEngineEvent(input: unknown): LegacyCanonicalEngineEvent {
  return parseWithSchema(LegacyCanonicalEngineEventSchema, input);
}

/** Validate a persisted event record (RunEvents v2.0.1). */
export function parseRunEventRecord(input: unknown): RunEventRecordSchemaT {
  return parseWithSchema(RunEventRecordSchema, input);
}

export function parseStepSnapshot(input: unknown): StepSnapshotSchemaT {
  return parseWithSchema(StepSnapshotSchema, input);
}

export function parseRunSnapshot(input: unknown): RunSnapshotSchemaT {
  return parseWithSchema(RunSnapshotSchema, input);
}

export function parseExecuteStepRequest(input: unknown): ExecuteStepRequestSchemaT {
  return parseWithSchema(ExecuteStepRequestSchema, input);
}

export function parseExecuteStepResult(input: unknown): ExecuteStepResultSchemaT {
  return parseWithSchema(ExecuteStepResultSchema, input);
}

export function parsePlannerSelection(input: unknown): PlannerSelectionSchemaT {
  return parseWithSchema(PlannerSelectionSchema, input);
}

export function parsePlannerPolicies(input: unknown): PlannerPoliciesSchemaT {
  return parseWithSchema(PlannerPoliciesSchema, input);
}

export function parsePlannerEnvironmentContext(input: unknown): PlannerEnvironmentContextSchemaT {
  return parseWithSchema(PlannerEnvironmentContextSchema, input);
}

export function parseGraphNode(input: unknown): GraphNodeSchemaT {
  return parseWithSchema(GraphNodeSchema, input);
}

export function parseDbtManifestRef(input: unknown): DbtManifestRefSchemaT {
  return parseWithSchema(DbtManifestRefSchema, input);
}

export function parseExecutionStepV2(input: unknown): ExecutionStepV2SchemaT {
  return parseWithSchema(ExecutionStepV2Schema, input);
}

export function parsePlanCore(input: unknown): PlanCoreSchemaT {
  return parseWithSchema(PlanCoreSchema, input);
}

export function parseExecutionPlanV2(input: unknown): ExecutionPlanV2SchemaT {
  return parseWithSchema(ExecutionPlanV2Schema, input);
}

export function parsePlannerInputEnvelopeV2(input: unknown): PlannerInputEnvelopeV2SchemaT {
  return parseWithSchema(PlannerInputEnvelopeV2Schema, input);
}

export function parsePlannerBuildResultV2(input: unknown): PlannerBuildResultV2SchemaT {
  return parseWithSchema(PlannerBuildResultV2Schema, input);
}
