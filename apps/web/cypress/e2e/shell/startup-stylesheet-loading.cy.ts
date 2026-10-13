/** Owned concern: prove externally loaded startup styles keep the pending gate operable. */
import { waitForE2eApiCall } from '../../support/e2eApiStub';
import { visitCanvasWithPendingCapabilities } from '../../support/startupReadiness';
import { stubShellBootstrapApis } from '../../support/workspaceSession';

describe('Startup stylesheet loading', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
    stubShellBootstrapApis();
  });

  it('loads external startup appearance while readiness is pending', () => {
    const releaseCapabilities = visitCanvasWithPendingCapabilities();
    waitForE2eApiCall('/capabilities', 'GET');
    cy.document().should((document) => {
      const stylesheets = Array.from(
        document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
      );
      expect(stylesheets.slice(0, 2).map(({ href }) => new URL(href).pathname)).to.deep.equal([
        '/cascade-layers.css',
        '/app-bootstrap-screen.css',
      ]);
      const bootstrapSheet = stylesheets[1]!.sheet;
      expect(bootstrapSheet, 'actual public startup stylesheet').not.to.be.null;
      expect(bootstrapSheet!.disabled, 'active startup stylesheet').to.equal(false);
      expect(bootstrapSheet!.cssRules.length, 'loaded startup CSS rules').to.be.greaterThan(0);
    });
    cy.get('#app-loading-screen')
      .should('be.visible')
      .and('not.have.attr', 'data-state', 'complete')
      .should(($screen) => {
        const screen = $screen[0]!;
        const bounds = screen.getBoundingClientRect();
        const viewport = screen.ownerDocument.documentElement;
        expect(bounds.left).to.be.at.most(0);
        expect(bounds.top).to.be.at.most(0);
        expect(bounds.right).to.be.at.least(viewport.clientWidth);
        expect(bounds.bottom).to.be.at.least(viewport.clientHeight);
      });
    cy.get('#app-loading-status').should('be.visible');
    cy.get('#app-loading-title').should('be.visible');
    cy.then(() => releaseCapabilities());
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.get('#app-loading-screen').should('not.exist');
  });
});
