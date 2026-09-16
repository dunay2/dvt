/** Owned concern: prove the pending relational-operation chooser through the real Canvas route. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Canvas relational-operation chooser', () => {
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
    stubStatefulCanvasDraftAuthoring({
      substraitPendingComposition: true,
      title: 'Relational operation chooser',
    });
  });

  it('opens with the keyboard and cancels JOIN authoring without saving', () => {
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
      .should('contain.text', 'RELATE / COMPOSE')
      .focus()
      .should('have.focus')
      .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));

    cy.get('[data-slot="dvt-relational-operation-chooser"]').should('be.visible');
    cy.get('[data-slot="dvt-select-operation-inner-join"]')
      .should('contain.text', 'Needs predicate')
      .and('not.be.disabled')
      .click();
    cy.get('[data-slot="dvt-composition-left-field"]').should('be.visible');
    cy.get('[data-slot="dvt-composition-right-field"]').should('be.visible');
    cy.get('[data-slot="dvt-cancel-relational-operation"]').click();

    cy.get('[data-slot="dvt-relational-operation-chooser"]').should('be.visible');
    cy.wrap(null).should(() => {
      const savedTransforms = getE2eApiCalls('/workspace/graph/draft', 'PUT').map((call) => {
        const body = call.body as {
          draft: { nodes: Array<{ id: string; metadata?: Record<string, unknown> }> };
        };
        return body.draft.nodes.find((node) => node.id === 'join-transform');
      });
      expect(
        savedTransforms.every((node) => node?.metadata?.transformAuthoring == null),
        'no canonical JOIN authority saved after Cancel'
      ).to.equal(true);
    });
  });
});
