/** Compose two transformed producers through explicit ports; Apply and Cancel stay atomic. */
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
  dragWorkbenchSource,
  connectWorkbenchProducer,
} from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import { semanticWrites } from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Workbench pending binary operations', () => {
  beforeEach(() => {
    cy.viewport(1440, 900);
    stubWorkbenchScenario('pending-join');
    visitWorkbenchCanvas();
    openWorkbenchModel();
  });

  it('cancels a connected JOIN without publishing semantic changes', () => {
    for (const [port, source] of ['customers', 'orders'].entries()) {
      dragWorkbenchSource(source);
      cy.contains('[data-slot="canvas-relational-tree-node"][data-operator="read"]', source)
        .closest('li')
        .as('producer' + port);
    }
    workbenchOperation('inner_join').click();
    cy.get('[data-pending-operation="true"]').last().as('join', { type: 'static' });
    connectWorkbenchProducer('@producer0', '@join', 0);
    connectWorkbenchProducer('@producer1', '@join', 1);
    cy.get('[data-slot="canvas-staged-operation-inspector"]').should('contain.text', 'INNER JOIN');
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-pending-operation="true"]').should('not.exist');
    cy.wrap(null).should(() => expect(semanticWrites('join-transform')).to.have.length(0));
  });

  it('keeps Filter Output, focus and viewport while selecting and moving columns', () => {
    dragWorkbenchSource('customers');
    cy.contains('[data-slot="canvas-relational-tree-node"][data-operator="read"]', 'customers')
      .closest('li')
      .as('producer', { type: 'static' });
    workbenchOperation('field_transform').click();
    cy.get('[data-pending-operation="true"]').last().as('transform', { type: 'static' });
    connectWorkbenchProducer('@producer', '@transform');
    workbenchOperation('filter').click();
    cy.get('[data-pending-operation="true"]').last().as('filter', { type: 'static' });
    connectWorkbenchProducer('@transform', '@filter');
    cy.get('[data-slot="canvas-relational-operator-form"] input').type('active');
    cy.get('[data-slot="canvas-relational-operator-form"] button[type="submit"]').click();
    cy.get('@filter').find('[data-slot="canvas-relational-tree-node"]').click();
    cy.get('[data-slot="canvas-operation-output-tab"]').click().as('outputTab', { type: 'static' });
    cy.get('[data-canvas-inspector]').as('inspector', { type: 'static' });
    const row = '[data-slot="relation-output-field"]';
    cy.get(row).first().as('firstRow', { type: 'static' });
    cy.get('@firstRow')
      .find('input[type="checkbox"]')
      .focus()
      .uncheck()
      .should('not.be.checked')
      .and('be.focused');
    cy.get('@outputTab').should('have.attr', 'aria-selected', 'true');
    cy.get('@firstRow')
      .find('input[type="checkbox"]')
      .check()
      .should('be.checked')
      .and('be.focused');
    cy.window().then((window) => {
      const dataTransfer = new window.DataTransfer();
      cy.get('@firstRow').focus().trigger('dragstart', { dataTransfer });
      cy.get(row)
        .eq(1)
        .then(($target) => {
          const bounds = $target[0]!.getBoundingClientRect();
          cy.wrap($target)
            .trigger('dragover', { dataTransfer, clientY: bounds.bottom - 1 })
            .trigger('drop', { dataTransfer });
        });
      cy.get('@firstRow').trigger('dragend', { dataTransfer });
    });
    cy.get('@firstRow')
      .should('be.focused')
      .then(($first) => {
        cy.get(row)
          .eq(1)
          .should(($moved) => expect($moved[0]).to.equal($first[0]));
      });
    cy.get('@firstRow').trigger('keydown', { key: 'ArrowUp', altKey: true }).should('be.focused');
    cy.get('@outputTab').should('have.attr', 'aria-selected', 'true');
    cy.get('@inspector')
      .should('be.visible')
      .then(($original) => {
        cy.get('[data-canvas-inspector]').should(($current) =>
          expect($current[0]).to.equal($original[0])
        );
      });
    cy.then(() => {
      expect(semanticWrites('join-transform')).to.have.length(0);
      expect(getE2eApiCalls(/data-sample/, 'GET')).to.have.length(0);
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
  });

  for (const operation of ['inner_join', 'cross_join', 'union_all']) {
    it('applies and reopens ' + operation + ' with two transformed producers', () => {
      for (const [port, source] of ['customers', 'orders'].entries()) {
        dragWorkbenchSource(source);
        cy.contains('[data-slot="canvas-relational-tree-node"][data-operator="read"]', source)
          .closest('li')
          .as('producer' + port);
        workbenchOperation('field_transform').click();
        cy.get('[data-pending-operation="true"]')
          .last()
          .as('transform' + port, { type: 'static' });
        connectWorkbenchProducer('@producer' + port, '@transform' + port);
        cy.get('[data-slot="canvas-transform-inspector"]').should('be.visible');
      }
      workbenchOperation(operation).click();
      cy.get('[data-pending-operation="true"]').last().as('binary', { type: 'static' });
      connectWorkbenchProducer('@transform0', '@binary', 0);
      connectWorkbenchProducer('@transform1', '@binary', 1);
      cy.get('[data-slot="canvas-staged-operation-inspector"]')
        .should('be.visible')
        .find('[data-slot="canvas-operation-output-tab"]')
        .click();
      cy.get('[data-slot="canvas-staged-operation-inspector"] input[type="checkbox"]').should(
        'have.length.greaterThan',
        0
      );
      connectWorkbenchProducer(
        '@binary',
        '[data-slot="canvas-relational-output-input-port"]',
        null
      );
      cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
      cy.get('[data-pending-operation="true"]').should('not.exist');
      cy.get('[data-slot="canvas-relational-tree-node"][data-operator="project"]').should(
        'have.length',
        2
      );
      cy.wrap(null).should(() => expect(semanticWrites('join-transform')).to.have.length(1));
      visitWorkbenchCanvas();
      openWorkbenchModel();
      cy.get('[data-slot="canvas-relational-tree-node"][data-operator="project"]').should(
        'have.length',
        2
      );
      const operator =
        operation === 'inner_join' ? 'join' : operation === 'cross_join' ? 'cross' : 'set';
      cy.get('[data-slot="canvas-relational-tree-node"][data-operator="' + operator + '"]')
        .should('have.length', 1)
        .click();
      cy.get('[data-slot="canvas-operation-output-tab"]').should('be.visible');
    });
  }
});
