/**
 * Owned concern: assert workbench dialog, footer and document viewport containment.
 * @baseline GH-3920: Extract unchanged proof from the existing Shell composition spec.
 * @consequence Scenario order, fixtures and browser obligations remain owned by the spec.
 */
export function assertViewportHasNoGlobalHorizontalOverflow(expectedWidth: number): void {
  cy.document().should((document) => {
    expect(document.documentElement.scrollWidth).to.be.at.most(expectedWidth);
  });
}

export function assertCanvasPropertiesFitsViewport(width: number, height: number): void {
  cy.get('[data-slot="canvas-settings-dialog"]').should(($dialog) => {
    const rect = $dialog.get(0).getBoundingClientRect();
    expect(rect.left).to.be.at.least(0);
    expect(rect.right).to.be.at.most(width);
    expect(rect.top).to.be.at.least(0);
    expect(rect.bottom).to.be.at.most(height);
  });
  cy.get('[data-slot="workbench-properties-footer"]').should(($footer) => {
    const rect = $footer.get(0).getBoundingClientRect();
    expect(rect.top).to.be.at.least(0);
    expect(rect.bottom).to.be.at.most(height);
  });
  assertViewportHasNoGlobalHorizontalOverflow(width);
}
