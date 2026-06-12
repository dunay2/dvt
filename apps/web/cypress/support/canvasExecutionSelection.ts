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

export function openCanvasContextMenu(): void {
  cy.get('body').type('{esc}', { force: true });
  cy.get('[data-slot="canvas-viewport-context-surface"]', { timeout: 20_000 }).then(($surface) => {
    const surface = $surface.get(0);
    const rect = surface.getBoundingClientRect();

    cy.wrap($surface).trigger('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
      buttons: 2,
      clientX: Math.round(rect.left + 96),
      clientY: Math.round(rect.top + 220),
      pageX: Math.round(window.scrollX + rect.left + 96),
      pageY: Math.round(window.scrollY + rect.top + 220),
      which: 3,
      force: true,
    });
  });
  cy.get('[data-slot="canvas-context-menu"]').should('be.visible');
}

export function clickPreviewExecutionPlanFromCanvasContextMenu(): void {
  openCanvasContextMenu();
  cy.contains('[data-slot="canvas-context-menu"] [role="menuitem"]', 'Preview execution plan')
    .should('be.visible')
    .should('be.enabled')
    .then(($button) => {
      ($button.get(0) as HTMLButtonElement).click();
    });
}

export function expectPreviewExecutionPlanUnavailableFromCanvasContextMenu(): void {
  openCanvasContextMenu();
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
