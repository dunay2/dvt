import {
  type ArtifactRefSchemaT,
  type CanonicalEngineEventSchemaT,
  type EngineRunRefSchemaT,
  type ExecuteStepRequestSchemaT,
  type ExecuteStepResultSchemaT,
  type PlanRefSchemaT,
  type RunContextSchemaT,
  type RunSnapshotSchemaT,
  type RunStatusSnapshotSchemaT,
  type SignalRequestSchemaT,
  type StepOutputSchemaT,
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
export declare class ContractValidationError extends Error {
  readonly statusCode: 400;
  readonly error: 'Bad Request';
  readonly details: ValidationIssue[];
  constructor(details: ValidationIssue[]);
  toResponse(): ValidationErrorResponse;
}
export declare function toValidationErrorResponse(error: unknown): ValidationErrorResponse;
export declare function parsePlanRef(input: unknown): PlanRefSchemaT;
export declare function parseRunContext(input: unknown): RunContextSchemaT;
export declare function parseSignalRequest(input: unknown): SignalRequestSchemaT;
export declare function parseEngineRunRef(input: unknown): EngineRunRefSchemaT;
export declare function parseRunStatusSnapshot(input: unknown): RunStatusSnapshotSchemaT;
export declare function parseArtifactRef(input: unknown): ArtifactRefSchemaT;
export declare function parseStepOutput(input: unknown): StepOutputSchemaT;
export declare function parseCanonicalEngineEvent(input: unknown): CanonicalEngineEventSchemaT;
export declare function parseStepSnapshot(input: unknown): StepSnapshotSchemaT;
export declare function parseRunSnapshot(input: unknown): RunSnapshotSchemaT;
export declare function parseExecuteStepRequest(input: unknown): ExecuteStepRequestSchemaT;
export declare function parseExecuteStepResult(input: unknown): ExecuteStepResultSchemaT;
//# sourceMappingURL=validation.d.ts.map
