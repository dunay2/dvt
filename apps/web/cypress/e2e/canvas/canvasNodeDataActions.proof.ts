/** UI contracts registered in the admitted terminal proof; one browser/runtime bootstrap. */
import { asIsoUtcString } from '@dvt/contracts';
import { SourceDataSampleResponseSchema, TransformDataSampleResponseSchema } from '@dvt/contracts';

import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import { openWorkbenchModel } from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import { hoverWorkbenchCard } from '../../support/relationalWorkbench/pointer';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const sourcePath = '/workspace/warehouse/connections/local-postgres-proof/source-data-sample';
const transformPath =
  /\/workspace\/graph\/canvases\/[^/]+\/transforms\/dvt-transform-1\/data-sample/;
const sample = {
  contractVersion: 1,
  columns: [{ name: 'customer', type: 'string', nullable: false }],
  rows: [{ values: ['Ada'] }],
  limit: 20,
  truncated: false,
};

function proveResizableDataGrid(host: string, screenshot: string): void {
  const handle = '#app-shell-bottom-drawer-resize-handle';
  const grid = `${host} [data-slot="bottom-operational-data-grid"]`;
  const value = `${host} [data-slot="bottom-operational-data-value"]`;
  const fullyVisible = ($element: JQuery<HTMLElement>): void => {
    const element = $element[0];
    const bounds = element.getBoundingClientRect();
    const panel = element.closest(host)!.getBoundingClientRect();
    const viewport = element.ownerDocument.defaultView!;
    // Scrolling rounds to device pixels; resizable panel bounds retain fractional CSS pixels.
    expect(bounds.top, 'content begins inside panel and viewport').to.be.at.least(
      Math.max(0, panel.top) - 1
    );
    expect(bounds.bottom, 'content ends inside panel and viewport').to.be.at.most(
      Math.min(panel.bottom, viewport.innerHeight) + 1
    );
    expect(bounds.left, 'content starts inside panel and viewport').to.be.at.least(
      Math.max(0, panel.left) - 1
    );
    expect(bounds.right, 'content finishes inside panel and viewport').to.be.at.most(
      Math.min(panel.right, viewport.innerWidth) + 1
    );
  };
  // At this viewport, one step above minimum leaves a row below shell chrome.
  cy.get(handle).focus().trigger('keydown', { key: 'End' }).trigger('keydown', { key: 'ArrowUp' });
  cy.get(host)
    .should('have.css', 'overflow-y', 'auto')
    .should(($host) => {
      const panel = $host[0];
      const row = $host.find('[data-slot="bottom-operational-data-value"]')[0];
      expect(panel.clientHeight, 'compact host can contain a data row').to.be.at.least(
        row.clientHeight
      );
      expect(panel.scrollHeight, 'compact host exposes overflowing content').to.be.greaterThan(
        panel.clientHeight
      );
    });
  cy.get(`${host} [data-slot="bottom-operational-data-table-frame"]`).should(($frame) => {
    expect(
      $frame[0].clientHeight,
      'header and at least one compact row remain usable'
    ).to.be.at.least(54);
  });
  cy.get(value).first().scrollIntoView().should('be.visible').should(fullyVisible);
  cy.get(handle).focus().trigger('keydown', { key: 'Home' });
  cy.get(host).scrollTo('top', { ensureScrollable: false });
  cy.get(value).first().should('be.visible').should(fullyVisible);
  cy.get(`${grid} button[aria-label="Copy cell"]`).should('be.visible').should(fullyVisible);
  cy.get(grid).children().last().should(fullyVisible);
  cy.get(host).screenshot(screenshot, { scale: true });
  cy.get(handle).focus().trigger('keydown', { key: 'ArrowDown', shiftKey: true });
  cy.get(handle)
    .trigger('keydown', { key: 'ArrowUp' })
    .trigger('keydown', { key: 'ArrowUp' })
    .trigger('keydown', { key: 'ArrowUp' });
}

