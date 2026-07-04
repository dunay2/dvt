/**
 * Owned concern: provide the governed Cypress interaction seam for Canvas
 * selection and native button clicks used by selected-closure proof lanes.
 */
type CanvasMenuLabel = string | RegExp;

export function clickButtonNatively(label: string): void {
  cy.contains('button', label)
    .should('be.enabled')
    .then(($button) => {
      ($button.get(0) as HTMLButtonElement).click();
    });
}

export function getVisibleCanvasNode(nodeName: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .get('.react-flow__node', { timeout: 20_000 })
    .filter((_, element) => {
      const text = element.textContent ?? '';
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);

      return (
        text.includes(nodeName) &&
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
      );
    })
    .should('have.length.greaterThan', 0)
    .first();
}

export function openCanvasContextMenuAt(x = 96, y = 220): void {
  cy.get('body').type('{esc}', { force: true });
  cy.get('.react-flow__pane', { timeout: 20_000 }).should('be.visible').rightclick(x, y, {
    force: true,
  });
  cy.get('[data-slot="canvas-context-menu"]').should('be.visible');
}

export function clickCanvasContextMenuItem(label: CanvasMenuLabel): void {
  cy.contains('[data-slot="canvas-context-menu"] [role="menuitem"]', label)
    .should('be.visible')
    .should('be.enabled')
    .click();
}

function revealOperationalDrawer(): void {
  cy.get('body').then(($body) => {
    if ($body.find('[data-slot="bottom-operational-drawer-tab"]').length > 0) {
      return;
    }

    cy.get('[data-slot="shell-menu-trigger"]').should('be.visible').click();
    cy.contains('[role="menuitemcheckbox"]', /^(Operations|Operaciones)$/)
      .should('be.visible')
      .then(($item) => {
        if ($item.attr('aria-checked') !== 'true') {
          cy.wrap($item).click();
        }
      });
  });

  cy.get('[data-slot="bottom-operational-drawer-tab"]', { timeout: 20_000 }).should('be.visible');
}

export function clickPreviewExecutionPlanFromOperationalDrawer(): void {
  revealOperationalDrawer();
  cy.contains('[data-slot="bottom-operational-drawer-tab"]', 'Preview')
    .should('be.visible')
    .click();
  cy.contains('[data-slot="bottom-operational-drawer-preview"] button', 'Preview execution plan')
    .should('be.visible')
    .should('be.enabled')
    .then(($button) => {
      ($button.get(0) as HTMLButtonElement).click();
    });
}

export function expectPreviewExecutionPlanUnavailableFromCanvasContextMenu(): void {
  openCanvasContextMenuAt();
  cy.get('[data-slot="canvas-context-menu"]').should('not.contain.text', 'Preview execution plan');
  cy.get('[data-slot="canvas-context-menu"]').should('not.contain.text', 'Previsualizar plan');
  cy.get('body').type('{esc}', { force: true });
}

export function selectCanvasClosure(nodeNames: string[]): void {
  for (const nodeName of nodeNames) {
    getVisibleCanvasNode(nodeName).rightclick();
    cy.get('[data-slot="canvas-node-context-menu"]').then(($menu) => {
      if ($menu.text().includes('Select for execution')) {
        cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Select for execution').click();
        return;
      }

      if ($menu.text().includes('Select node')) {
        cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Select node').click();
        return;
      }

      cy.get('body').type('{esc}');
    });
  }
}
