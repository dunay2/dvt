/**
 * ADR baseline: ADR-0006-extensibility
 */
import type { GraphNode, ResolvedPolicies, ExecutionStepV2 } from '../types.js';

/**
 * Factory for building steps.
 * Determinism requirement: for same inputs, must return identical step outputs.
 */
export type StepFactory = (node: GraphNode, resolvedPolicies: ResolvedPolicies) => ExecutionStepV2;
