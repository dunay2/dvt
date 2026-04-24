/**
 * Owned concern: provide the governed Cypress interaction seam for Canvas
 * selection and native button clicks used by selected-closure proof lanes.
 */
export function clickButtonNatively(label: string): void {
  cy.contains('button', label)
    .should('be.enabled')
    .then(($button) => {
      ($button.get(0) as HTMLButtonElement).click();
    });
}

export function selectCanvasClosure(nodeNames: string[]): void {
  cy.get('body').trigger('keydown', {
    key: 'Shift',
    code: 'ShiftLeft',
    shiftKey: true,
    bubbles: true,
    force: true,
  });

  for (const nodeName of nodeNames) {
    cy.contains('.react-flow__node', nodeName).click({ force: true });
  }

  cy.get('body').trigger('keyup', {
    key: 'Shift',
    code: 'ShiftLeft',
    bubbles: true,
    force: true,
  });
  cy.get('.react-flow__node.selected').should('have.length', nodeNames.length);
}
