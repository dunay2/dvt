import { type ArtifactRefSchemaT, type CanonicalEngineEventSchemaT, type DbtManifestRefSchemaT, type EngineRunRefSchemaT, type ExecutionPlanV2SchemaT, type ExecutionStepV2SchemaT, type ExecuteStepRequestSchemaT, type ExecuteStepResultSchemaT, type GraphNodeSchemaT, type PlannerBuildResultV2SchemaT, type PlannerEnvironmentContextSchemaT, type PlannerInputEnvelopeV2SchemaT, type PlannerPoliciesSchemaT, type PlannerSelectionSchemaT, type PlanCoreSchemaT, type PlanRefSchemaT, type RunContextSchemaT, type RunEventWriteSchemaT, type RunEventRecordSchemaT, type RunSnapshotSchemaT, type RunStatusSnapshotSchemaT, type SignalRequestSchemaT, type StepOutputSchemaT, type StepSnapshotSchemaT } from './schemas';
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
/** @deprecated Use parseRunEventWrite or parseRunEventRecord. */
export declare function parseCanonicalEngineEvent(input: unknown): CanonicalEngineEventSchemaT;
/** Validate a write-side event envelope (RunEvents v2.0.1). */
export declare function parseRunEventWrite(input: unknown): RunEventWriteSchemaT;
/** Validate a persisted event record (RunEvents v2.0.1). */
export declare function parseRunEventRecord(input: unknown): RunEventRecordSchemaT;
export declare function parseStepSnapshot(input: unknown): StepSnapshotSchemaT;
export declare function parseRunSnapshot(input: unknown): RunSnapshotSchemaT;
export declare function parseExecuteStepRequest(input: unknown): ExecuteStepRequestSchemaT;
export declare function parseExecuteStepResult(input: unknown): ExecuteStepResultSchemaT;
export declare function parsePlannerSelection(input: unknown): PlannerSelectionSchemaT;
export declare function parsePlannerPolicies(input: unknown): PlannerPoliciesSchemaT;
export declare function parsePlannerEnvironmentContext(input: unknown): PlannerEnvironmentContextSchemaT;
export declare function parseGraphNode(input: unknown): GraphNodeSchemaT;
export declare function parseDbtManifestRef(input: unknown): DbtManifestRefSchemaT;
export declare function parseExecutionStepV2(input: unknown): ExecutionStepV2SchemaT;
export declare function parsePlanCore(input: unknown): PlanCoreSchemaT;
export declare function parseExecutionPlanV2(input: unknown): ExecutionPlanV2SchemaT;
export declare function parsePlannerInputEnvelopeV2(input: unknown): PlannerInputEnvelopeV2SchemaT;
export declare function parsePlannerBuildResultV2(input: unknown): PlannerBuildResultV2SchemaT;
//# sourceMappingURL=validation.d.ts.map