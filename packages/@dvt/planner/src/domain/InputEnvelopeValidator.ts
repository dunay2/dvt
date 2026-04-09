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
