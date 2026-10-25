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
