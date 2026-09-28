/** Owned concern: a four-source chain saves once, previews only on request and survives reopening. */
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import { authorFourSourceChain } from '../../support/relationalWorkbench/joinChain';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
  previewWorkbenchModel,
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
      const { index } = deriveSubstraitSchemas(
        decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(saves[0]!))
      );
      const entries = [...index.relations.values()];
      expect(entries.filter((entry) => entry.relation.relType.case === 'read')).to.have.length(4);
      expect(entries.filter((entry) => entry.relation.relType.case === 'join')).to.have.length(3);
    });
    cy.then(() => expect(getE2eApiCalls(/\/data-sample$/, 'GET')).to.have.length(0));
    previewWorkbenchModel();
    cy.get('[data-slot="bottom-operational-drawer-data"] table').should('contain.text', 'C-001');
    cy.screenshot('semantic-editor-data-preview');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitWorkbenchCanvas();
    openWorkbenchModel('join-transform');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').should(
      'have.length',
      3
    );
  });
});
