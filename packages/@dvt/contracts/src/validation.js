"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractValidationError = void 0;
exports.toValidationErrorResponse = toValidationErrorResponse;
exports.parsePlanRef = parsePlanRef;
exports.parseRunContext = parseRunContext;
exports.parseSignalRequest = parseSignalRequest;
exports.parseEngineRunRef = parseEngineRunRef;
exports.parseRunStatusSnapshot = parseRunStatusSnapshot;
exports.parseArtifactRef = parseArtifactRef;
exports.parseStepOutput = parseStepOutput;
exports.parseCanonicalEngineEvent = parseCanonicalEngineEvent;
exports.parseRunEventWrite = parseRunEventWrite;
exports.parseRunEventRecord = parseRunEventRecord;
exports.parseStepSnapshot = parseStepSnapshot;
exports.parseRunSnapshot = parseRunSnapshot;
exports.parseExecuteStepRequest = parseExecuteStepRequest;
exports.parseExecuteStepResult = parseExecuteStepResult;
exports.parsePlannerSelection = parsePlannerSelection;
exports.parsePlannerPolicies = parsePlannerPolicies;
exports.parsePlannerEnvironmentContext = parsePlannerEnvironmentContext;
exports.parseGraphNode = parseGraphNode;
exports.parseDbtManifestRef = parseDbtManifestRef;
exports.parseExecutionStepV2 = parseExecutionStepV2;
exports.parsePlanCore = parsePlanCore;
exports.parseExecutionPlanV2 = parseExecutionPlanV2;
exports.parsePlannerInputEnvelopeV2 = parsePlannerInputEnvelopeV2;
exports.parsePlannerBuildResultV2 = parsePlannerBuildResultV2;
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
const zod_1 = require("zod");
const schemas_1 = require("./schemas");
class ContractValidationError extends Error {
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
exports.ContractValidationError = ContractValidationError;
function toValidationErrorResponse(error) {
    if (error instanceof ContractValidationError) {
        return error.toResponse();
    }
    if (error instanceof zod_1.ZodError) {
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
    if (result.success)
        return result.data;
    throw new ContractValidationError(mapZodIssues(result.error));
}
function mapZodIssues(error) {
    return error.issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join('.') : '$',
        code: issue.code,
        message: issue.message,
    }));
}
function parsePlanRef(input) {
    return parseWithSchema(schemas_1.PlanRefSchema, input);
}
function parseRunContext(input) {
    return parseWithSchema(schemas_1.RunContextSchema, input);
}
function parseSignalRequest(input) {
    return parseWithSchema(schemas_1.SignalRequestSchema, input);
}
function parseEngineRunRef(input) {
    return parseWithSchema(schemas_1.EngineRunRefSchema, input);
}
function parseRunStatusSnapshot(input) {
    return parseWithSchema(schemas_1.RunStatusSnapshotSchema, input);
}
function parseArtifactRef(input) {
    return parseWithSchema(schemas_1.ArtifactRefSchema, input);
}
function parseStepOutput(input) {
    return parseWithSchema(schemas_1.StepOutputSchema, input);
}
/** @deprecated Use parseRunEventWrite or parseRunEventRecord. */
function parseCanonicalEngineEvent(input) {
    return parseWithSchema(schemas_1.CanonicalEngineEventSchema, input);
}
/** Validate a write-side event envelope (RunEvents v2.0.1). */
function parseRunEventWrite(input) {
    return parseWithSchema(schemas_1.RunEventWriteSchema, input);
}
/** Validate a persisted event record (RunEvents v2.0.1). */
function parseRunEventRecord(input) {
    return parseWithSchema(schemas_1.RunEventRecordSchema, input);
}
function parseStepSnapshot(input) {
    return parseWithSchema(schemas_1.StepSnapshotSchema, input);
}
function parseRunSnapshot(input) {
    return parseWithSchema(schemas_1.RunSnapshotSchema, input);
}
function parseExecuteStepRequest(input) {
    return parseWithSchema(schemas_1.ExecuteStepRequestSchema, input);
}
function parseExecuteStepResult(input) {
    return parseWithSchema(schemas_1.ExecuteStepResultSchema, input);
}
function parsePlannerSelection(input) {
    return parseWithSchema(schemas_1.PlannerSelectionSchema, input);
}
function parsePlannerPolicies(input) {
    return parseWithSchema(schemas_1.PlannerPoliciesSchema, input);
}
function parsePlannerEnvironmentContext(input) {
    return parseWithSchema(schemas_1.PlannerEnvironmentContextSchema, input);
}
function parseGraphNode(input) {
    return parseWithSchema(schemas_1.GraphNodeSchema, input);
}
function parseDbtManifestRef(input) {
    return parseWithSchema(schemas_1.DbtManifestRefSchema, input);
}
function parseExecutionStepV2(input) {
    return parseWithSchema(schemas_1.ExecutionStepV2Schema, input);
}
function parsePlanCore(input) {
    return parseWithSchema(schemas_1.PlanCoreSchema, input);
}
function parseExecutionPlanV2(input) {
    return parseWithSchema(schemas_1.ExecutionPlanV2Schema, input);
}
function parsePlannerInputEnvelopeV2(input) {
    return parseWithSchema(schemas_1.PlannerInputEnvelopeV2Schema, input);
}
function parsePlannerBuildResultV2(input) {
    return parseWithSchema(schemas_1.PlannerBuildResultV2Schema, input);
}
//# sourceMappingURL=validation.js.map