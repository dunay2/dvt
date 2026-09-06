// ── Stable public boundary ────────────────────────────────────────────────────
//
// PlannerFacade is the sole public entry point for the planner bounded context.
// The domain Planner is intentionally not exported — use PlannerFacade.
//
// Governing: ADR-0034, ADR-0035, planner-slice3-physical-reorganization-plan.md
//
export { PlannerFacade, type PlannerFacadeOptions } from './application/PlannerFacade.js';

export type { StepFactory } from './domain/stepFactory/StepFactory.js';
export type { PlannerLimits } from './domain/limits.js';
export { PlannerError, PlannerErrorCode } from './domain/errors.js';

// -- Planner-owned behavior ports ------------------------------------------------
export type { ICustomPolicyNamespaceRegistry } from './contracts/CustomPolicyNamespaceRegistry.js';
export type { IExecutionBindingVerifier } from './contracts/ExecutionBindingVerification.js';
export type { IPlanExecutabilityValidator } from './contracts/PlanExecutabilityValidation.js';
export type { PlanExecutabilityValidationInput } from './contracts/PlanExecutabilityValidation.js';

// ── Transitional contract re-exports ─────────────────────────────────────────
//
// These types are planner boundary contracts. Their canonical import home is
// @dvt/contracts. Re-exports here are compatibility aliases while downstream
// consumers migrate to the canonical path.
//
// DO NOT add new contract re-exports here. Import from @dvt/contracts directly.
//
export type {
  ExecutionPlan,
  ExecutionStepV1,
  GenericGraphSourceV1,
  IExecutionPlanner,
  IPlanner,
  PlanCore,
  PlannerBuildResultV1,
  PlannerInputEnvelopeV1,
  PlannerSelection,
  ResolvedPolicies,
  StepKind,
} from '@dvt/contracts';

// ── Artifact concern — transitional compatibility bridge (Slice 4) ────────────
//
// These symbols have moved to @dvt/artifacts (ADR-0034, Slice 4).
// Re-exports here are a migration bridge for downstream consumers.
//
// DO NOT add new artifact exports here.
// DO NOT import artifact storage from @dvt/planner in new code — use @dvt/artifacts directly.
// Removal criteria: remove this section once all downstream imports point to @dvt/artifacts.
//
export type { ICompiledCodeStorage } from '@dvt/artifacts';
export { computeSha256 } from '@dvt/artifacts';
export { attachCompiledCodeRefs, type AttachCompiledCodeRefsOptions } from '@dvt/artifacts';
export { S3CompiledCodeStorage } from '@dvt/artifacts';
export { MinioCompiledCodeStorage } from '@dvt/artifacts';
export { FileSystemCompiledCodeStorage } from '@dvt/artifacts';
export { InMemoryCompiledCodeStorage } from '@dvt/artifacts';
export { NoopCompiledCodeStorage } from '@dvt/artifacts';
