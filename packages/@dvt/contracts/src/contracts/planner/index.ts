/**
 * Owned concern: expose the execution-selection planner contract component as
 * one narrow semantic barrel.
 *
 * This module publishes operator selection intent and the derived executable
 * subgraph read model. It does not widen into a convenience export surface for
 * unrelated planner contracts.
 */
export {
  EXECUTION_SELECTION_MODE,
  ExecutionSelectionSchema,
  type ExecutionSelection,
  type ExecutionSelectionMode,
} from './ExecutionSelection.v1.js';
export {
  EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE,
  ExecutableSubgraphDiagnosticSchema,
  ExecutableSubgraphSchema,
  type ExecutableSubgraph,
  type ExecutableSubgraphDiagnostic,
  type ExecutableSubgraphDiagnosticCode,
} from './ExecutableSubgraph.v1.js';
