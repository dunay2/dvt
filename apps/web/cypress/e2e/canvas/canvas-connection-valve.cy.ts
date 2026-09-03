/** Owned concern: prove the persisted Canvas connection valve browser round trip. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Canvas connection valve', () => {
  it('closes and reopens an edge through the canonical persisted command', () => {
    const edge = '.react-flow__edge[data-id="edge-source-transform"]';
    const closedGate = `${edge} [data-slot="canvas-dependency-closed-gate"]`;
    const waitForCalls = (method: 'GET' | 'PUT', count: number): Cypress.Chainable =>
      cy.wrap(null, { timeout: 20_000 }).should(() => {
        expect(getE2eApiCalls('/workspace/graph/draft', method)).to.have.length(count);
      });
    const visitCanvas = (readCount: number): void => {
      visitWithE2eWorkspaceSession('/canvas');
      waitForE2eApiCall('/capabilities', 'GET');
      waitForCalls('GET', readCount);
      cy.get(edge).should('be.visible');
    };
    const toggleGate = (): void => {
      cy.get(edge).rightclick({ force: true });
      cy.get('[data-menu-action="set-execution-gate"]').should('be.visible').click();
    };
    const expectSavedGate = (gate: 'open' | 'closed'): void => {
      cy.then(() => {
        const body = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as {
          draft: { edges: Array<{ id: string; metadata?: { executionGate?: string } }> };
        };
        const savedEdge = body.draft.edges.find(({ id }) => id === 'edge-source-transform');
        expect(savedEdge?.metadata?.executionGate).to.equal(
          gate === 'closed' ? 'closed' : undefined
        );
      });
    };

    stubShellBootstrapApis();
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: { dvt: { available: true } },
    });
    stubStatefulCanvasDraftAuthoring({ authoringGenerated: true });

    visitCanvas(1);
    cy.get(closedGate).should('not.exist');
    toggleGate();
    cy.get(closedGate).should('exist');
    cy.get(`${edge} .react-flow__edge-path`)
      .should('have.attr', 'style')
      .and('include', 'stroke-dasharray');
    waitForCalls('PUT', 1);
    waitForCalls('GET', 2);
    expectSavedGate('closed');

    visitCanvas(3);
    cy.get(closedGate).should('exist');
    toggleGate();
    cy.get(closedGate).should('not.exist');
    waitForCalls('PUT', 2);
    waitForCalls('GET', 4);
    expectSavedGate('open');

    visitCanvas(5);
    cy.get(closedGate).should('not.exist');
  });
});
