/** Owned concern: prove canonical relational-tree inspection through the real Canvas Workbench. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Canvas relational-tree Workbench', () => {
  const semanticWrites = (targetNodeId: string): ReturnType<typeof getE2eApiCalls> =>
    getE2eApiCalls('/workspace/graph/draft', 'PUT').filter((call) => {
      const body = call.body as {
        draft: { nodes: Array<{ id: string; metadata?: Record<string, unknown> }> };
      };
      return body.draft.nodes.some(
        (node) => node.id === targetNodeId && node.metadata?.transformAuthoring != null
      );
    });

  beforeEach(() => {
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
    const union = Cypress.currentTest.title.includes('UNION ALL');
    const pending = Cypress.currentTest.title.includes('authors a pending JOIN');
    stubStatefulCanvasDraftAuthoring({
      substraitInnerJoin: !pending && !union,
      substraitPendingComposition: pending,
      substraitUnionAll: union,
      title: 'Relational tree Workbench',
    });
  });

  it('opens one global tree in the Canvas operations drawer', () => {
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    cy.get('[data-slot="canvas-relational-composition-badge"][role="button"]')
      .should('contain.text', 'INNER JOIN')
      .focus()
      .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));

    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="semantic"]')
      .should('contain.text', 'Relational tree')
      .and('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-source"]')
      .should('have.length', 2)
      .each(($source) => {
        cy.wrap($source).should('contain.text', 'Participating');
      });
    cy.get('[data-slot="canvas-relational-tree"]')
      .should('contain.text', 'JOIN')
      .and('contain.text', 'Left input')
      .and('contain.text', 'Right input');
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('contain.text', 'JOIN');

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('contain.text', 'READ');
    cy.get('[data-slot="canvas-relational-tree-workbench"] button[aria-label="Zoom out"]').click();
    cy.get(
      '[data-slot="canvas-relational-tree-workbench"] button[aria-label="Fit graph to view"]'
    ).click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
  });

  it('authors a pending JOIN in the global tab with one Apply and zero-write Cancel', () => {
    cy.viewport(1400, 900);
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]').click();
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="semantic"]')
      .should('have.attr', 'aria-selected', 'true')
      .and('contain.text', 'Relational tree');
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers')
      .should('not.be.disabled')
      .focus()
      .type('{enter}');
    cy.get('[data-slot="dvt-select-operation-inner-join"]').focus().type('{enter}');
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'orders').click();
    cy.get('[data-slot="dvt-substrait-join-predicate-editors"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-slot="canvas-relational-tree-authoring"]').should(
      'contain.text',
      'Select the first Source.'
    );
    cy.wrap(null).should(() => {
      expect(semanticWrites('join-transform')).to.have.length(0);
    });

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
    cy.get('[data-slot="dvt-select-operation-inner-join"]').click();
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'orders').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.be.disabled').click();

    cy.wrap(null).should(() => {
      const saves = semanticWrites('join-transform');
      expect(saves).to.have.length(1);
      const body = saves.at(-1)?.body as {
        draft: { nodes: Array<{ id: string; metadata?: Record<string, unknown> }> };
      };
      const transform = body.draft.nodes.find((node) => node.id === 'join-transform');
      expect(transform?.metadata?.transformAuthoring).to.not.equal(undefined);
    });
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'JOIN');
  });

  it('authors UNION ALL in the global tab and persists one canonical operation', () => {
    cy.viewport(1400, 900);
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    cy.get('.react-flow__node[data-id="union-transform"] [data-slot="canvas-node-shell"]').click();
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_north').click();
    cy.get('[data-slot="dvt-select-operation-union-all"]').click();
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_south').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.be.disabled').click();

    cy.wrap(null).should(() => {
      expect(semanticWrites('union-transform')).to.have.length(1);
    });
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'SET');
  });
});
