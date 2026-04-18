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
export {
  ContractValidationError,
  toValidationErrorResponse,
  type ValidationErrorResponse,
  type ValidationIssue,
} from './validation/core.js';
export {
  parseCanonicalEngineEvent,
  parseRunEventRecord,
  parseRunEventWrite,
  type LegacyCanonicalEngineEvent,
} from './validation/events.js';
export {
  parseArtifactRef,
  parseDesignGraphDraft,
  parseExternalPlanCompileRequest,
  parseExternalPlanCompileResponse,
  parseExecutionPlan,
  parseExecutionStepV1,
  parseGenericGraphSourceV1,
  parsePlanAdmissionLink,
  parsePlanCore,
  parsePlanExecutabilityRecord,
  parsePlannerBuildResultV1,
  parsePlannerEnvironmentContext,
  parsePlannerInputEnvelopeV1,
  parsePlannerObservability,
  parsePlannerPolicyClassSet,
  parsePlannerSelection,
  parsePlanPreviewPersistResponse,
  parsePlanPreviewProvenance,
  parsePlanPreviewRequest,
  parsePlanRecord,
  parsePlanRef,
  parseTransformationSqlFirstCompilerGraphSource,
  parseWorkspaceGraphDraftReadResponse,
  parseWorkspaceGraphDraftSaveRequest,
  parseWorkspaceGraphDraftSaveResponse,
} from './validation/planner.js';
export {
  parseCanonicalRunStatus,
  parseDbtPluginContext,
  parseEngineRunRef,
  parseProviderRunStatusView,
  parseRecoverRunCommand,
  parseResolvedRunContext,
  parseRunContext,
  parseRunExecutionContext,
  parseRunExecutionContextRef,
  parseRunExecutionPolicy,
  parseRunSnapshot,
  parseRunStatusEnrichment,
  parseSignalRequest,
  parseStartRunCommand,
  parseStartRunResult,
  parseStepOutput,
  parseStepSnapshot,
} from './validation/runtime.js';
