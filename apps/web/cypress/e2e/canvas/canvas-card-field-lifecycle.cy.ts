/**
 * Owned concern: preserve field lifecycle evidence for binary and composed Model outputs.
 * @baseline GH-3578: current controls retain selection, focus, order and disconnection coverage.
 * @decision Reuse one inspector journey for two and three canonical source operands.
 * @consequence Reload must preserve outputs without rewriting operands or predicates.
 * @version 1.0.0
 */
import { proveCardOutputControls } from '../../support/relationalWorkbench/cardOutputControls';
import { proveEmptyJoinOutput } from '../../support/relationalWorkbench/emptyOutputs';
import { prepareFieldSelection } from '../../support/relationalWorkbench/fieldSelection';

describe('Canvas field lifecycle', () => {
  for (const sourceCount of [2, 3] as const) {
    it(`preserves focus, output selection, ordering and reload with ${sourceCount} inputs`, () => {
      prepareFieldSelection(sourceCount);
      proveCardOutputControls(sourceCount);
    });
    it(`clears all outputs with ${sourceCount} inputs, disconnected sources and reload`, () => {
      prepareFieldSelection(sourceCount);
      proveEmptyJoinOutput(sourceCount);
    });
  }
});
