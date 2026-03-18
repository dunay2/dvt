export { Planner } from './domain/Planner.js';

// Canonical planner boundary types — authoritative source is @dvt/contracts.
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
  StepKind,
} from '@dvt/contracts';

// Backward-compatible alias for consumers that imported ExecutionPlan from @dvt/planner.
export type { ExecutionPlanV2 as ExecutionPlan } from '@dvt/contracts';

// Planner-internal type: exposed because StepFactory implementers need it.
export type { ResolvedPolicies } from './domain/types.js';

export type { StepFactory } from './domain/stepFactory/StepFactory.js';

export { PlannerError, PlannerErrorCode } from './domain/errors.js';

export type { PlannerLimits } from './domain/limits.js';
export type { PlannerMetrics } from './domain/metrics.js';

export type { IArtifactResolver } from './ports/IArtifactResolver.js';
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
