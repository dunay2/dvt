/** Observe actual output fields on the external Canvas card, not the editor tree. */
export function exteriorOutputColumns(nodeId: string): Cypress.Chainable<string[]> {
  const card = `.react-flow__node[data-id="${nodeId}"]`;
  cy.get(`${card} [data-slot="graph-node-column-toggle"]`).then(($toggle) => {
    if ($toggle.attr('aria-expanded') !== 'true') cy.wrap($toggle).click();
  });
  return cy
    .get(`${card} [data-slot="graph-node-column-output-state"][aria-pressed="true"]`)
    .should('have.length.greaterThan', 0)
    .then(($outputs) =>
      [...$outputs].map(
        (output) => output.closest<HTMLElement>('[data-column-name]')!.dataset.columnName!
      )
    );
}
