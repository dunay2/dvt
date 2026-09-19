/** Owned concern: prove canonical relational-tree inspection through the real Canvas Workbench. */
import {
  decodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitJoinComposition';
import { inspectDvtSubstraitProjectionDraft } from '../../../src/app/views/canvas/canvasDvtSubstraitProjection';
import {
  buildCanvasAuthoringDraft,
  stubStatefulCanvasDraftAuthoring,
} from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Canvas relational-tree Workbench', () => {
  function verifyCompleteTreeFit(viewportSelector: string): void {
    cy.get('[data-slot="canvas-relational-tree-fit"]').click();
    cy.get(viewportSelector).should(($viewport) => {
      const viewport = $viewport[0].getBoundingClientRect();
      const cards = $viewport[0].querySelectorAll(
        '[data-slot="canvas-relational-tree-node"], [data-slot="canvas-relational-tree-output"]'
      );
      expect(cards.length).to.be.greaterThan(1);
      cards.forEach((card) => {
        const bounds = card.getBoundingClientRect();
        expect(bounds.left, 'node left within viewport').to.be.at.least(viewport.left);
        expect(bounds.right, 'node right within viewport').to.be.at.most(viewport.right);
        expect(bounds.top, 'node top within viewport').to.be.at.least(viewport.top);
        expect(bounds.bottom, 'node bottom within viewport').to.be.at.most(viewport.bottom);
      });
    });
  }

  function verifyWheelZoom(viewportSelector: string): void {
    const zoomSelector = '[data-slot="canvas-relational-tree-zoom"]';
    cy.get(zoomSelector)
      .invoke('text')
      .then((initial) => {
        cy.get(viewportSelector).then(($viewport) => {
          const bounds = $viewport[0].getBoundingClientRect();
          cy.wrap($viewport).trigger('wheel', {
            eventConstructor: 'WheelEvent',
            deltaY: -120,
            cancelable: true,
            clientX: bounds.left + bounds.width / 2,
            clientY: bounds.top + bounds.height / 2,
          });
        });
        cy.get(zoomSelector)
          .should(($zoom) => {
            expect(Number.parseInt($zoom.text(), 10)).to.be.greaterThan(
              Number.parseInt(initial, 10)
            );
          })
          .invoke('text')
          .then((enlarged) => {
            cy.get(viewportSelector).trigger('wheel', {
              eventConstructor: 'WheelEvent',
              deltaY: 120,
              cancelable: true,
            });
            cy.get(zoomSelector).should(($zoom) => {
              expect(Number.parseInt($zoom.text(), 10)).to.be.lessThan(
                Number.parseInt(enlarged, 10)
              );
            });
          });
      });
  }

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

  function revealSemanticZoom(viewportSelector: string, joinCount: number): void {
    cy.get('[data-slot="canvas-relational-tree-fit"]').click();
    cy.get('[data-slot="canvas-relational-semantic-zoom"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-zoom"]')
      .invoke('text')
      .then((label) => {
        const current = Number.parseFloat(label) / 100;
        cy.get(viewportSelector).trigger('wheel', {
          eventConstructor: 'WheelEvent',
          deltaY: -Math.log(1.3 / current) / 0.0015,
          cancelable: true,
        });
      });
    cy.get('[data-slot="canvas-relational-semantic-zoom"]').should('have.length', joinCount);
    cy.get('[data-slot="canvas-relational-semantic-zoom"]').each(($detail) => {
      cy.wrap($detail)
        .find('[data-slot="canvas-join-expression-node"]')
        .should('have.length.greaterThan', 2);
      expect($detail.attr('data-relation-id')).to.equal(
        $detail.find('[data-slot="canvas-join-expression-tree"]').attr('data-relation-id')
      );
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
    stubE2eApi(
      'GET',
      /\/workspace\/graph\/canvases\/[^/]+\/transforms\/join-transform\/data-sample/,
      ({ url }) => {
        const lastWrite = semanticWrites('join-transform').at(-1);
        expect(lastWrite, 'preview uses an applied and saved semantic document').not.to.equal(
          undefined
        );
        const semanticDocument = semanticDocumentFromWrite(lastWrite!) as {
          semanticPlan: { sha256: string };
        };
        return {
          body: {
            contractVersion: 1,
            canvasId: url.pathname.split('/')[4],
            transformNodeId: 'join-transform',
            draftRevision: 'preview-e2e-revision',
            semanticPlanSha256: semanticDocument.semanticPlan.sha256,
            columns: [{ name: 'customer_id', type: 'string', nullable: false }],
            rows: [{ values: ['C-001'] }],
            limit: Number(url.searchParams.get('limit')),
            truncated: false,
            sampledAt: '2026-09-17T10:00:00.000Z',
          },
        };
      }
    );
  });

  it('removes cards through their context menu, cancels without writes and persists canonical Substrait on Apply', () => {
    let baseline = 0;
    cy.viewport(1280, 800);
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.get('[data-slot="canvas-relational-composition-badge"][role="button"]').click();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-node-title"]')
      .first()
      .should('have.css', 'font-size', '14px');
    cy.get('[data-slot="canvas-relational-tree-node"]')
      .first()
      .should('have.css', 'font-family')
      .and('contain', 'Segoe UI');
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.then(() => {
      baseline = semanticWrites('join-transform').length;
    });
    cy.get('[data-slot="dvt-select-operation-inner-join"]').should('be.visible');
    cy.get('[data-slot="dvt-select-operation-union-all"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-operation-shelf-toggle"]').click();
    cy.get('[data-slot="dvt-select-operation-inner-join"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-operation-shelf-toggle"]').click();
    cy.get('[data-slot="dvt-select-operation-inner-join"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').rightclick();
    cy.get('[data-slot="canvas-relational-remove-left"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-remove-left"]')
      .should('have.css', 'font-family')
      .and('contain', 'Segoe UI');
    cy.get('[data-slot="canvas-relational-remove-left"]').should('have.css', 'font-size', '14px');
    cy.screenshot('semantic-editor-card-context-menu');
    cy.get('[data-slot="canvas-relational-remove-left"]').click();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should(
      'have.length',
      1
    );
    cy.then(() => expect(semanticWrites('join-transform').length).to.equal(baseline));
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should(
      'have.length',
      2
    );
    cy.then(() => expect(semanticWrites('join-transform').length).to.equal(baseline));
    cy.contains(
      '[data-slot="canvas-relational-tree-node"][data-operator="read"]',
      'orders'
    ).rightclick();
    cy.get('[data-slot="canvas-relational-remove-source"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should(
      'have.length',
      1
    );
    cy.wrap(null).should(() =>
      expect(semanticWrites('join-transform').length).to.be.greaterThan(baseline)
    );
    cy.then(() => {
      const document = semanticDocumentFromWrite(semanticWrites('join-transform').at(-1)!);
      const draft = decodeDvtSubstraitInnerJoinDocument(document);
      const inspection = inspectDvtSubstraitProjectionDraft(draft);
      expect(inspection.ok, 'saved canonical projection').to.equal(true);
      if (inspection.ok) expect(inspection.projection.source.table).to.equal('customers');
    });
    cy.get('[data-slot="canvas-model-view-tab"][data-view="sql"]').click();
    cy.get('[data-slot="canvas-model-sql"]')
      .should('contain.text', 'SELECT')
      .and('contain.text', 'customers')
      .and('not.contain.text', 'INNER JOIN');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]').dblclick(
      40,
      18
    );
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should(
      'have.length',
      1
    );
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').should('not.exist');
  });

  it('opens the full-width Model editor without a duplicate authoring drawer', () => {
    let writesBeforeZoom = 0;
    cy.viewport(1280, 720);
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

    cy.get('[data-slot="canvas-model-view-tab"][data-view="editor"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get('[data-slot="canvas-model-view-tab"]').should('have.length', 3);
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="semantic"]').should('not.exist');
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
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]')
      .should('have.length', 2)
      .each(($card) => {
        cy.wrap($card).should('not.contain.text', 'READ');
        cy.wrap($card).find('[data-slot="canvas-relational-node-title"]').should('not.be.empty');
      });
    cy.get('[data-slot="canvas-relational-tree-input-label"][data-role="left"] text')
      .should('be.visible')
      .and('have.text', 'L')
      .and('have.css', 'fill', 'rgb(248, 250, 252)');
    cy.get('[data-slot="canvas-relational-tree-input-label"][data-role="right"] text')
      .should('be.visible')
      .and('have.text', 'R')
      .and('have.css', 'fill', 'rgb(248, 250, 252)');
    verifyWheelZoom('[data-slot="canvas-relational-tree-viewport"]');
    cy.then(() => {
      writesBeforeZoom = semanticWrites('join-transform').length;
    });
    revealSemanticZoom('[data-slot="canvas-relational-tree-viewport"]', 1);
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-semantic-zoom"]')
      .scrollIntoView()
      .should('contain.text', 'EQUAL');
    cy.screenshot('semantic-editor-zoom-expressions');
    cy.then(() => expect(semanticWrites('join-transform')).to.have.length(writesBeforeZoom));
    verifyCompleteTreeFit('[data-slot="canvas-relational-tree-viewport"]');
    cy.get('[data-slot="canvas-relational-semantic-zoom"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-sources"] input').type('customers');
    cy.get('[data-slot="canvas-relational-tree-zoom"]')
      .invoke('text')
      .then((zoom) => {
        cy.get('[data-slot="canvas-relational-tree-viewport"]').then(($viewport) => {
          const width = $viewport[0].clientWidth;
          cy.get('[data-slot="canvas-relational-tree-sources-toggle"]')
            .click()
            .should('have.attr', 'aria-expanded', 'false');
          cy.get('[data-slot="canvas-relational-tree-viewport"]').should(($next) => {
            expect($next[0].clientWidth).to.be.greaterThan(width);
          });
        });
        cy.get('[data-slot="canvas-relational-tree-zoom"]').should('have.text', zoom);
      });
    cy.get('[data-slot="canvas-relational-tree-source-list"]').should('not.be.visible');
    verifyCompleteTreeFit('[data-slot="canvas-relational-tree-viewport"]');
    cy.screenshot('semantic-editor-sources-collapsed');
    cy.get('[data-slot="canvas-relational-tree-sources-toggle"]')
      .focus()
      .type('{enter}')
      .should('have.attr', 'aria-expanded', 'true');
    cy.get('[data-slot="canvas-relational-tree-sources"] input')
      .should('have.value', 'customers')
      .clear();
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
    cy.get('[data-slot="canvas-model-toolbar"]').should(($toolbar) => {
      expect($toolbar[0]!.getBoundingClientRect().height).to.be.at.most(48);
      expect($toolbar.find('[role="tab"]')).to.have.length(3);
    });
    cy.get('[data-slot="canvas-relational-tree-zoom"]')
      .invoke('text')
      .should('match', /^\d+%$/);
    cy.screenshot('semantic-editor-wide');

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-workbench"] button[aria-label="Zoom out"]').click();
    cy.get(
      '[data-slot="canvas-relational-tree-workbench"] button[aria-label="Fit graph to view"]'
    ).click();
    cy.get('[data-slot="canvas-relational-tree-zoom"]')
      .invoke('text')
      .should('match', /^\d+%$/);
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
    cy.viewport(1024, 720);
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
    cy.get('[data-slot="canvas-model-view-tab"]').should('have.length', 3);
    cy.screenshot('semantic-editor-compact');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('.react-flow__node[data-id="join-transform"]').should('exist');
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

    cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]').dblclick(
      40,
      18
    );
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'JOIN');
    cy.get('[data-slot="canvas-relational-tree-start-authoring"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-node-expand"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.get('[data-slot="canvas-join-expression-tree"]:visible').should('have.length', 1);
    cy.then(expectPublishedSemanticUnchanged);
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
      'have.length',
      1
    );
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="read"]').should(
      'have.length',
      2
    );
    verifyWheelZoom('[data-slot="canvas-relational-tree-draft-viewport"]');
    cy.then(expectPublishedSemanticUnchanged);

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'shipments').click();
    cy.get('[data-slot="canvas-relational-tree-existing-field"]')
      .should('contain.text', 'customers.customer_id')
      .find('option:selected')
      .should('have.text', 'customers.customer_id');
    cy.get('[data-slot="canvas-relational-tree-connected-field"]')
      .should('have.value', 'customer_id')
      .find('option:selected')
      .should('have.text', 'shipments.customer_id');
    cy.get('[data-slot="canvas-relational-tree-append-input"]').should('be.enabled').click();
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

    cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]').dblclick(
      40,
      18
    );
    cy.get('[data-slot="canvas-model-view-tab"][data-view="editor"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get('[data-slot="canvas-relational-tree-authoring"]').should('not.exist');
    dragSourceTo('customers', 'primary');
    cy.get('[data-slot="dvt-select-operation-projection"]').should('exist');
    dragSourceTo('orders', 'secondary');
    cy.get('[data-slot="dvt-select-operation-inner-join"]')
      .scrollIntoView()
      .should('be.visible')
      .focus()
      .type('{enter}');
    cy.get('[data-slot="canvas-relational-node-expand"]').click();
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
    cy.viewport(1280, 720);
    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]').dblclick(
      40,
      18
    );
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
      .find('option:selected')
      .should('have.text', 'customers.customer_id');
    cy.get('[data-slot="canvas-relational-tree-connected-field"]').should(
      'have.value',
      'customer_id'
    );
    cy.get('[data-slot="canvas-relational-tree-append-input"]').should('be.enabled').click();
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
      'have.length',
      2
    );
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="read"]').should(
      'have.length',
      3
    );

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'tickets').click();
    cy.get('[data-slot="canvas-relational-tree-existing-field"] option:selected').should(
      'have.text',
      'customers.customer_id'
    );
    cy.get('[data-slot="canvas-relational-tree-connected-field"]').should(
      'have.value',
      'customer_id'
    );
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

    const cards = '[data-slot="canvas-relational-tree-draft"] [data-operator="join"]';
    const selectedPredicates =
      '[data-slot="dvt-substrait-join-predicate-editors"] fieldset:visible';
    cy.get(cards).last().parent().find('[data-slot="canvas-relational-node-expand"]').click();
    cy.get(selectedPredicates)
      .should('have.length', 1)
      .and('contain.text', 'orders.')
      .and('not.contain.text', 'tickets.');
    cy.get(cards).first().click();
    cy.get(selectedPredicates).should('have.length', 1).and('contain.text', 'tickets.');
    cy.get(`${selectedPredicates} button[aria-label="Editar condición"]`).click();
    cy.get(`${selectedPredicates} select[aria-label="Comparador de la condición"]`).select(
      'not_equal'
    );
    cy.get(cards).last().click();
    cy.get(selectedPredicates).should('not.contain.text', 'tickets.');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.get(cards).first().click();
    cy.get(`${selectedPredicates} select[aria-label="Comparador de la condición"]`).should(
      'have.value',
      'not_equal'
    );
    cy.get('[data-slot="canvas-relational-tree-draft-viewport"]').should('be.visible');
    cy.get(`${selectedPredicates} details`).first().find('summary').click();
    cy.get(
      `${selectedPredicates} select[aria-label="Añadir función exterior al operando izquierdo"]`
    ).select('LOWER');
    cy.get(`${selectedPredicates} [data-slot="semantic-operand-function-tree"]`)
      .first()
      .should('contain.text', 'LOWER(')
      .and('contain.text', 'customers.customer_id');
    cy.get(
      `${selectedPredicates} select[aria-label="Añadir función exterior al operando izquierdo"]`
    ).select('UPPER');
    cy.get(`${selectedPredicates} [data-slot="semantic-operand-function-tree"]`)
      .first()
      .should(($tree) => {
        const text = $tree.text();
        expect(text.indexOf('UPPER(')).to.be.lessThan(text.indexOf('LOWER('));
        expect(text.indexOf('LOWER(')).to.be.lessThan(text.indexOf('customers.customer_id'));
      });
    cy.get(`${selectedPredicates} button[aria-label="Retirar función 2"]`).click();
    cy.get(`${selectedPredicates} [data-slot="semantic-operand-function-tree"]`)
      .first()
      .should('not.contain.text', 'UPPER(')
      .and('contain.text', 'LOWER(')
      .and('contain.text', 'customers.customer_id');
    cy.get('[data-slot="canvas-join-expression-tree"]:visible')
      .should('contain.text', 'NOT_EQUAL')
      .and('contain.text', 'LOWER')
      .and('contain.text', 'customers.customer_id')
      .and('contain.text', 'tickets.customer_id');
    cy.screenshot('semantic-editor-contextual-join');
    cy.contains(`${selectedPredicates} button`, 'Guardar condición').click();

    cy.get(`${selectedPredicates} button[aria-label="Añadir condición"]`).first().click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.get('[data-slot="semantic-workbench-join-condition-editor"]')
      .contains('button', 'Añadir condición')
      .click();
    cy.get('[data-slot="canvas-join-expression-tree"]:visible').should('contain.text', 'LOWER');
    cy.get('[data-slot="canvas-relational-collapse"]').click();
    cy.get('[data-slot="canvas-relational-tree-draft-viewport"]').should(($viewport) => {
      const bounds = $viewport[0]!.getBoundingClientRect();
      const output = $viewport[0]!
        .querySelector('[data-slot="canvas-relational-tree-output"]')!
        .getBoundingClientRect();
      expect(bounds.right).to.be.at.most($viewport[0]!.ownerDocument.defaultView!.innerWidth);
      expect(bounds.bottom).to.be.at.most($viewport[0]!.ownerDocument.defaultView!.innerHeight);
      expect(output.right).to.be.at.most(bounds.right);
      expect(output.bottom).to.be.at.most(bounds.bottom);
    });
    cy.get('[data-slot="canvas-relational-tree-apply"]').each(($button) => {
      const bounds = $button[0]!.getBoundingClientRect();
      const window = $button[0]!.ownerDocument.defaultView!;
      expect(bounds.right).to.be.at.most(window.innerWidth);
      expect(bounds.bottom).to.be.at.most(window.innerHeight);
    });
    cy.screenshot('semantic-editor-four-inputs');
    cy.get('[data-slot="canvas-relational-tree-sources-toggle"]').click();
    verifyWheelZoom('[data-slot="canvas-relational-tree-draft-viewport"]');
    verifyCompleteTreeFit('[data-slot="canvas-relational-tree-draft-viewport"]');
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="read"]').should(
      'have.length',
      4
    );
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
      'have.length',
      3
    );
    cy.screenshot('semantic-editor-complete-tree');
    revealSemanticZoom('[data-slot="canvas-relational-tree-draft-viewport"]', 3);
    cy.get('[data-slot="canvas-relational-semantic-zoom"]')
      .filter(':contains("LOWER")')
      .should('have.length', 1)
      .closest('li')
      .scrollIntoView()
      .should('contain.text', 'customers.customer_id')
      .and('contain.text', 'tickets.customer_id');
    cy.screenshot('semantic-editor-zoom-nested-function');
    cy.get('[data-slot="canvas-relational-tree-detail"]:visible').should('not.exist');
    verifyCompleteTreeFit('[data-slot="canvas-relational-tree-draft-viewport"]');
    cy.get('[data-slot="canvas-relational-tree-sources-toggle"]').click();
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
      expect(
        inspection.projection.joins.map((join) => {
          const condition = join.conditions[0];
          return condition == null || condition.kind === 'group'
            ? null
            : (condition.operator ?? 'equal');
        })
      ).to.deep.equal(['equal', 'equal', 'not_equal']);
      const customerId = inspection.projection.inputs[0]?.fields.find(
        (field) => field.name === 'customer_id'
      )?.fieldId;
      expect(customerId).not.to.equal(undefined);
      [1, 2].forEach((joinIndex) => {
        const condition = inspection.projection.joins[joinIndex]?.conditions[0];
        if (condition == null || condition.kind === 'group') return;
        const operand = condition.left;
        if (joinIndex === 2) expect(operand.kind).to.equal('function');
        else expect(operand.kind).to.equal('field');
        expect(operand.kind === 'function' ? operand.input : operand).to.deep.include({
          kind: 'field',
          sourceFieldId: customerId,
        });
      });
    });
    cy.get('[data-slot="canvas-model-view-tab"][data-view="sql"]').click();
    cy.get('[data-slot="canvas-model-sql"]').should('contain.text', 'SELECT');
    cy.get('[data-slot="canvas-model-view-tab"][data-view="data"]').click();
    cy.then(() => expect(getE2eApiCalls(/\/data-sample$/, 'GET')).to.have.length(0));
    cy.get('[data-slot="canvas-model-preview"]').click();
    cy.get('[data-slot="canvas-model-data"] table').should('contain.text', 'C-001');
    cy.screenshot('semantic-editor-data-preview');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]').dblclick(
      40,
      18
    );
    cy.get('[data-slot="canvas-relational-tree"] [data-operator="join"]').should('have.length', 3);
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

    cy.get('.react-flow__node[data-id="union-transform"] [data-slot="canvas-node-shell"]').dblclick(
      40,
      18
    );
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_north').click();
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_south').click();
    cy.get('[data-slot="dvt-select-operation-union-all"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.be.disabled').click();

    cy.wrap(null).should(() => {
      expect(semanticWrites('union-transform')).to.have.length(1);
    });
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'UNION ALL');
  });
});
