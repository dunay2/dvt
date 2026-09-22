/** Proves unsupported canonical selectors remain intact and cannot become an executable fallback. */
import { getVisibleCanvasNode } from '../../support/canvasExecutionSelection';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveRunIds,
  seedLiveSelectedClosureDraft,
} from '../../support/liveProtectedRuntime';
import { openWorkbenchModel } from '../../support/relationalWorkbench/navigation';
import { readPersistedDocument } from '../../support/semanticLive/canonicalAssertions';
import {
  importSemanticModel,
  modelId,
  visitSemanticCanvas,
} from '../../support/semanticLive/fixture';
import { unsupportedSortDocument } from '../../support/semanticLive/unsupportedFixture';

describe('Unsupported semantic selector on the protected runtime', () => {
  before(function () {
    // Match existing live-only specs without treating an absent runtime as acceptance evidence.
    if (Cypress.env('apiBaseUrl') == null && Cypress.env('apiBearerToken') == null) this.skip();
  });

  it('rejects data, preserves the document and leaves Canvas usable without starting a Run', () => {
    expect(hasLiveProtectedRuntimeEnv(), 'A live protected runtime is mandatory').to.equal(true);
    resetE2eApiStubs();
    cy.viewport(1440, 1000);
    const document = unsupportedSortDocument();
    let initialRuns: string[];
    let starts = 0;
    readLiveRunIds().then((ids) => {
      initialRuns = ids;
    });
    cy.intercept('POST', '**/runs/start', (request) => {
      starts += 1;
      request.continue();
    });
    cy.intercept('GET', `**/transforms/${modelId}/data-sample?*`).as('rejectedRows');
    seedLiveSelectedClosureDraft({ emptyCanvas: true });
    visitSemanticCanvas();
    importSemanticModel(document);
    openWorkbenchModel(modelId);
    cy.get('[data-operator="unsupported"]').should('be.visible').click();
    cy.get('[data-slot="canvas-relational-tree-inline-editor"]').should(
      'contain.text',
      'Unsupported'
    );
    cy.get('[data-slot="canvas-relational-tree-inline-editor"] form').should('not.exist');
    readPersistedDocument().then((saved) => {
      expect(saved).to.deep.equal(document);
    });
    cy.get('[data-slot="canvas-model-view-tab"][data-view="data"]').click();
    cy.get('[data-slot="canvas-model-data"]:visible [data-slot="canvas-model-preview"]')
      .should('be.enabled')
      .click();
    cy.wait('@rejectedRows', { timeout: 30_000 }).then(({ response }) => {
      expect(response?.statusCode).to.equal(422);
      expect(response!.body.error.type).to.equal('unprocessable_entity');
      expect(response!.body.error.reason).to.equal('transform_data_sample_failed');
      expect(response!.body).not.to.have.property('rows');
    });
    cy.get('[data-slot="canvas-model-data"]:visible [role="alert"]').should('be.visible');
    cy.get('[data-slot="canvas-model-data"]:visible table').should('not.exist');
    cy.screenshot('semantic-live-unsupported-data');
    readPersistedDocument().then((saved) => {
      expect(saved).to.deep.equal(document);
    });
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    getVisibleCanvasNode('source-orders').click();
    cy.get('[data-testid="canvas-viewport"]').should('be.visible');
    cy.then(() => {
      expect(starts).to.equal(0);
    });
    readLiveRunIds().then((ids) => {
      expect(ids).to.deep.equal(initialRuns);
    });
  });
});
