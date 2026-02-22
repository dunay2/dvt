import type { ExecuteStepRequest, ExecuteStepResult } from './adapters/IWorkflowEngineAdapter.v1';
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
export declare class ContractValidationError extends Error {
  readonly statusCode: 400;
  readonly error: 'Bad Request';
  readonly details: ValidationIssue[];
  constructor(details: ValidationIssue[]);
  toResponse(): ValidationErrorResponse;
}
export declare function toValidationErrorResponse(error: unknown): ValidationErrorResponse;
export declare function parsePlanRef(input: unknown): PlanRef;
export declare function parseRunContext(input: unknown): RunContext;
export declare function parseSignalRequest(input: unknown): SignalRequest;
export declare function parseEngineRunRef(input: unknown): EngineRunRef;
export declare function parseRunStatusSnapshot(input: unknown): RunStatusSnapshot;
export declare function parseArtifactRef(input: unknown): ArtifactRef;
export declare function parseStepOutput(input: unknown): StepOutput;
export declare function parseCanonicalEngineEvent(input: unknown): CanonicalEngineEvent;
export declare function parseStepSnapshot(input: unknown): StepSnapshot;
export declare function parseRunSnapshot(input: unknown): RunSnapshot;
export declare function parseExecuteStepRequest(input: unknown): ExecuteStepRequest;
export declare function parseExecuteStepResult(input: unknown): ExecuteStepResult;
//# sourceMappingURL=validation.d.ts.map
