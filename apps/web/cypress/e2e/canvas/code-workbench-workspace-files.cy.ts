/** Owned concern: prove canonical Canvas Project Code working-tree synchronization. */
import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import { getLastE2eApiCall, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const INITIAL_REVISION = 'a'.repeat(64);
const SYNCHRONIZED_REVISION = 'b'.repeat(64);

function stubCodeWorkbenchBootstrapApis(): void {
  stubShellBootstrapApis();
  stubCanvasDraftRead();

  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '1.0.0',
    plugins: {
      dbt: { available: true },
      dvt: { available: true },
    },
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
}

function stubContextualCodeWorkbenchApis(): void {
  stubCodeWorkbenchBootstrapApis();
  stubE2eJsonApi('GET', '/workspace/files', [
    {
      path: 'models',
      name: 'models',
      kind: 'directory',
      children: [
        {
          path: 'models/staging/stg_orders.sql',
          name: 'stg_orders.sql',
          kind: 'file',
        },
      ],
    },
  ]);
  stubE2eJsonApi('GET', /\/workspace\/files\/.+/, {
    path: 'models/staging/stg_orders.sql',
    name: 'stg_orders.sql',
    language: 'sql',
    content: 'select * from orders',
    contentSha256: INITIAL_REVISION,
    lastModified: '2026-07-12T00:00:00.000Z',
  });
  stubE2eJsonApi('GET', /\/workspace\/file-history\/.+/, []);
  stubE2eJsonApi('POST', /\/workspace\/files\/.+/, {
    kind: 'saved',
    disposition: 'updated',
    path: 'models/staging/stg_orders.sql',
    contentSha256: SYNCHRONIZED_REVISION,
    lastModified: '2026-07-12T00:00:01.000Z',
  });
}

describe('Canvas Project Code working-tree synchronization', () => {
  it('synchronizes contextual project Code into the working tree without a Save action', () => {
    stubContextualCodeWorkbenchApis();

    visitWithE2eWorkspaceSession('/canvas');

    cy.get('.react-flow__node').first().click().should('have.class', 'selected');
    cy.get('.react-flow__viewport')
      .invoke('attr', 'style')
      .then((viewportStyle) => cy.wrap(viewportStyle).as('graphViewportStyle'));

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();
    waitForE2eApiCall('/workspace/files', 'GET');
    waitForE2eApiCall(/\/workspace\/files\/.+/, 'GET');

    cy.get('[data-slot="canvas-contextual-workbench"]')
      .should('be.visible')
      .within(() => {
        cy.get('[data-slot="code-working-tree-status"]')
          .should('be.visible')
          .should(($status) => {
            expect($status.text()).to.match(/Synchronized|Sincronizado/);
          });
        cy.contains('button', 'Save').should('not.exist');
        cy.get('[data-testid="monaco-code-editor"]')
          .find('.monaco-editor textarea')
          .first()
          .focus()
          .type('{ctrl+a}select 7 as working_tree_verified', { force: true, delay: 0 });
        cy.get('[data-slot="code-working-tree-status"]').should(($status) => {
          expect($status.text()).to.match(/Synchronized|Sincronizado/);
        });
      });

    waitForE2eApiCall(/\/workspace\/files\/.+/, 'POST');
    cy.wrap(null).should(() => {
      expect(getLastE2eApiCall(/\/workspace\/files\/.+/, 'POST')?.body).to.deep.equal({
        content: 'select 7 as working_tree_verified',
        expectedRevision: { kind: 'content_sha256', value: INITIAL_REVISION },
      });
    });

    cy.get('.react-flow__node').first().should('have.class', 'selected');
    cy.get('@graphViewportStyle').then((viewportStyle) => {
      cy.get('.react-flow__viewport').should(($viewport) => {
        expect($viewport.attr('style')).to.equal(viewportStyle);
      });
    });
  });
});
