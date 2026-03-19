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
export type { IArtifactResolver } from './ports/IArtifactResolver.js';
export { PlannerError, PlannerErrorCode } from './domain/errors.js';

// ── Transitional contract re-exports ─────────────────────────────────────────
//
// These types are planner boundary contracts. Their canonical import home is
// @dvt/contracts. Re-exports here are compatibility aliases while downstream
// consumers migrate to the canonical path.
//
// DO NOT add new contract re-exports here. Import from @dvt/contracts directly.
//
export type {
  DbtManifestLike,
  ExecutionPlanV2,
  ExecutionStepV2,
  GraphNode,
  IExecutionPlanner,
  IPlanner,
  PlanCore,
  PlannerBuildResultV2,
  PlannerInputEnvelopeV2,
  PlannerSelection,
  ResolvedPolicies,
  StepKind,
} from '@dvt/contracts';

// Backward-compatible alias — deprecated, migrate to ExecutionPlanV2 from @dvt/contracts.
export type { ExecutionPlanV2 as ExecutionPlan } from '@dvt/contracts';

// ── Artifact concern — to be extracted (Slice 3 Phase 3) ─────────────────────
//
// The following exports belong to the artifact bounded context, not to the
// planner boundary. They remain here during the transition period while a
// dedicated artifact owner package is established (ADR-0034).
//
// DO NOT add new artifact exports here.
//
export type { ICompiledCodeStorage } from './ports/ICompiledCodeStorage.js';
export { computeSha256 } from './compiledCode/sha256.js';
export {
  attachCompiledCodeRefs,
  type AttachCompiledCodeRefsOptions,
} from './compiledCode/attachCompiledCodeRefs.js';
export { S3CompiledCodeStorage } from './compiledCode/adapters/S3CompiledCodeStorage.js';
export { MinioCompiledCodeStorage } from './compiledCode/adapters/MinioCompiledCodeStorage.js';
export { FileSystemCompiledCodeStorage } from './compiledCode/adapters/FileSystemCompiledCodeStorage.js';
export { InMemoryCompiledCodeStorage } from './compiledCode/adapters/InMemoryCompiledCodeStorage.js';
export { NoopCompiledCodeStorage } from './compiledCode/adapters/NoopCompiledCodeStorage.js';
