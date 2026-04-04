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

import type { PlanAdmissionLink } from './contracts/planner/PlanAdmissionLink.v1.js';
import type { PlanExecutabilityRecord } from './contracts/planner/PlanExecutabilityRecord.v1.js';
import {
  PlannerPolicyClassSetSchema,
  type PlannerPolicyClassSetSchemaT,
} from './contracts/planner/PlannerPolicyVocabulary.v2.js';
import type { PlanRecord } from './contracts/planner/PlanRecord.v1.js';
import {
  CONTRACTS_ERROR_CODE,
  CONTRACTS_ERROR_MESSAGE_KEY,
  DvtContractError,
  type ContractsErrorMessageParams,
  defaultContractsErrorMessage,
} from './errorContract.js';
import {
  ArtifactRefSchema,
  type ArtifactRefSchemaT,
  DbtManifestRefSchema,
  type DbtManifestRefSchemaT,
  EngineRunRefSchema,
  type EngineRunRefSchemaT,
  ExecutionPlanSchema,
  type ExecutionPlanSchemaT,
  ExecutionStepV1Schema,
  type ExecutionStepV1SchemaT,
  GenericGraphSourceV1Schema,
  type GenericGraphSourceV1SchemaT,
  GraphNodeSchema,
  type GraphNodeSchemaT,
  PlannerBuildResultV1Schema,
  type PlannerBuildResultV1SchemaT,
  PlanAdmissionLinkSchema,
  PlanExecutabilityRecordSchema,
  PlanRecordSchema,
  PlannerEnvironmentContextSchema,
  type PlannerEnvironmentContextSchemaT,
  PlannerInputEnvelopeV1Schema,
  type PlannerInputEnvelopeV1SchemaT,
  PlannerSelectionSchema,
  type PlannerSelectionSchemaT,
  PlanCoreSchema,
  type PlanCoreSchemaT,
  PlanRefSchema,
  type PlanRefSchemaT,
  RunExecutionContextRefSchema,
  type RunExecutionContextRefSchemaT,
  RunExecutionContextSchema,
  type RunExecutionContextSchemaT,
  ResolvedRunContextSchema,
  type ResolvedRunContextSchemaT,
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
} from './schemas.js';

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ValidationErrorResponse {
  statusCode: 400;
  error: 'Bad Request';
  code: typeof CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED;
  messageKey: typeof CONTRACTS_ERROR_MESSAGE_KEY.CONTRACT_VALIDATION_FAILED;
  messageParams: ContractsErrorMessageParams<'CONTRACT_VALIDATION_FAILED'>;
  message: string;
  details: ValidationIssue[];
}

export class ContractValidationError extends DvtContractError<'CONTRACT_VALIDATION_FAILED'> {
  readonly code = CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED;
  readonly statusCode: 400;
  readonly error: 'Bad Request';
  readonly details: ValidationIssue[];

  constructor(details: ValidationIssue[]) {
    super(CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED, 'CONTRACT_VALIDATION_FAILED', {
      details,
    });
    this.name = 'ContractValidationError';
    this.statusCode = 400;
    this.error = 'Bad Request';
    this.details = details;
  }

  toResponse(): ValidationErrorResponse {
    return {
      statusCode: this.statusCode,
      error: this.error,
      code: this.code,
      messageKey: this.messageKey,
      messageParams: this.messageParams,
      message: this.message,
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
      code: CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED,
      messageKey: CONTRACTS_ERROR_MESSAGE_KEY.CONTRACT_VALIDATION_FAILED,
      messageParams: {},
      message: defaultContractsErrorMessage('CONTRACT_VALIDATION_FAILED', {}),
      details: mapZodIssues(error),
    };
  }

  return {
    statusCode: 400,
    error: 'Bad Request',
    code: CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED,
    messageKey: CONTRACTS_ERROR_MESSAGE_KEY.CONTRACT_VALIDATION_FAILED,
    messageParams: {},
    message: defaultContractsErrorMessage('CONTRACT_VALIDATION_FAILED', {}),
    details: [
      {
        path: '$',
        code: 'unknown',
        message: 'Unknown validation error',
      },
    ],
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

export function parseRunExecutionContextRef(input: unknown): RunExecutionContextRefSchemaT {
  return parseWithSchema(RunExecutionContextRefSchema, input);
}

export function parseRunExecutionContext(input: unknown): RunExecutionContextSchemaT {
  return parseWithSchema(RunExecutionContextSchema, input);
}

export function parseRunContext(input: unknown): RunContextSchemaT {
  return parseWithSchema(RunContextSchema, input);
}

export function parseResolvedRunContext(input: unknown): ResolvedRunContextSchemaT {
  return parseWithSchema(ResolvedRunContextSchema, input);
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

export function parsePlannerSelection(input: unknown): PlannerSelectionSchemaT {
  return parseWithSchema(PlannerSelectionSchema, input);
}

export function parsePlannerPolicyClassSet(input: unknown): PlannerPolicyClassSetSchemaT {
  return parseWithSchema(PlannerPolicyClassSetSchema, input);
}

export function parsePlannerEnvironmentContext(input: unknown): PlannerEnvironmentContextSchemaT {
  return parseWithSchema(PlannerEnvironmentContextSchema, input);
}

export function parseGraphNode(input: unknown): GraphNodeSchemaT {
  return parseWithSchema(GraphNodeSchema, input);
}

export function parseGenericGraphSourceV1(input: unknown): GenericGraphSourceV1SchemaT {
  return parseWithSchema(GenericGraphSourceV1Schema, input);
}

export function parseDbtManifestRef(input: unknown): DbtManifestRefSchemaT {
  return parseWithSchema(DbtManifestRefSchema, input);
}

export function parseExecutionStepV1(input: unknown): ExecutionStepV1SchemaT {
  return parseWithSchema(ExecutionStepV1Schema, input);
}

export function parsePlanCore(input: unknown): PlanCoreSchemaT {
  return parseWithSchema(PlanCoreSchema, input);
}

export function parseExecutionPlan(input: unknown): ExecutionPlanSchemaT {
  return parseWithSchema(ExecutionPlanSchema, input);
}

export function parsePlannerInputEnvelopeV1(input: unknown): PlannerInputEnvelopeV1SchemaT {
  return parseWithSchema(PlannerInputEnvelopeV1Schema, input);
}

export function parsePlannerBuildResultV1(input: unknown): PlannerBuildResultV1SchemaT {
  return parseWithSchema(PlannerBuildResultV1Schema, input);
}

export function parsePlanRecord(input: unknown): PlanRecord {
  return parseWithSchema(PlanRecordSchema, input);
}

export function parsePlanExecutabilityRecord(input: unknown): PlanExecutabilityRecord {
  return parseWithSchema(PlanExecutabilityRecordSchema, input);
}

export function parsePlanAdmissionLink(input: unknown): PlanAdmissionLink {
  return parseWithSchema(PlanAdmissionLinkSchema, input);
}
