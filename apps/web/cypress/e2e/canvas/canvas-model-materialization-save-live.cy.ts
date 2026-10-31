/** Prove materialization persistence and current-draft diagnostics through the protected API. */
import { DVT_REJECTIONS, type WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import { APPLICATION_LANGUAGE_STORAGE_KEY } from '../../../src/app/stores/applicationLanguageStore';
import {
  clickPreviewExecutionPlanFromOperationalDrawer,
  getVisibleCanvasNode,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import { seedLiveSelectedClosureDraft } from '../../support/liveCanvasDraftAuthoring';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveGraphDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';
import { livePostgresDatabaseName } from '../../support/liveWarehouseSourceImport';

function visitSavedModel(materialized: string): void {
  visitWithLiveWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        APPLICATION_LANGUAGE_STORAGE_KEY,
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  cy.get('.react-flow__pane', { timeout: 20_000 }).should('be.visible');
  cy.get('.react-flow__controls-fitview').click();
  getVisibleCanvasNode('dvt-transform-1')
    .find('[data-slot="graph-node-materialization"]')
    .should('have.text', materialized);
}

function changeAndReadSavedType(materialized: string): void {
  getVisibleCanvasNode('dvt-transform-1').find('[data-slot="graph-node-materialization"]').click();
  cy.get('[role="menuitemradio"]')
    .contains(new RegExp(`^${materialized}$`))
    .click();
  getVisibleCanvasNode('dvt-transform-1')
    .find('[data-slot="graph-node-materialization"]')
    .should('have.text', materialized);
  cy.get('[data-slot="canvas-draft-save-status"]', { timeout: 20_000 }).should('not.exist');
  readLiveGraphDraft().then((response) => {
    expect(response.status).to.equal(200);
    const draft = (response.body as { record: { draft: WorkspaceGraphAuthoringDraft } }).record
      .draft;
    expect(draft.nodes.find((node) => node.id === 'dvt-transform-1')?.metadata?.config).to.include({
      materialized,
    });
  });
}

function inspectModelFormTypography(): void {
  getVisibleCanvasNode('dvt-transform-1').click('topLeft');
  cy.get('[data-slot="canvas-node-workbench-tab-general"]').should('be.visible').click();
  for (const width of [1600, 1200]) {
    cy.viewport(width, 1000);
    cy.get('[data-slot="canvas-node-workbench-tab-general"]').focus();
    cy.get('[data-slot="canvas-node-workbench-panel"]').should(($panel) => {
      const panel = $panel[0]!;
      const view = panel.ownerDocument.defaultView!;
      const tab = panel.querySelector('[data-slot="canvas-node-workbench-tab-general"]')!;
      const referenceSize = view.getComputedStyle(tab).fontSize;
      const form = panel.querySelector<HTMLElement>(
        '[data-slot="node-inspector-editable-section"]'
      )!;
      const fields = form.querySelectorAll(
        '[data-slot="label"], [data-slot="input"], [data-slot="textarea"], select'
      );
      const name = form.querySelector<HTMLElement>('input[name="node-name"]')!;
      const tags = form.querySelector<HTMLElement>('input[name="node-tags"]')!;
      const materialization = form.querySelector<HTMLElement>(
        'select[name="dvt-transform-materialization"]'
      )!;
      const target = form.querySelector<HTMLElement>('[data-slot="dvt-transform-result-target"]')!;
      const nameStyle = view.getComputedStyle(name);
      const selectStyle = view.getComputedStyle(materialization);
      for (const property of [
        'fontFamily',
        'color',
        'backgroundColor',
        'borderTopColor',
        'borderRadius',
        'height',
      ] as const) {
        expect(selectStyle[property], `shared ${property}`).to.equal(nameStyle[property]);
      }
      const metadataGap =
        tags.parentElement!.getBoundingClientRect().top -
        name.parentElement!.getBoundingClientRect().bottom;
      const destinationGap =
        target.getBoundingClientRect().top -
        materialization.parentElement!.getBoundingClientRect().bottom;
      expect(
        Math.abs(destinationGap - metadataGap),
        'destination uses metadata group spacing'
      ).to.be.lessThan(1);
      expect(fields.length, 'rendered metadata and plugin controls').to.be.greaterThan(4);
      const properties = panel.querySelectorAll('dl dt, dl dd');
      expect(properties.length, 'rendered read-only facts').to.be.greaterThan(0);
      for (const field of [...fields, ...properties]) {
        expect(
          view.getComputedStyle(field).fontSize,
          `${field.tagName} matches Inspector scale`
        ).to.equal(referenceSize);
      }
      expect(form.scrollWidth, 'form has no horizontal overflow').to.be.at.most(
        form.clientWidth + 1
      );
    });
    cy.get('select[name="dvt-transform-result-connection"]')
      .should('be.visible')
      .and('have.attr', 'aria-label', 'Connection')
      .focus()
      .should('have.focus');
    cy.get('input[name="node-name"]').focus().should('have.focus');
    cy.screenshot(`model-inspector-shared-typography-${width}`);
  }
  cy.viewport(1600, 1000);
  cy.get('[data-slot="canvas-node-workbench-close"]').click();
  cy.get('.react-flow__controls-fitview').click();
}

describe('Protected model save and readiness', () => {
  it('keeps real loaded Source and Model rows while card and General changes save', () => {
    if (!hasLiveProtectedRuntimeEnv())
      throw new Error('Materialization proof requires protected runtime credentials.');
    resetE2eApiStubs();
    cy.viewport(1600, 1000);
    let sourceRequests = 0;
    let modelRequests = 0;
    seedLiveSelectedClosureDraft({
      authoringGenerated: true,
      terminalTransformPreview: true,
      sourceDatabaseName: livePostgresDatabaseName(),
      terminalTransformResultTarget: { schema: 'public', relation: 'save_continuity_proof' },
      title: 'Materialization preserves loaded SQL rows',
    });
    cy.intercept('GET', '**/workspace/warehouse/connections/*/source-data-sample?*', (request) => {
      sourceRequests += 1;
      request.continue();
    }).as('sourceRows');
    cy.intercept(
      'GET',
      '**/workspace/graph/canvases/*/transforms/dvt-transform-1/data-sample?*',
      (request) => {
        modelRequests += 1;
        request.continue();
      }
    ).as('modelRows');
    visitSavedModel('table');
    getVisibleCanvasNode('source-1').find('[data-slot="canvas-node-execute"]').focus().click();
    cy.wait('@sourceRows', { timeout: 30_000 }).then(({ response }) => {
      expect(response?.statusCode).to.equal(200);
      expect(response?.body.rows).to.have.length(3);
      expect(response?.body.provenance.mode).to.equal('live');
    });
    cy.get('[data-slot="bottom-operational-data-table"] thead [data-column-id]')
      .should('have.length', 1)
      .and('have.text', 'customer');
    cy.get('[data-slot="bottom-operational-data-table"]').should('contain.text', 'Ada');
    getVisibleCanvasNode('dvt-transform-1')
      .find('[data-slot="canvas-node-execute"]')
      .focus()
      .click();
    cy.wait('@modelRows', { timeout: 30_000 }).then(({ response }) => {
      expect(response?.statusCode).to.equal(200);
      expect(response?.body.rows).to.have.length(3);
      expect(response?.body.provenance.mode).to.equal('live');
    });
    const drawerSelector = '[data-slot="bottom-operational-drawer"]';
    const tabSelector =
      '[data-slot="bottom-operational-drawer-tab"][data-tab="data:dvt-transform-1"]';
    const searchSelector = '[data-slot="data-grid-toolbar"] input[type="search"]';
    const tableSelector = '[data-slot="bottom-operational-data-table"]';
    cy.get(tableSelector).find('tbody tr').should('have.length', 3);
    cy.get(searchSelector).type('Ada');
    cy.get(tableSelector).find('[data-column-id="customer"]').click();
    cy.get('[data-slot="data-grid-toolbar"] button[aria-label="Wrap text"]').click();
    cy.get(tableSelector).find('tbody tr').should('have.length', 1);
    let drawer: HTMLElement;
    let table: HTMLElement;
    let search: HTMLInputElement;
    let tab: HTMLElement;
    let height: number;
    let tableText: string;
    let queriedAt: string;
    let observer: MutationObserver;
    const disruptions: string[] = [];
    cy.window().then((window) => {
      drawer = window.document.querySelector<HTMLElement>(drawerSelector)!;
      table = window.document.querySelector<HTMLElement>(tableSelector)!;
      search = window.document.querySelector<HTMLInputElement>(searchSelector)!;
      tab = window.document.querySelector<HTMLElement>(tabSelector)!;
      height = drawer.getBoundingClientRect().height;
      tableText = table.textContent!;
      queriedAt = drawer.querySelector('[data-slot="live-preview-facts"]')!.textContent!;
      observer = new window.MutationObserver(() => {
        if (![drawer, table, search, tab].every((element) => element.isConnected))
          disruptions.push('real loaded drawer DOM was removed');
        if (search.value !== 'Ada' || tab.getAttribute('aria-selected') !== 'true')
          disruptions.push('real loaded exploration state changed');
      });
      observer.observe(window.document.body, { subtree: true, childList: true, attributes: true });
    });
    const assertContinuity = (): void => {
      cy.get(drawerSelector).should(($drawer) => {
        expect($drawer[0], 'same protected drawer').to.equal(drawer);
        expect(drawer.getBoundingClientRect().height, 'saved drawer layout').to.equal(height);
        expect(disruptions, 'no transient loaded-result loss').to.deep.equal([]);
      });
      cy.get(tableSelector).should(($table) => {
        expect($table[0], 'same SQL result table').to.equal(table);
        expect(table.textContent, 'same SQL values and local sort').to.equal(tableText);
      });
      cy.get(searchSelector)
        .should('have.value', 'Ada')
        .and(($search) => {
          expect($search[0], 'same search control').to.equal(search);
        });
      cy.get(tabSelector).should('have.attr', 'aria-selected', 'true');
      cy.get('[data-slot="bottom-operational-data-grid"]').should('have.attr', 'data-wrap', 'true');
      cy.get('[data-slot="live-preview-facts"]').should(($facts) => {
        const facts = $facts[0];
        if (facts === undefined) throw new Error('Expected the loaded query provenance.');
        expect(facts.textContent, 'same SQL query provenance').to.equal(queriedAt);
      });
      cy.then(() => {
        expect(sourceRequests, 'no repeated warehouse Source query').to.equal(1);
        expect(modelRequests, 'no repeated canonical Model query').to.equal(1);
      });
    };
    for (const materialized of ['view', 'table', 'ephemeral', 'table']) {
      changeAndReadSavedType(materialized);
      if (materialized === 'ephemeral') {
        readLiveGraphDraft().then((response) => {
          const draft = (response.body as { record: { draft: WorkspaceGraphAuthoringDraft } })
            .record.draft;
          expect(
            draft.nodes.find((node) => node.id === 'dvt-transform-1')?.metadata?.config
          ).not.to.have.property('resultTarget');
        });
      }
      assertContinuity();
    }
    getVisibleCanvasNode('dvt-transform-1').click('topLeft');
    cy.get('[data-slot="canvas-node-workbench-tab-general"]').click();
    cy.get('select[name="dvt-transform-materialization"]').select('view');
    assertContinuity();
    cy.get('[data-slot="node-inspector-editable-section"]')
      .contains('button', /^Apply$/)
      .click();
    cy.get('[data-slot="canvas-draft-save-status"]', { timeout: 20_000 }).should('not.exist');
    readLiveGraphDraft().then((response) => {
      expect(response.status).to.equal(200);
      const draft = (response.body as { record: { draft: WorkspaceGraphAuthoringDraft } }).record
        .draft;
      expect(
        draft.nodes.find((node) => node.id === 'dvt-transform-1')?.metadata?.config
      ).to.include({ materialized: 'view' });
    });
    assertContinuity();
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get(searchSelector).focus().should('have.focus');
    cy.then(() => observer.disconnect());
    cy.screenshot('live-materialization-general-loaded-drawer-continuity');
  });

  it('saves every authored type, reloads it and replaces the previous rejection without starting Run', () => {
    if (!hasLiveProtectedRuntimeEnv())
      throw new Error('Materialization proof requires protected runtime credentials.');
    resetE2eApiStubs();
    cy.viewport(1600, 1000);
    let startRequests = 0;
    seedLiveSelectedClosureDraft({
      authoringGenerated: true,
      terminalTransformPreview: true,
      sourceDatabaseName: livePostgresDatabaseName(),
      terminalTransformResultTarget: { schema: 'public', relation: 'save_readiness_proof' },
      title: 'Materialization save and current readiness',
    });
    cy.intercept('POST', '**/plans/preview').as('preview');
    cy.intercept('POST', '**/runs/start', (request) => {
      startRequests += 1;
      request.continue();
    });
    visitSavedModel('table');
    inspectModelFormTypography();
    changeAndReadSavedType('view');
    visitSavedModel('view');
    selectCanvasClosure(['dvt-transform-1']);
    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.wait('@preview', { timeout: 30_000 }).then(({ response }) => {
      expect(response?.statusCode).to.equal(422);
      expect(response?.body.error.details.rejection.cause).to.equal(
        DVT_REJECTIONS.runDispositionUnsupported.cause
      );
    });
    cy.get('[data-testid="plan-preview-modal"]').should(
      'contain.text',
      'This result type can be saved'
    );
    cy.get('[data-testid="plan-preview-modal"]')
      .contains('button', /^(Close|Cerrar)$/)
      .click();
    changeAndReadSavedType('ephemeral');
    cy.get('[data-slot="bottom-operational-drawer"]')
      .should('not.contain.text', 'This result type can be saved')
      .and('not.contain.text', 'Authorization denied');
    visitSavedModel('ephemeral');
    changeAndReadSavedType('table');
    visitSavedModel('table');
    selectCanvasClosure(['dvt-transform-1']);
    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.wait('@preview', { timeout: 30_000 }).then(({ response }) => {
      expect(response?.statusCode).to.equal(422);
      expect(response?.body.error.details.rejection.cause).to.equal(
        DVT_REJECTIONS.runTargetInvalid.cause
      );
    });
    cy.get('[data-testid="plan-preview-modal"]').should(
      'contain.text',
      'Configure a valid output connection, schema and table'
    );
    cy.get('[data-slot="shell-run-command"]').should('be.disabled');
    cy.then(() => expect(startRequests).to.equal(0));
    cy.screenshot('all-materializations-saved-current-rejection');
  });
});
