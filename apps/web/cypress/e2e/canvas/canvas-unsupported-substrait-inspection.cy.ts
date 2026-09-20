/** Owned concern: prove unsupported canonical Substrait relations stay local to Inspector. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Canvas unsupported Substrait inspection', () => {
  it('keeps Canvas operable and preserves canonical authority after a common-field edit', () => {
    let writesBeforeInspection = 0;
    stubShellBootstrapApis({
      scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
    });
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: { dvt: { available: true } },
    });
    const initialDraft = stubStatefulCanvasDraftAuthoring({ substraitUnsupported: true });
    const initialNode = initialDraft.nodes.find((node) => node.id === 'transform-customers');

    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    waitForE2eApiCall('/healthz', 'GET');
    waitForE2eApiCall('/capabilities', 'GET');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');

    cy.get('[data-testid="canvas-viewport"]').should('be.visible');
    cy.then(() => {
      writesBeforeInspection = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get('.react-flow__node[data-id="transform-customers"]')
      .should('be.visible')
      .find('[data-slot="canvas-node-shell"]')
      .rightclick();
    cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Properties').click();
    cy.get('[data-slot="canvas-node-workbench-tab-general"]').click();
    cy.get('[data-slot="canvas-inspector-semantic-authoring-issue"]')
      .should('be.visible')
      .and('contain.text', 'Semantic operation unavailable')
      .and('contain.text', 'stored semantics were left unchanged');
    cy.wrap(null).should(() => {
      const inspectionWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT');
      expect(inspectionWrites, 'Properties inspection keeps the draft revision').to.have.length(
        writesBeforeInspection
      );
      inspectionWrites.forEach((call) => {
        const inspectedNode = (
          call.body as {
            draft: {
              nodes: Array<{
                id: string;
                name: string;
                metadata?: Record<string, unknown>;
              }>;
            };
          }
        ).draft.nodes.find((node) => node.id === 'transform-customers');
        expect(inspectedNode?.name, 'inspection keeps the stored name').to.equal(initialNode?.name);
        expect(
          inspectedNode?.metadata?.transformAuthoring,
          'inspection preserves authority'
        ).to.deep.equal(initialNode?.metadata?.transformAuthoring);
      });
    });
    cy.get('input[name="node-name"]').clear().type('Recovered customers');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();

    cy.wrap(null).should(() => {
      const saveRequests = getE2eApiCalls('/workspace/graph/draft', 'PUT');
      const savedNode = saveRequests
        .map(
          (call) =>
            call.body as {
              draft: {
                nodes: Array<{
                  id: string;
                  name: string;
                  metadata?: Record<string, unknown>;
                }>;
              };
            }
        )
        .flatMap((body) => body.draft.nodes)
        .find((node) => node.id === 'transform-customers' && node.name === 'Recovered customers');
      expect(savedNode, 'saved workspace draft').to.not.be.undefined;
      expect(savedNode?.name).to.equal('Recovered customers');
      expect(savedNode?.metadata?.transformAuthoring).to.deep.equal(
        initialNode?.metadata?.transformAuthoring
      );
    });
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get('.react-flow__node[data-id="source-customers"]').should('be.visible').click();
    cy.get('[data-testid="canvas-viewport"]').should('be.visible');
  });
});
