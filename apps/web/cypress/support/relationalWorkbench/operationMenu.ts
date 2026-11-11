/** Owned concern: exercise the explicit operation-discovery gesture, never infer admission. */
export function openWorkbenchOperations(): void {
  cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
  cy.get('[role="listbox"]').should('be.visible');
}

export function workbenchOperation(id: string): Cypress.Chainable<JQuery<HTMLElement>> {
  openWorkbenchOperations();
  return cy.get(`[data-operation="${id}"]`);
}

/** Card identity selectors are also comboboxes; only the open command input owns search. */
export function workbenchOperationSearch(): Cypress.Chainable<JQuery<HTMLInputElement>> {
  return cy
    .get<HTMLInputElement>('[data-slot="popover-content"] [data-slot="command-input"]')
    .should('have.length', 1)
    .and('have.attr', 'role', 'combobox');
}

export function closeWorkbenchOperations(): void {
  workbenchOperationSearch().type('{esc}');
  cy.get('[role="listbox"]').should('not.exist');
}
