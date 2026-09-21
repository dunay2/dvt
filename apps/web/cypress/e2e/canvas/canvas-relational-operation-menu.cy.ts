/** Owned concern: discover operations with keyboard, without changing semantics until Apply. */
import {
  openWorkbenchModel,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { semanticWrites } from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const trigger = '[data-slot="canvas-operation-menu-trigger"]';
const search = '[role="combobox"]';

describe('Compact semantic operation menu', () => {
  beforeEach(() => {
    stubWorkbenchScenario('pending-join');
    cy.viewport(1280, 800);
    visitWorkbenchCanvas();
    openWorkbenchModel();
  });
  it('keeps one entry at rest, searches all groups and restores focus without writes', () => {
    cy.get('[data-slot="canvas-relational-tree-operation-shelf"] button').should('have.length', 1);
    cy.get('[role="listbox"]').should('not.exist');
    cy.get(trigger)
      .focus()
      .should('be.focused')
      .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));
    cy.get(search).should('be.focused');
    cy.get('[data-operation="filter"]')
      .should('have.attr', 'aria-disabled', 'true')
      .and('contain.text', 'Select a source');
    cy.get(search).type('does-not-exist');
    cy.contains('No matching operations.').should('be.visible');
    cy.get(search).type('{esc}');
    cy.get(trigger).should('be.focused');
    cy.get('[role="listbox"]').should('not.exist');
    cy.then(() => expect(semanticWrites('join-transform')).to.have.length(0));
  });
  it('chooses the exact JOIN by search and keyboard, then cancels without persisting it', () => {
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'orders').click();
    cy.get(trigger).click();
    for (const heading of ['Combine', 'Transform', 'Order and limit']) {
      cy.contains('[cmdk-group-heading]', heading).should('exist');
    }
    cy.screenshot('operation-menu-groups');
    cy.get(search).type('LEFT JOIN');
    cy.get('[role="option"][data-selected="true"]').should('contain.text', 'LEFT JOIN');
    cy.get(search).type('{enter}');
    cy.get('[role="listbox"]').should('not.exist');
    cy.get('[data-operator="join"]').should('contain.text', 'LEFT JOIN');
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-operator="join"]').should('not.exist');
    cy.then(() => expect(semanticWrites('join-transform')).to.have.length(0));
  });
  it('keeps the menu inside a narrow viewport and closes on outside activation', () => {
    cy.viewport(820, 700);
    cy.get(trigger).click();
    cy.get('[data-slot="popover-content"]').then(($menu) => {
      const bounds = $menu[0]!.getBoundingClientRect();
      expect(bounds.left).to.be.at.least(0);
      expect(bounds.right).to.be.at.most(820);
    });
    cy.screenshot('compact-operation-menu');
    cy.get('[data-slot="canvas-relational-tree-source"]').first().click();
    cy.get('[role="listbox"]').should('not.exist');
    cy.then(() => expect(semanticWrites('join-transform')).to.have.length(0));
  });
});
