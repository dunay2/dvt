/** Real formula authoring and read-only output inspection across the stateful save transport. */
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  authorLineageFormula,
  inspectLineageOutput,
} from '../../support/relationalWorkbench/formulaLineageJourney';
import { visitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Nested formula persistence', () => {
  it('authors two-field nesting, saves, reopens and inspects without additional writes', () => {
    cy.viewport(1200, 600);
    stubWorkbenchScenario('projection');
    visitWorkbenchCanvas();
    authorLineageFormula('transform-customers', 'COALESCE(TRIM(name), country)');
    let saved: unknown;
    cy.wrap(null).should(() => {
      saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body;
      expect(JSON.stringify(saved)).to.include('preferred_name');
    });
    visitWorkbenchCanvas();
    let writes: number;
    cy.then(() => {
      writes = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    inspectLineageOutput('transform-customers', 'coalesce(trim(name), country)');
    cy.get(
      '[data-slot="canvas-contextual-workbench"] button[aria-label="Fit graph to view"]'
    ).click();
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writes);
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body).to.deep.equal(saved);
    });
    cy.screenshot('nested-formula-reopened', { capture: 'viewport', scale: true });
  });
});