export function registerCanvasNodeDataActionsProof(): void {
  describe('Canvas explicit data action', () => {
    let emptyResults = false;
    let sourceReads = 0;
    let transformReads = 0;
    beforeEach(() => {
      emptyResults = false;
      sourceReads = 0;
      transformReads = 0;
      cy.viewport(1920, 1080);
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
        canvasKind: 'transformation',
        authoringGenerated: true,
        terminalTransformPreview: true,
      });
      stubE2eApi('GET', sourcePath, () => {
        sourceReads += 1;
        return {
          body: SourceDataSampleResponseSchema.parse({
            ...sample,
            columns: [...sample.columns, { name: 'unpublished', type: 'text', nullable: true }],
            rows: emptyResults
              ? []
              : [{ values: [sourceReads === 1 ? 'Ada' : 'Grace', 'must stay hidden'] }],
            connectionId: 'local-postgres-proof',
            objectId: 'relation/dvt/raw/orders',
            provenance: {
              mode: 'live',
              sourceRefs: [
                {
                  schemaVersion: 'connected-source-ref.v1',
                  connectionRef: {
                    schemaVersion: 'connection-ref.v1',
                    connectionId: 'local-postgres-proof',
                    provider: 'postgres',
                  },
                  sourceObjectId: 'relation/dvt/raw/orders',
                },
              ],
              queriedAt:
                sourceReads === 1 ? '2026-09-22T10:00:00.000Z' : '2026-09-22T11:00:00.000Z',
              limit: sample.limit,
              navigation: 'bounded-first-page',
            },
          }),
        };
      });
      stubE2eApi('GET', transformPath, ({ url }) => {
        transformReads += 1;
        return {
          body: TransformDataSampleResponseSchema.parse({
            ...sample,
            provenance: {
              mode: 'live' as const,
              sourceRefs: [
                {
                  schemaVersion: 'connected-source-ref.v1' as const,
                  connectionRef: {
                    schemaVersion: 'connection-ref.v1' as const,
                    connectionId: 'local-postgres-proof',
                    provider: 'postgres',
                  },
                  sourceObjectId: 'relation/dvt/public/orders',
                },
              ],
              queriedAt: asIsoUtcString(
                transformReads === 1 ? '2026-09-22T10:00:00.000Z' : '2026-09-22T11:00:00.000Z'
              ),
              limit: 20,
              navigation: 'bounded-first-page' as const,
            },
            rows: emptyResults ? [] : [{ values: [transformReads === 1 ? 'Ada' : 'Grace'] }],
            canvasId: url.pathname.split('/')[4],
            transformNodeId: 'dvt-transform-1',
            draftRevision: 'revision-1',
            semanticPlanSha256: url.searchParams.get('semanticPlanSha256'),
            ...(url.searchParams.has('relationId')
              ? { relationId: url.searchParams.get('relationId') }
              : {}),
          }),
        };
      });
      visitWithE2eWorkspaceSession('/canvas', {
        onBeforeLoad(window) {
          window.localStorage.setItem(
            'dvt-web-application-language',
            JSON.stringify({ state: { language: 'en' }, version: 0 })
          );
        },
      });
      waitForE2eApiCall('/workspace/graph/draft', 'GET');
      waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    });

    for (const nodeId of ['source-1', 'dvt-transform-1', 'inner-read', 'inner-project']) {
      it(`reveals ${nodeId} Play only on hover or keyboard focus without layout or data changes`, () => {
        if (nodeId.startsWith('inner-')) openWorkbenchModel('dvt-transform-1');
        const host = nodeId.startsWith('inner-')
          ? `li:has(> [data-slot="canvas-relational-tree-node"][data-operator="${nodeId.slice(6)}"])`
          : `.react-flow__node[data-id="${nodeId}"] [data-slot="canvas-node-shell"]`;
        const action = `${host} [data-slot="canvas-node-execute"]`;
        const outside = '[data-slot="canvas-workspace-tab"]';
        hoverWorkbenchCard(outside);
        cy.get(host).then(($host) => {
          const bounds = $host[0].getBoundingClientRect().toJSON();
          const queries = getE2eApiCalls(/data-sample|preview|runs/).length;
          const saves = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
          cy.get(action)
            .should('have.css', 'opacity', '0')
            .and('have.css', 'pointer-events', 'none');
          cy.get(action).then(($action) => {
            hoverWorkbenchCard(host);
            cy.get(action).should('have.css', 'opacity', '1');
            hoverWorkbenchCard(action, -0.05);
            cy.get(action).should('have.css', 'opacity', '1');
            hoverWorkbenchCard(action);
            cy.get(action).should('have.css', 'pointer-events', 'auto');
            hoverWorkbenchCard(outside);
            cy.get(action).should('have.css', 'opacity', '0');
            cy.press(Cypress.Keyboard.Keys.TAB);
            cy.get(action).focus().should('have.css', 'opacity', '1').and('have.focus');
            cy.get(action).blur().should('have.css', 'opacity', '0');
            cy.get(action).should(($same) => expect($same[0]).to.equal($action[0]));
          });
          cy.get(host).should(($same) =>
            expect($same[0].getBoundingClientRect().toJSON()).to.deep.equal(bounds)
          );
          cy.then(() => {
            expect(getE2eApiCalls(/data-sample|preview|runs/)).to.have.length(queries);
            expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(saves);
          });
        });
      });
    }

    it('reveals a disabled pending operation action only while hovered', () => {
      openWorkbenchModel('dvt-transform-1');
      workbenchOperation('inner_join').click();
      const host = '[data-pending-operation="true"]';
      const action = `${host} [data-slot="canvas-node-execute"]`;
      const outside = '[data-slot="canvas-workspace-tab"]';
      hoverWorkbenchCard(outside);
      cy.get(action).should('be.disabled').and('have.css', 'opacity', '0');
      hoverWorkbenchCard(host);
      cy.get(action).should('be.disabled').and('have.css', 'opacity', '0.5');
      hoverWorkbenchCard(outside);
      cy.get(action).should('have.css', 'opacity', '0');
      cy.then(() => expect(getE2eApiCalls(/data-sample|preview|runs/)).to.have.length(0));
      // Complete the authoring gesture so the next test does not navigate past an unsaved draft.
      cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
      cy.get(host).should('not.exist');
    });

    for (const [nodeId, gesture] of [
      ['source-1', 'pointer'],
      ['dvt-transform-1', 'pointer'],
      ['source-1', 'keyboard'],
      ['dvt-transform-1', 'keyboard'],
    ]) {
      it(`loads ${nodeId} below only after Play with ${gesture}`, () => {
        const card = `.react-flow__node[data-id="${nodeId}"]`;
        const path = nodeId === 'source-1' ? sourcePath : transformPath;
        let saves = 0;
        cy.then(() => {
          saves = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
        });
        cy.get(card).find('[data-slot="graph-node-card-title"]').click();
        cy.get(card).find('[data-slot="graph-node-operational-rail"]').dblclick();
        cy.then(() => expect(getE2eApiCalls(path, 'GET')).to.have.length(0));
        if (gesture === 'pointer') hoverWorkbenchCard(card);
        else cy.press(Cypress.Keyboard.Keys.TAB);
        cy.get(card)
          .find('[data-slot="canvas-node-execute"]')
          .focus()
          .should('be.visible')
          .should('have.focus')
          .then(($button) =>
            gesture === 'pointer' ? cy.wrap($button).click() : cy.press(Cypress.Keyboard.Keys.SPACE)
          );
        waitForE2eApiCall(path, 'GET');
        cy.get(`[data-slot="bottom-operational-drawer-tab"][data-tab="data:${nodeId}"]`).should(
          'have.attr',
          'aria-selected',
          'true'
        );
        cy.get('[data-slot="bottom-operational-drawer-data"]')
          .should('contain.text', 'customer')
          .and('contain.text', 'Ada')
          .and('not.contain.text', 'unpublished')
          .and('not.contain.text', 'must stay hidden');
        cy.get('[data-slot="canvas-model-editor"]').should('not.exist');
        cy.then(() => {
          expect(getE2eApiCalls(path, 'GET')).to.have.length(1);
          expect(getE2eApiCalls(path, 'GET')[0]!.url.searchParams.get('limit')).to.equal('20');
          if (nodeId === 'dvt-transform-1') {
            expect(
              getE2eApiCalls(path, 'GET')[0]!.url.searchParams.get('semanticPlanSha256')
            ).to.match(/^[a-f0-9]{64}$/);
          }
          expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(saves);
          expect(getE2eApiCalls('/plans/preview', 'POST')).to.have.length(0);
          expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
        });
        cy.get('[data-slot="live-preview-facts"]')
          .should('contain.text', 'LIVE')
          .and('contain.text', 'PostgreSQL')
          .and('contain.text', '20')
          .and('contain.text', 'No guaranteed row order');
        cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="log"]').click();
        cy.get(`[data-slot="bottom-operational-drawer-tab"][data-tab="data:${nodeId}"]`).click();
        cy.then(() => expect(getE2eApiCalls(path, 'GET')).to.have.length(1));
        cy.get('[data-slot="data-sample-refresh"]')
          .focus()
          .then(($button) =>
            gesture === 'pointer' ? cy.wrap($button).click() : cy.press(Cypress.Keyboard.Keys.SPACE)
          );
        cy.get('[data-slot="bottom-operational-drawer-data"]')
          .should('contain.text', 'Grace')
          .and('not.contain.text', 'Ada')
          .and('not.contain.text', 'must stay hidden');
        cy.get('[data-slot="live-preview-facts"] time').should(
          'have.attr',
          'datetime',
          '2026-09-22T11:00:00.000Z'
        );
        cy.get('[data-slot="data-sample-refresh"]').should('have.focus');
        cy.then(() => expect(getE2eApiCalls(path, 'GET')).to.have.length(2));
      });
    }

    it('keeps nested Source and Transform LIVE preview actions separate', () => {
      cy.viewport(1200, 600);
      cy.get('.react-flow__controls-fitview').click();
      openWorkbenchModel('dvt-transform-1');
      const source = '[data-slot="canvas-relational-tree-node"][data-operator="read"]';
      cy.get(source).click();
      cy.then(() => expect(getE2eApiCalls(sourcePath, 'GET')).to.have.length(0));
      hoverWorkbenchCard(source);
      cy.get(source).parent().find('[data-slot="canvas-node-execute"]').focus().click();
      waitForE2eApiCall(sourcePath, 'GET');
      cy.get('[data-slot="bottom-operational-drawer-data"]').should('contain.text', 'Ada');
      proveResizableDataGrid(
        '[data-slot="bottom-operational-drawer-data"]',
        'compact-source-data-grid'
      );
      cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
      cy.then(() => {
        const calls = getE2eApiCalls(sourcePath, 'GET');
        expect(calls).to.have.length(1);
        expect(calls[0]!.url.searchParams.get('objectId')).to.equal('relation/dvt/raw/orders');
        expect(calls[0]!.url.searchParams.get('limit')).to.equal('20');
        expect(getE2eApiCalls(transformPath, 'GET')).to.have.length(0);
        expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
      });
      const operation = '[data-slot="canvas-relational-tree-node"][data-operator="project"]';
      hoverWorkbenchCard(operation);
      cy.get(operation).parent().find('[data-slot="canvas-node-execute"]').focus().click();
      waitForE2eApiCall(transformPath, 'GET');
      cy.get('[data-slot="canvas-model-data"] [data-slot="live-preview-facts"]')
        .should('contain.text', 'LIVE')
        .and('contain.text', 'PostgreSQL');
      cy.get('[data-slot="canvas-model-preview"]').focus();
      cy.press(Cypress.Keyboard.Keys.SPACE);
      cy.get('[data-slot="canvas-model-data"]').should('contain.text', 'Grace');
      cy.get('[data-slot="canvas-model-preview"]').should('have.focus');
      cy.then(() => expect(getE2eApiCalls(transformPath, 'GET')).to.have.length(2));
      const grid = '[data-slot="canvas-model-data"] [data-slot="bottom-operational-data-grid"]';
      cy.get(grid).should('have.attr', 'data-density', 'compact');
      cy.get(`${grid} [data-slot="bottom-operational-data-value"]`)
        .first()
        .should('have.css', 'font-size', '11px')
        .click();
      cy.get(`${grid} td[data-selected="true"]`).should('have.length', 1);
      cy.get(`${grid} button[aria-label="Copy cell"]`).should('be.enabled');
      cy.get(`${grid} button[aria-label="Comfortable rows"]`).click();
      cy.get(grid).should('have.attr', 'data-density', 'comfortable');
      cy.get(`${grid} button[aria-label="Compact rows"]`).click();
      cy.get(`${grid} button[aria-label="Wrap text"]`).click();
      cy.get(grid).should('have.attr', 'data-wrap', 'true');
      cy.get(`${grid} input[type="search"]`).type('absent');
      cy.get(grid).should('contain.text', 'No matching rows in this sample');
      cy.get(`${grid} button[aria-label="Copy cell"]`).should('be.disabled');
      cy.get(`${grid} input[type="search"]`).clear();
      cy.get(grid).should('contain.text', 'Grace');
      proveResizableDataGrid('[data-slot="canvas-model-data"]', 'compact-operation-data-grid');
      cy.then(() => expect(getE2eApiCalls(transformPath, 'GET')).to.have.length(2));
    });

    for (const nodeId of ['source-1', 'dvt-transform-1']) {
      it(`retains typed headers and a summary for empty ${nodeId} results`, () => {
        const path = nodeId === 'source-1' ? sourcePath : transformPath;
        emptyResults = true;
        const card = `.react-flow__node[data-id="${nodeId}"]`;
        hoverWorkbenchCard(card);
        cy.get(card).find('[data-slot="canvas-node-execute"]').focus().should('be.enabled').click();
        waitForE2eApiCall(path, 'GET');
        cy.get('[data-slot="data-sample-summary"]')
          .should('contain.text', '0 rows')
          .and('contain.text', '1 columns');
        cy.get('[data-slot="bottom-operational-data-table"] thead')
          .should('contain.text', 'customer')
          .and('contain.text', 'string');
        cy.get('[data-slot="bottom-operational-data-table"] tbody tr').should('not.exist');
        cy.get('[data-slot="bottom-operational-drawer-data"]').should(
          'contain.text',
          'returned no rows'
        );
      });
    }
  });
}
