/** Owned concern: exercise the explicit operation-discovery gesture, never infer admission. */
export function openWorkbenchOperations(): void {
  cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
  cy.get('[role="listbox"]').should('be.visible');
}

export function workbenchOperation(id: string): Cypress.Chainable<JQuery<HTMLElement>> {
  openWorkbenchOperations();
  return cy.get(`[data-operation="${id}"]`);
}

export function closeWorkbenchOperations(): void {
  cy.get('[role="combobox"]').type('{esc}');
  cy.get('[role="listbox"]').should('not.exist');
}
