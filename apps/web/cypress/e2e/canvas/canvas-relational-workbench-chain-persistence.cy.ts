/** Owned concern: a four-source chain saves once, previews only on request and survives reopening. */
import {
  decodeDvtSubstraitJoinDocument,
  inspectDvtSubstraitJoinDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitJoinComposition';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import { authorFourSourceChain } from '../../support/relationalWorkbench/joinChain';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
} from '../../support/relationalWorkbench/navigation';
import {
  semanticWrites,
  semanticDocumentFromWrite,
} from '../../support/relationalWorkbench/persistence';
import { stubSavedWorkbenchSample } from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Workbench chain-persistence', () => {
  beforeEach(() => {
    stubWorkbenchScenario('pending-chain');
    stubSavedWorkbenchSample();
  });
  it('saves the complete chain before an explicit model sample and reloads it', () => {
    authorFourSourceChain();
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.wrap(null).should(() => {
      const saves = semanticWrites('join-transform');
      expect(saves).to.have.length(1);
      const inspection = inspectDvtSubstraitJoinDraft(
        decodeDvtSubstraitJoinDocument(semanticDocumentFromWrite(saves[0]!))
      );
      expect(inspection.ok).to.equal(true);
      if (!inspection.ok) throw new Error('Expected a persisted four-source JOIN chain');
      expect(inspection.projection.inputs).to.have.length(4);
      expect(inspection.projection.joinRelations).to.have.length(3);
    });
    cy.get('[data-slot="canvas-model-view-tab"][data-view="sql"]').click();
    cy.get('[data-slot="canvas-model-sql"]').should('contain.text', 'SELECT');
    cy.get('[data-slot="canvas-model-view-tab"][data-view="data"]').click();
    cy.then(() => expect(getE2eApiCalls(/\/data-sample$/, 'GET')).to.have.length(0));
    cy.get('[data-slot="canvas-model-preview"]').click();
    cy.get('[data-slot="canvas-model-data"] table').should('contain.text', 'C-001');
    cy.screenshot('semantic-editor-data-preview');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitWorkbenchCanvas();
    openWorkbenchModel('join-transform');
    cy.get('[data-slot="canvas-relational-tree"] [data-operator="join"]').should('have.length', 3);
  });
});
