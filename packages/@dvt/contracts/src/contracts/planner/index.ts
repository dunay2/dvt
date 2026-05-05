/**
 * Owned concern: expose the execution-selection planner contract component as
 * one narrow semantic barrel.
 *
 * This module publishes operator selection intent and the derived executable
 * subgraph read model. It does not widen into a convenience export surface for
 * unrelated planner contracts.
 *
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Re-export only the execution-selection component contracts through this local barrel.
 * @consequence Downstream imports do not turn the planner contract package into an accidental grab bag.
 * @version 1.0.0
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
