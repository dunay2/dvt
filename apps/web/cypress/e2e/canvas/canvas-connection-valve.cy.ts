/** Owned concern: prove the persisted Canvas connection valve browser round trip. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const EDGE_SELECTOR = '.react-flow__edge[data-id="edge-source-transform"]';

function stubCanvasApis(): void {
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
}

function waitForDraftCallCount(method: 'GET' | 'PUT', expectedCount: number): void {
  cy.wrap(null, { timeout: 20_000 }).should(() => {
    expect(getE2eApiCalls('/workspace/graph/draft', method)).to.have.length(expectedCount);
  });
}

function visitReadyCanvas(expectedReadCount: number): void {
  visitWithE2eWorkspaceSession('/canvas');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForDraftCallCount('GET', expectedReadCount);
  cy.get(EDGE_SELECTOR).should('be.visible');
}

function waitForSaveCount(expectedCount: number): void {
  waitForDraftCallCount('PUT', expectedCount);
  waitForDraftCallCount('GET', expectedCount * 2);
}

function expectLastSavedGate(expectedGate: 'open' | 'closed'): void {
  cy.then(() => {
    const request = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
      | { draft?: { edges?: Array<{ id: string; metadata?: { executionGate?: string } }> } }
      | undefined;
    const edge = request?.draft?.edges?.find(({ id }) => id === 'edge-source-transform');
    expect(edge, 'persisted source-to-transform edge').to.exist;
    expect(edge?.metadata?.executionGate).to.equal(
      expectedGate === 'closed' ? 'closed' : undefined
    );
  });
}

function toggleExecutionGate(): void {
  cy.get(EDGE_SELECTOR).rightclick({ force: true });
  cy.get('[data-slot="canvas-context-menu-item"][data-menu-action="set-execution-gate"]')
    .should('be.visible')
    .click();
}

function expectClosedGate(visible: boolean): void {
  const glyph = `${EDGE_SELECTOR} [data-slot="canvas-dependency-closed-gate"]`;
  cy.get(glyph).should(visible ? 'exist' : 'not.exist');
  if (visible) {
    cy.get(`${EDGE_SELECTOR} .react-flow__edge-path`).should(($path) => {
      expect($path.attr('style')).to.include('stroke-dasharray');
    });
  }
}

describe('Canvas connection valve', () => {
  it('closes and reopens an edge through the canonical persisted command', () => {
    stubCanvasApis();
    visitReadyCanvas(1);
    expectClosedGate(false);

    toggleExecutionGate();
    expectClosedGate(true);
    waitForSaveCount(1);
    expectLastSavedGate('closed');

    visitReadyCanvas(3);
    expectClosedGate(true);

    toggleExecutionGate();
    expectClosedGate(false);
    waitForSaveCount(2);
    expectLastSavedGate('open');

    visitReadyCanvas(5);
    expectClosedGate(false);
  });
});
