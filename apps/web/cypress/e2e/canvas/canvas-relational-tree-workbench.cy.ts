/** Owned concern: prove canonical relational-tree inspection through the real Canvas Workbench. */
import {
  decodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitJoinComposition';
import {
  buildCanvasAuthoringDraft,
  stubStatefulCanvasDraftAuthoring,
} from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Canvas relational-tree Workbench', () => {
  function dragSourceTo(sourceLabel: string, position: 'primary' | 'secondary'): void {
    cy.window().then((window) => {
      const dataTransfer = new window.DataTransfer();
      cy.contains('[data-slot="canvas-relational-tree-source"]', sourceLabel).trigger('dragstart', {
        dataTransfer,
      });
      cy.get(`[data-slot="canvas-relational-tree-input-slot"][data-position="${position}"]`)
        .should('be.visible')
        .trigger('dragover', { dataTransfer })
        .trigger('drop', { dataTransfer });
    });
  }

  const semanticWrites = (targetNodeId: string): ReturnType<typeof getE2eApiCalls> =>
    getE2eApiCalls('/workspace/graph/draft', 'PUT').filter((call) => {
      const body = call.body as {
        draft: { nodes: Array<{ id: string; metadata?: Record<string, unknown> }> };
      };
      return body.draft.nodes.some(
        (node) => node.id === targetNodeId && node.metadata?.transformAuthoring != null
      );
    });

  const semanticDocumentFromWrite = (call: ReturnType<typeof getE2eApiCalls>[number]): unknown => {
    const body = call.body as {
      draft: { nodes: Array<{ id: string; metadata?: Record<string, unknown> }> };
    };
    const transform = body.draft.nodes.find((node) => node.id === 'join-transform');
    return (transform?.metadata?.transformAuthoring as { semanticDocument?: unknown } | undefined)
      ?.semanticDocument;
  };

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
    const partial = Cypress.currentTest.title.includes('partial canonical tree');
    const pendingNSource = Cypress.currentTest.title.includes('pending N-source JOIN');
    stubStatefulCanvasDraftAuthoring({
      substraitInnerJoin: !pending && !union && !partial && !pendingNSource,
      substraitNInputJoin: partial || pendingNSource,
      substraitPendingComposition: pending || pendingNSource,
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
    cy.get('[data-slot="canvas-relational-tree-layout"]')
      .should('have.attr', 'data-layout', 'graph')
      .and('have.attr', 'data-direction', 'left-to-right')
      .find('[data-slot="canvas-relational-tree-children"][data-child-count="2"]')
      .should('exist');
    cy.get('[data-slot="canvas-relational-tree-viewport"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-detail"]')
      .should('be.visible')
      .and('have.attr', 'data-position', 'contextual')
      .and('contain.text', 'JOIN');
    cy.get('[data-slot="canvas-relational-tree-zoom"]').should('have.text', '100%');

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('contain.text', 'READ');
    cy.get('[data-slot="canvas-relational-tree-workbench"] button[aria-label="Zoom out"]').click();
    cy.get(
      '[data-slot="canvas-relational-tree-workbench"] button[aria-label="Fit graph to view"]'
    ).click();
    cy.get('[data-slot="canvas-relational-tree-zoom"]')
      .invoke('text')
      .should('match', /^\d+%$/);
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
  });

  it('opens a partial canonical tree as the structural draft before appending', () => {
    const initialDraft = buildCanvasAuthoringDraft({
      substraitNInputJoin: true,
      title: 'Relational tree Workbench',
    });
    const initialTransform = initialDraft.nodes.find((node) => node.id === 'join-transform');
    const initialSemanticDocument = (
      initialTransform?.metadata?.transformAuthoring as
        | {
            semanticDocument?: {
              semanticPlan: { sha256: string };
              sidecar: { semanticPlanSha256: string };
            };
          }
        | undefined
    )?.semanticDocument;
    const initialSemanticPlanSha256 = initialSemanticDocument?.semanticPlan.sha256;
    const expectPublishedSemanticUnchanged = (): void => {
      semanticWrites('join-transform').forEach((call) => {
        const semanticDocument = semanticDocumentFromWrite(call) as {
          semanticPlan: { sha256: string };
          sidecar: { semanticPlanSha256: string };
        };
        expect(semanticDocument.semanticPlan.sha256).to.equal(initialSemanticPlanSha256);
        expect(semanticDocument.sidecar.semanticPlanSha256).to.equal(initialSemanticPlanSha256);
      });
    };
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
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'JOIN');
    cy.get('[data-slot="canvas-relational-tree-start-authoring"]')
      .should('be.visible')
      .and('contain.text', '2')
      .and('contain.text', 'Compose relation');

    cy.get('[data-slot="canvas-relational-tree-start-authoring"] button').click();
    cy.then(expectPublishedSemanticUnchanged);
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
      'have.length',
      1
    );
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="read"]').should(
      'have.length',
      2
    );

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'shipments').click();
    cy.get('[data-slot="canvas-relational-tree-existing-field"]')
      .should('contain.text', 'customers.customer_id')
      .select('customers.customer_id');
    cy.get('[data-slot="canvas-relational-tree-connected-field"]').select('shipments.customer_id');
    cy.get('[data-slot="canvas-relational-tree-append-input"]').click();
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
      'have.length',
      2
    );
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="read"]').should(
      'have.length',
      3
    );
    cy.then(expectPublishedSemanticUnchanged);

    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'JOIN');
    cy.wrap(null).should(expectPublishedSemanticUnchanged);
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
    cy.get('[data-slot="canvas-relational-tree-authoring"]').should('not.exist');
    dragSourceTo('customers', 'primary');
    cy.get('[data-slot="dvt-select-operation-projection"]').should('exist');
    dragSourceTo('orders', 'secondary');
    cy.get('[data-slot="dvt-select-operation-inner-join"]')
      .scrollIntoView()
      .should('be.visible')
      .focus()
      .type('{enter}');
    cy.get('[data-slot="dvt-substrait-join-predicate-editors"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-slot="canvas-relational-tree-block-canvas"]').should(
      'contain.text',
      'Select the first Source.'
    );
    cy.wrap(null).should(() => {
      expect(semanticWrites('join-transform')).to.have.length(0);
    });

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'orders').click();
    cy.get('[data-slot="dvt-select-operation-inner-join"]').click();
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

  it('authors a pending N-source JOIN as a repeatable canonical chain', () => {
    cy.viewport(1600, 1000);
    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]').click();
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'orders').click();
    cy.get('[data-slot="dvt-select-operation-inner-join"]').click();
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
      'have.length',
      1
    );

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'shipments').click();
    cy.get('[data-slot="canvas-relational-tree-existing-field"]')
      .should('contain.text', 'customers.customer_id')
      .and('contain.text', 'orders.customer_id')
      .select('customers.customer_id');
    cy.get('[data-slot="canvas-relational-tree-connected-field"]').select('shipments.customer_id');
    cy.get('[data-slot="canvas-relational-tree-append-input"]').click();
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
      'have.length',
      2
    );
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="read"]').should(
      'have.length',
      3
    );

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'tickets').click();
    cy.get('[data-slot="canvas-relational-tree-existing-field"]').select('customers.customer_id');
    cy.get('[data-slot="canvas-relational-tree-connected-field"]').select('tickets.customer_id');
    cy.get('[data-slot="canvas-relational-tree-append-input"]').click();
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
      'have.length',
      3
    );
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="read"]').should(
      'have.length',
      4
    );
    cy.wrap(null).should(() => expect(semanticWrites('join-transform')).to.have.length(0));

    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.wrap(null).should(() => {
      const write = semanticWrites('join-transform').at(-1);
      expect(write).not.to.equal(undefined);
      if (write == null) return;
      const inspection = inspectDvtSubstraitNInputJoinDraft(
        decodeDvtSubstraitInnerJoinDocument(semanticDocumentFromWrite(write))
      );
      expect(inspection.ok).to.equal(true);
      if (!inspection.ok) return;
      expect(inspection.projection.inputs).to.have.length(4);
      expect(inspection.projection.joinRelations).to.have.length(3);
      const customerId = inspection.projection.inputs[0]?.fields.find(
        (field) => field.name === 'customer_id'
      )?.fieldId;
      expect(customerId).not.to.equal(undefined);
      [1, 2].forEach((joinIndex) => {
        const condition = inspection.projection.joins[joinIndex]?.conditions[0];
        if (condition == null || condition.kind === 'group') return;
        expect(condition.left).to.deep.include({
          kind: 'field',
          sourceFieldId: customerId,
        });
      });
    });
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
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_south').click();
    cy.get('[data-slot="dvt-select-operation-union-all"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.be.disabled').click();

    cy.wrap(null).should(() => {
      expect(semanticWrites('union-transform')).to.have.length(1);
    });
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'SET');
  });
});
