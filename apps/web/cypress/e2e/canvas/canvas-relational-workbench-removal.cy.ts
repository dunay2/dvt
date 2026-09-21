/** Owned concern: contextual removal, cancel without writes and canonical save/reopen. */
import { decodeDvtSubstraitJoinDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitJoinComposition';
import { inspectDvtSubstraitProjectionDraft } from '../../../src/app/views/canvas/canvasDvtSubstraitProjection';
import { waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
} from '../../support/relationalWorkbench/navigation';
import {
  semanticWrites,
  semanticDocumentFromWrite,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Workbench removal', () => {
  beforeEach(() => {
    stubWorkbenchScenario('saved-join');
  });
  it('removes cards through their context menu, cancels without writes and persists canonical Substrait on Apply', () => {
    let baseline = 0;
    cy.viewport(1280, 800);
    visitWorkbenchCanvas();
    openWorkbenchModel('join-transform');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-node-title"]')
      .first()
      .should('have.css', 'font-size', '14px');
    cy.get('[data-slot="canvas-relational-tree-node"]')
      .first()
      .should('have.css', 'font-family')
      .and('contain', 'Segoe UI');
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.then(() => {
      baseline = semanticWrites('join-transform').length;
    });
    cy.get('[data-slot="dvt-select-operation-inner-join"]').should('not.exist');
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-slot="dvt-select-operation-inner-join"]').should('be.visible');
    cy.get('[role="combobox"]').type('UNION ALL');
    cy.get('[data-slot="dvt-select-operation-union-all"]').should('be.visible');
    cy.get('[role="combobox"]').type('{esc}');
    cy.get('[data-slot="dvt-select-operation-inner-join"]').should('not.exist');
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-slot="dvt-select-operation-inner-join"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.get('[role="combobox"]').type('{esc}');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').rightclick();
    cy.get('[data-slot="canvas-relational-remove-left"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-remove-left"]')
      .should('have.css', 'font-family')
      .and('contain', 'Segoe UI');
    cy.get('[data-slot="canvas-relational-remove-left"]').should('have.css', 'font-size', '14px');
    cy.screenshot('semantic-editor-card-context-menu');
    cy.get('[data-slot="canvas-relational-remove-left"]').click();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should(
      'have.length',
      1
    );
    cy.then(() => expect(semanticWrites('join-transform').length).to.equal(baseline));
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should(
      'have.length',
      2
    );
    cy.then(() => expect(semanticWrites('join-transform').length).to.equal(baseline));
    cy.contains(
      '[data-slot="canvas-relational-tree-node"][data-operator="read"]',
      'orders'
    ).rightclick();
    cy.get('[data-slot="canvas-relational-remove-source"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should(
      'have.length',
      1
    );
    cy.wrap(null).should(() =>
      expect(semanticWrites('join-transform').length).to.be.greaterThan(baseline)
    );
    cy.then(() => {
      const document = semanticDocumentFromWrite(semanticWrites('join-transform').at(-1)!);
      const draft = decodeDvtSubstraitJoinDocument(document);
      const inspection = inspectDvtSubstraitProjectionDraft(draft);
      expect(inspection.ok, 'saved canonical projection').to.equal(true);
      if (inspection.ok) expect(inspection.projection.source.table).to.equal('customers');
    });
    cy.get('[data-slot="canvas-model-view-tab"][data-view="sql"]').click();
    cy.get('[data-slot="canvas-model-sql"]')
      .should('contain.text', 'SELECT')
      .and('contain.text', 'customers')
      .and('not.contain.text', 'INNER JOIN');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitWorkbenchCanvas();
    openWorkbenchModel('join-transform');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should(
      'have.length',
      1
    );
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').should('not.exist');
  });
});
