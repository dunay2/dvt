/**
 * Owned concern: report serious and critical violations in visible browser surfaces.
 * @baseline GH-3920: Extract unchanged proof from the existing Shell composition spec.
 * @consequence Scenario order, fixtures and browser obligations remain owned by the spec.
 */
export function assertNoSeriousAccessibilityViolations(context: string): void {
  cy.get(context).should('be.visible');
  cy.injectAxe();
  cy.checkA11y(
    context,
    {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
      includedImpacts: ['serious', 'critical'],
    },
    (violations) => {
      if (violations.length === 0) {
        return;
      }
      throw new Error(
        violations
          .map(
            (violation) =>
              `${violation.id}: ${violation.help} -> ${violation.nodes
                .map((node) => `${node.target.join(' ')}: ${node.failureSummary}`)
                .join(', ')}`
          )
          .join('\n')
      );
    }
  );
}
