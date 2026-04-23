import { describe, expect, it } from 'vitest';

import {
  ContractValidationError,
  parseExecutableSubgraph,
  parseExecutionSelection,
} from '../../src/validation.js';

export function registerValidationExecutionSelectionSuite(): void {
  describe('execution selection contracts', () => {
    it('parses canonical execution selection payloads', () => {
      const selection = parseExecutionSelection({
        mode: 'explicit',
        nodeIds: ['sql_1'],
      });

      expect(selection.mode).toBe('explicit');
      expect(selection.nodeIds).toEqual(['sql_1']);
    });

    it('rejects empty nodeIds in execution selection payloads', () => {
      expect(() =>
        parseExecutionSelection({
          mode: 'explicit',
          nodeIds: [],
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects executable selected closures that still carry diagnostics', () => {
      expect(() =>
        parseExecutableSubgraph({
          selection: {
            mode: 'connected_component',
            nodeIds: ['sql_1'],
          },
          nodeIds: ['sql_1'],
          edgeIds: [],
          executable: true,
          diagnostics: [
            {
              code: 'cycle_detected',
              message: 'Cycle detected in selected closure.',
              edgeIds: ['edge_1'],
            },
          ],
        })
      ).toThrow(ContractValidationError);
    });
  });
}
