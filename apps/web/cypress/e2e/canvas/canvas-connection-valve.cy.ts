/** Owned concern: prove the persisted Canvas connection valve browser round trip. */
import { normalizeProjectCanvasDraft } from '../../../src/app/views/canvas/canvasProjectCanvasLifecycle';
import { getE2eApiCalls, waitForE2eApiCall } from '../../support/e2eApiStub';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';
import { visitWithE2eWorkspaceSession } from '../../support/workspaceSession';

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

    const draft = stubWorkbenchScenario('generated');
    Object.assign(
      draft,
      normalizeProjectCanvasDraft({
        ...draft,
        nodePositions: {
          'source-1': { x: 40, y: 40 },
          'dvt-transform-1': { x: 600, y: 200 },
          'sink-1': { x: 1160, y: 40 },
        },
      })
    );
    cy.viewport(1600, 900);

    visitCanvas(1);
    cy.get('.react-flow__controls-fitview').click();
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
    cy.get(`${edge} .react-flow__edge-path`)
      .should('have.attr', 'd')
      .and('match', /^M.*L/)
      .and('include', 'Q')
      .and('not.match', /[Cc]/);
    cy.get(`${edge} [data-slot="canvas-dependency-direction-cue"]`)
      .should('have.attr', 'refX', '8')
      .and('have.attr', 'markerWidth', '8')
      .and('have.attr', 'markerHeight', '8');
    cy.get('.react-flow').screenshot('canvas-rounded-dependency', { overwrite: true });
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
