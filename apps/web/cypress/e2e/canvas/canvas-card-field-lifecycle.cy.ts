/** The same field controls work for a binary relation and a composed result. */
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
