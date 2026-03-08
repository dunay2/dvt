/**
 * Design (SOLID + SRP):
 *   Sole responsibility: assert structural invariants on PlannerInputEnvelopeV2
 *   before the planner pipeline begins. Knows nothing about graph, limits or hashing.
 */
import { PlannerError, PlannerErrorCode } from './errors.js';
import type { PlannerInputEnvelopeV2 } from './types.js';

export class InputEnvelopeValidator {
  validate(input: PlannerInputEnvelopeV2): void {
    this.assertEnvelopeShape(input);
    this.assertSelectionShape(input.selection);
  }

  private assertEnvelopeShape(input: PlannerInputEnvelopeV2): void {
    if (typeof input !== 'object' || input === null) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, 'input must be an object.');
    }
    if (input.manifest === undefined && !Array.isArray(input.nodes)) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'input.nodes must be an array when manifest is not provided.'
      );
    }
  }

  private assertSelectionShape(selection: PlannerInputEnvelopeV2['selection']): void {
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
