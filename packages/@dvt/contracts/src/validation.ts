import { ZodError, type ZodType } from 'zod';

import type { ExecuteStepRequest, ExecuteStepResult } from './adapters/IWorkflowEngineAdapter.v1';
import {
  ArtifactRefSchema,
  CanonicalEngineEventSchema,
  EngineRunRefSchema,
  ExecuteStepRequestSchema,
  ExecuteStepResultSchema,
  PlanRefSchema,
  RunContextSchema,
  RunSnapshotSchema,
  RunStatusSnapshotSchema,
  SignalRequestSchema,
  StepOutputSchema,
  StepSnapshotSchema,
} from './schemas';
import type { ArtifactRef, StepOutput } from './types/artifacts';
import type {
  EngineRunRef,
  PlanRef,
  RunContext,
  RunStatusSnapshot,
  SignalRequest,
} from './types/contracts';
import type { CanonicalEngineEvent, RunSnapshot, StepSnapshot } from './types/state-store';

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

export function parsePlanRef(input: unknown): PlanRef {
  return parseWithSchema(PlanRefSchema, input);
}

export function parseRunContext(input: unknown): RunContext {
  return parseWithSchema(RunContextSchema, input);
}

export function parseSignalRequest(input: unknown): SignalRequest {
  return parseWithSchema(SignalRequestSchema, input);
}

export function parseEngineRunRef(input: unknown): EngineRunRef {
  return parseWithSchema(EngineRunRefSchema, input);
}

export function parseRunStatusSnapshot(input: unknown): RunStatusSnapshot {
  return parseWithSchema(RunStatusSnapshotSchema, input);
}

export function parseArtifactRef(input: unknown): ArtifactRef {
  return parseWithSchema(ArtifactRefSchema, input);
}

export function parseStepOutput(input: unknown): StepOutput {
  return parseWithSchema(StepOutputSchema, input);
}

export function parseCanonicalEngineEvent(input: unknown): CanonicalEngineEvent {
  return parseWithSchema(CanonicalEngineEventSchema, input);
}

export function parseStepSnapshot(input: unknown): StepSnapshot {
  return parseWithSchema(StepSnapshotSchema, input);
}

export function parseRunSnapshot(input: unknown): RunSnapshot {
  return parseWithSchema(RunSnapshotSchema, input);
}

export function parseExecuteStepRequest(input: unknown): ExecuteStepRequest {
  return parseWithSchema(ExecuteStepRequestSchema, input);
}

export function parseExecuteStepResult(input: unknown): ExecuteStepResult {
  return parseWithSchema(ExecuteStepResultSchema, input);
}
