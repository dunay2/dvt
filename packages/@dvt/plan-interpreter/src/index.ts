/**
 * @file packages/@dvt/plan-interpreter/src/index.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Shared plan interpretation package ensures adapter-agnostic DAG analysis
 * @consequence Active runtime adapters produce identical execution order for the same plan
 * @version 1.0.0
 * @date 2026-02-23
 */

export { collectDownstreamStepIds, planExecutionLayers, validateDag } from './dagAnalyzer.js';
export { PlanValidationError } from './errors.js';
export type { DagValidationResult, PlanStep, PlanValidationErrorCode } from './types.js';
