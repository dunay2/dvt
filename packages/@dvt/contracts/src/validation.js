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
import { ZodError } from 'zod';
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
export class ContractValidationError extends Error {
  statusCode;
  error;
  details;
  constructor(details) {
    super('Validation failed');
    this.name = 'ContractValidationError';
    this.statusCode = 400;
    this.error = 'Bad Request';
    this.details = details;
  }
  toResponse() {
    return {
      statusCode: this.statusCode,
      error: this.error,
      message: 'Validation failed',
      details: this.details,
    };
  }
}
export function toValidationErrorResponse(error) {
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
function parseWithSchema(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new ContractValidationError(mapZodIssues(result.error));
}
function mapZodIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : '$',
    code: issue.code,
    message: issue.message,
  }));
}
export function parsePlanRef(input) {
  return parseWithSchema(PlanRefSchema, input);
}
export function parseRunContext(input) {
  return parseWithSchema(RunContextSchema, input);
}
export function parseSignalRequest(input) {
  return parseWithSchema(SignalRequestSchema, input);
}
export function parseEngineRunRef(input) {
  return parseWithSchema(EngineRunRefSchema, input);
}
export function parseRunStatusSnapshot(input) {
  return parseWithSchema(RunStatusSnapshotSchema, input);
}
export function parseArtifactRef(input) {
  return parseWithSchema(ArtifactRefSchema, input);
}
export function parseStepOutput(input) {
  return parseWithSchema(StepOutputSchema, input);
}
export function parseCanonicalEngineEvent(input) {
  return parseWithSchema(CanonicalEngineEventSchema, input);
}
export function parseStepSnapshot(input) {
  return parseWithSchema(StepSnapshotSchema, input);
}
export function parseRunSnapshot(input) {
  return parseWithSchema(RunSnapshotSchema, input);
}
export function parseExecuteStepRequest(input) {
  return parseWithSchema(ExecuteStepRequestSchema, input);
}
export function parseExecuteStepResult(input) {
  return parseWithSchema(ExecuteStepResultSchema, input);
}
//# sourceMappingURL=validation.js.map
