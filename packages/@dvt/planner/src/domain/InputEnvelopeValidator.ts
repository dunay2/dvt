/**
 * Design (SOLID + SRP):
 *   Sole responsibility: assert structural invariants on PlannerInputEnvelopeV1
 *   before the planner pipeline begins. Knows nothing about graph, limits or hashing.
 */
import { PlannerError, PlannerErrorCode } from './errors.js';
import type { PlannerInputEnvelopeV1 } from './types.js';

export class InputEnvelopeValidator {
  validate(input: PlannerInputEnvelopeV1): void {
    this.assertEnvelopeShape(input);
    this.assertSelectionShape(input.selection);
    this.assertDecisionScopeShape(input.decisionScope, input.graphSource.nodes);
  }

  private assertDecisionScopeShape(
    decisionScope: PlannerInputEnvelopeV1['decisionScope'],
    graphNodes: PlannerInputEnvelopeV1['graphSource']['nodes']
  ): void {
    if (decisionScope === undefined) return;
    if (!Array.isArray(decisionScope.nodeIds) || decisionScope.nodeIds.length === 0) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'decisionScope.nodeIds must be a non-empty array.'
      );
    }
    if (decisionScope.nodeIds.some((nodeId) => typeof nodeId !== 'string' || nodeId.length === 0)) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'decisionScope.nodeIds must contain only non-empty strings.'
      );
    }
    if (new Set(decisionScope.nodeIds).size !== decisionScope.nodeIds.length) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'decisionScope.nodeIds must not contain duplicates.'
      );
    }
    const decisionNodeIds = new Set(decisionScope.nodeIds);
    const missingNodeId = graphNodes.find((node) => !decisionNodeIds.has(node.nodeId))?.nodeId;
    if (missingNodeId !== undefined) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        `decisionScope must include executable graph node ${missingNodeId}.`
      );
    }
  }

  private assertEnvelopeShape(input: PlannerInputEnvelopeV1): void {
    if (typeof input !== 'object' || input === null) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, 'input must be an object.');
    }

    if (input.graphSource === undefined) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'No graph source provided: graphSource is required.'
      );
    }
  }

  private assertSelectionShape(selection: PlannerInputEnvelopeV1['selection']): void {
    if (typeof selection !== 'object' || selection === null) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, 'input.selection must be an object.');
    }
    if (!Array.isArray(selection.selectedNodeIds)) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'selection.selectedNodeIds must be an array.'
      );
    }
    for (const id of selection.selectedNodeIds) {
      if (typeof id !== 'string') {
        throw new PlannerError(
          PlannerErrorCode.INVALID_INPUT,
          'selection.selectedNodeIds must contain only strings.'
        );
      }
    }
  }
}
