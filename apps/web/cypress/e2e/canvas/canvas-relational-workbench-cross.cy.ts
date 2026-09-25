/** Owned concern: CrossRel authoring, contextual removal and revision-bound selected-stage preview. */
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls } from '../../support/e2eApiStub';
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

describe('Workbench cross', () => {
  beforeEach(() => {
    stubWorkbenchScenario('pending-chain');
    stubSavedWorkbenchSample();
  });
  it('authors CROSS JOIN explicitly, previews a selected stage and survives reload', () => {
    cy.viewport(1400, 900);
    visitWorkbenchCanvas();

    openWorkbenchModel('join-transform');
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'orders').click();
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-slot="dvt-select-operation-cross-join"]')
      .should('have.attr', 'aria-disabled', 'false')
      .click();
    cy.get('[data-slot="canvas-relational-cross-warning"]').should('be.visible');
    cy.get('[data-slot="dvt-substrait-join-predicate-editors"]').should('not.exist');
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'shipments').click();
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="cross"]').should(
      'have.length',
      2
    );
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();

    cy.wrap(null).should(() => {
      const write = semanticWrites('join-transform').at(-1);
      expect(write).not.to.equal(undefined);
      if (write == null) return;
      const { index } = deriveSubstraitSchemas(
        decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(write))
      );
      const entries = [...index.relations.values()];
      expect(entries.filter((entry) => entry.relation.relType.case === 'read')).to.have.length(3);
      expect(entries.filter((entry) => entry.relation.relType.case === 'cross')).to.have.length(2);
    });

    cy.get('[data-operator="cross"]')
      .first()
      .parent()
      .find('[data-slot="canvas-node-execute"]')
      .focus()
      .click();
    cy.get('[data-slot="canvas-operation-data-preview"] table').should('contain.text', 'C-001');
    cy.then(() => {
      const call = getE2eApiCalls(/\/data-sample/, 'GET').at(-1);
      expect(call?.url.searchParams.get('relationId')).to.not.equal(null);
    });

    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="cross"]').last().rightclick();
    cy.get('[data-slot="canvas-relational-remove-left"]').should('be.visible').click();
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="cross"]').should(
      'have.length',
      1
    );
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-slot="canvas-relational-tree"] [data-operator="cross"]').should('have.length', 2);

    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitWorkbenchCanvas();
    openWorkbenchModel('join-transform');
    cy.get('[data-slot="canvas-relational-tree"] [data-operator="cross"]').should('have.length', 2);
  });
});
