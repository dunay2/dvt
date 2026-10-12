/**
 * Owned concern: observe published fields on the external Model card in displayed order.
 * @baseline GH-3578: card Input/Output views inspect; authoring belongs to the Model editor.
 * @decision Select Output and read its rows rather than retired mutation controls.
 * @consequence Controlled and LIVE consumers share the same read-only observation.
 * @version 1.0.0
 */
export function exteriorOutputColumns(nodeId: string): Cypress.Chainable<string[]> {
  const card = `.react-flow__node[data-id="${nodeId}"]`;
  cy.contains(`${card} [role="tab"]`, /^Output \(/).click();
  cy.get(`${card} [data-slot="graph-node-column-toggle"]`).then(($toggle) => {
    if ($toggle.attr('aria-expanded') !== 'true') cy.wrap($toggle).click();
  });
  return cy
    .get(`${card} [data-slot="graph-node-column-piece"][data-column-name]`)
    .should('have.length.greaterThan', 0)
    .then(($outputs) => [...$outputs].map((output) => output.dataset.columnName!));
}
