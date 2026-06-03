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
  for (const nodeName of nodeNames) {
    cy.contains('.react-flow__node', nodeName).rightclick();
    cy.get('[role="menu"]').then(($menu) => {
      if ($menu.text().includes('Select node')) {
        cy.contains('[role="menuitem"]', 'Select node').click();
        return;
      }

      cy.get('body').type('{esc}');
    });
  }

  cy.get('[data-slot="canvas-toolbar-plan-command"]').should('be.enabled');
}
