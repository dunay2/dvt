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

export function openCanvasContextMenuAt(x = 96, y = 220): void {
  cy.get('body').type('{esc}', { force: true });
  cy.get('.react-flow__pane', { timeout: 20_000 }).should('be.visible').rightclick(x, y, {
    force: true,
  });
  cy.get('[data-slot="canvas-context-menu"]').should('be.visible');
}

export function clickCanvasContextMenuItem(label: string): void {
  cy.contains('[data-slot="canvas-context-menu"] [role="menuitem"]', label)
    .should('be.visible')
    .should('be.enabled')
    .click();
}

export function clickPreviewExecutionPlanFromCanvasContextMenu(): void {
  openCanvasContextMenuAt();
  clickCanvasContextMenuItem('Preview execution plan');
}

export function expectPreviewExecutionPlanUnavailableFromCanvasContextMenu(): void {
  openCanvasContextMenuAt();
  cy.get('[data-slot="canvas-context-menu"]').should('not.contain.text', 'Preview execution plan');
  cy.get('body').type('{esc}', { force: true });
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
}
