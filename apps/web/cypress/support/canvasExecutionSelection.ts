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
    .should(($nodes) => {
      expect(
        filterVisibleCanvasNodes($nodes, nodeName).length,
        `visible node ${nodeName}`
      ).to.be.greaterThan(0);
    })
    .then(($nodes) => cy.wrap(filterVisibleCanvasNodes($nodes, nodeName).first()));
}

export function openCanvasNodeOperations(nodeName: string): void {
  getVisibleCanvasNode(nodeName)
    .find('[data-slot="graph-node-card-actions"]')
    .should('be.visible')
    .click();
  cy.get('[data-slot="canvas-node-context-menu"]').should('be.visible');
}

function filterVisibleCanvasNodes(
  $nodes: JQuery<HTMLElement>,
  nodeIdentity: string
): JQuery<HTMLElement> {
  const normalizedNodeIdentity = nodeIdentity.toLocaleLowerCase();

  return $nodes.filter((_, element) => {
    const text = (element.textContent ?? '').toLocaleLowerCase();
    const nodeId = element.getAttribute('data-id')?.toLocaleLowerCase();
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return (
      (nodeId === normalizedNodeIdentity || text.includes(normalizedNodeIdentity)) &&
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      style.opacity !== '0'
    );
  });
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

export function clickCanvasContextMenuAction(action: string): void {
  cy.get(`[data-slot="canvas-context-menu"] [data-menu-action="${action}"]`)
    .should('be.visible')
    .should('be.enabled')
    .click();
}

export function clickCanvasAddCatalogAction(action: string, registrationKind?: string): void {
  const selector = registrationKind
    ? `[data-slot="canvas-context-menu-add-catalog-item"][data-menu-action="${action}"][data-registration-kind="${registrationKind}"]`
    : `[data-slot="canvas-context-menu-add-catalog-item"][data-menu-action="${action}"]`;

  cy.get(selector).scrollIntoView().should('be.visible').should('be.enabled').click();
}

export function revealOperationalDrawer(): void {
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
          return;
        }

        cy.get('body').type('{esc}', { force: true });
      });
  });

  cy.get('[role="menu"]', { timeout: 20_000 }).should('not.exist');
  cy.get('[data-slot="bottom-operational-drawer-tab"]', { timeout: 20_000 }).should('be.visible');
}

export function clickPreviewExecutionPlanFromOperationalDrawer(): void {
  revealOperationalDrawer();
  cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="preview"]')
    .should('be.visible')
    .click();
  cy.get('[data-slot="bottom-operational-preview-action"]')
    .should('be.visible')
    .should('be.enabled')
    .then(($button) => {
      ($button.get(0) as HTMLButtonElement).click();
    });
}

export function expectPreviewExecutionPlanUnavailableFromCanvasContextMenu(): void {
  openCanvasContextMenuAt();
  cy.get('[data-slot="canvas-context-menu"]').should(
    'not.contain.text',
    'Create Execution Preview'
  );
  cy.get('[data-slot="canvas-context-menu"]').should('not.contain.text', 'Crear Execution Preview');
  cy.get('[data-slot="canvas-context-menu"]').should('not.contain.text', 'Preview execution plan');
  cy.get('[data-slot="canvas-context-menu"]').should('not.contain.text', 'Previsualizar plan');
  cy.get('body').type('{esc}', { force: true });
}

export function selectCanvasClosure(nodeNames: string[]): void {
  for (const nodeName of nodeNames) {
    openCanvasNodeOperations(nodeName);
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
