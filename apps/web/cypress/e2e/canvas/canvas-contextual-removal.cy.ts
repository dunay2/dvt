import {
  openEditor,
  activateMenu,
  addWrapper,
} from '../../support/relationalWorkbench/operatorEditor';

describe('contextual-removal', () => {
  it('activates context menus below wrappers and preserves the draft between main workspace tabs', () => {
    openEditor(false, false, true);
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'shipments').click();
    cy.get('[data-slot="canvas-relational-tree-existing-field"]').select('customer_id');
    cy.get('[data-slot="canvas-relational-tree-connected-field"]').select('customer_id');
    cy.get('[data-slot="canvas-relational-tree-append-input"]').click();
    cy.get('[data-operator="join"]').first().click();
    addWrapper('aggregate');
    cy.get('[data-operator="aggregate"]').click();
    addWrapper('window');
    cy.get('[data-operator="join"]').should('have.length', 2).first().rightclick();
    activateMenu('canvas-relational-edit-operation');
    cy.get('[data-slot="semantic-workbench-join-condition-editor"]').should('be.visible');
    let catalogueContextEvent: Event | null = null;
    cy.document().then((document) => {
      document.addEventListener(
        'contextmenu',
        (event) => {
          catalogueContextEvent = event;
        },
        { once: true, capture: true }
      );
    });
    cy.get('[data-slot="canvas-relational-tree-source"]')
      .first()
      .find('span.block.truncate')
      .rightclick();
    cy.then(() =>
      expect(catalogueContextEvent?.defaultPrevented, 'no native menu in the editor').to.equal(true)
    );
    cy.get('[data-slot="shell-top-bar"] [data-slot="canvas-workspace-tab"]').click();
    cy.get('[data-slot="canvas-model-editor"]').should('not.be.visible');
    cy.get('[data-slot="canvas-model-main-tab"]').click();
    cy.get('[data-operator="join"]').should('have.length', 2);
    cy.get('[data-slot="semantic-workbench-join-condition-editor"]').should('be.visible');
    cy.get('[data-operator="join"]').first().rightclick();
    activateMenu('canvas-relational-remove-left');
    cy.get('[data-operator="join"]').should('have.length', 1);
    cy.get('[data-operator="aggregate"]').should('have.length', 1);
    cy.contains('[data-operator="project"]', 'Window').should('be.visible');
    cy.get('[data-operator="join"]').rightclick();
    activateMenu('canvas-relational-remove-right');
    cy.get('[role="alertdialog"]')
      .should('contain.text', 'AGGREGATE')
      .and('contain.text', 'WINDOW');
    cy.contains('[role="alertdialog"] button', 'Keep editing').click();
    cy.get('body').should('not.have.css', 'pointer-events', 'none');
    cy.get('[data-operator="join"]').should('have.length', 1).rightclick();
    activateMenu('canvas-relational-remove-right');
    cy.get('[data-slot="canvas-relational-removal-confirm"]').click();
    cy.get('[data-operator="join"], [data-operator="aggregate"]').should('not.exist');
    cy.get('[data-operator="read"]').should('have.length', 1);
    cy.get('[data-slot="canvas-relational-node-title"]').should('not.contain.text', 'Window');
    cy.screenshot('workspace-tabs-contextual-removal');
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-operator="join"]').should('have.length', 1);
  });
});
