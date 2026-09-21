/** Owned concern: assert actual graph fit, wheel zoom and semantic detail without changing the draft. */
export function verifyCompleteTreeFit(viewportSelector: string): void {
  cy.get('[data-slot="canvas-relational-tree-fit"]').click();
  cy.get(viewportSelector).should(($viewport) => {
    const viewport = $viewport[0].getBoundingClientRect();
    const cards = $viewport[0].querySelectorAll(
      '[data-slot="canvas-relational-tree-node"], [data-slot="canvas-relational-tree-output"]'
    );
    expect(cards.length).to.be.greaterThan(1);
    cards.forEach((card) => {
      const bounds = card.getBoundingClientRect();
      expect(bounds.left, 'node left within viewport').to.be.at.least(viewport.left);
      expect(bounds.right, 'node right within viewport').to.be.at.most(viewport.right);
      expect(bounds.top, 'node top within viewport').to.be.at.least(viewport.top);
      expect(bounds.bottom, 'node bottom within viewport').to.be.at.most(viewport.bottom);
    });
  });
}

export function verifyWheelZoom(viewportSelector: string): void {
  const zoomSelector = '[data-slot="canvas-relational-tree-zoom"]';
  cy.get(zoomSelector)
    .invoke('text')
    .then((initial) => {
      cy.get(viewportSelector).then(($viewport) => {
        const bounds = $viewport[0].getBoundingClientRect();
        cy.wrap($viewport).trigger('wheel', {
          eventConstructor: 'WheelEvent',
          deltaY: -120,
          cancelable: true,
          clientX: bounds.left + bounds.width / 2,
          clientY: bounds.top + bounds.height / 2,
        });
      });
      cy.get(zoomSelector)
        .should(($zoom) => {
          expect(Number.parseInt($zoom.text(), 10)).to.be.greaterThan(Number.parseInt(initial, 10));
        })
        .invoke('text')
        .then((enlarged) => {
          cy.get(viewportSelector).trigger('wheel', {
            eventConstructor: 'WheelEvent',
            deltaY: 120,
            cancelable: true,
          });
          cy.get(zoomSelector).should(($zoom) => {
            expect(Number.parseInt($zoom.text(), 10)).to.be.lessThan(Number.parseInt(enlarged, 10));
          });
        });
    });
}

export function revealSemanticZoom(viewportSelector: string, joinCount: number): void {
  cy.get('[data-slot="canvas-relational-tree-fit"]').click();
  cy.get('[data-slot="canvas-relational-semantic-zoom"]').should('not.exist');
  cy.get('[data-slot="canvas-relational-tree-zoom"]')
    .invoke('text')
    .then((label) => {
      const current = Number.parseFloat(label) / 100;
      cy.get(viewportSelector).trigger('wheel', {
        eventConstructor: 'WheelEvent',
        deltaY: -Math.log(1.3 / current) / 0.0015,
        cancelable: true,
      });
    });
  cy.get('[data-slot="canvas-relational-semantic-zoom"]').should('have.length', joinCount);
  cy.get('[data-slot="canvas-relational-semantic-zoom"]').each(($detail) => {
    cy.wrap($detail)
      .find('[data-slot="canvas-join-expression-node"]')
      .should('have.length.greaterThan', 2);
    expect($detail.attr('data-relation-id')).to.equal(
      $detail.find('[data-slot="canvas-join-expression-tree"]').attr('data-relation-id')
    );
  });
}
