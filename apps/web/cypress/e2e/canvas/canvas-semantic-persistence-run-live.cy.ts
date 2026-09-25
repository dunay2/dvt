/** Proves editing and reopening canonical semantics before querying and executing the same revision. */
import type { DvtSubstraitSemanticDocumentV1 } from '@dvt/contracts';

import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  seedLiveSelectedClosureDraft,
} from '../../support/liveProtectedRuntime';
import { openWorkbenchModel } from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import {
  expectCanonicalOrdering,
  readPersistedDocument,
} from '../../support/semanticLive/canonicalAssertions';
import { executePersistedModel } from '../../support/semanticLive/execution';
import {
  expectedColumns,
  expectedRows,
  expectedSortedRows,
  importSemanticModel,
  leftJoinDocument,
  modelId,
  visitSemanticCanvas,
} from '../../support/semanticLive/fixture';

describe('Persisted semantic editing through protected Preview and Run', () => {
  let initialDocument: DvtSubstraitSemanticDocumentV1;
  beforeEach(function () {
    // The generic Cypress lane has no protected runtime; only the live runner proves this story.
    if (Cypress.env('apiBaseUrl') == null && Cypress.env('apiBearerToken') == null) this.skip();
    expect(
      hasLiveProtectedRuntimeEnv(),
      'Run with test:e2e:selected-closure:live; no stubbed fallback'
    ).to.equal(true);
    resetE2eApiStubs();
    cy.viewport(1440, 1000);
    seedLiveSelectedClosureDraft({ emptyCanvas: true });
    visitSemanticCanvas();
    cy.then(leftJoinDocument).then((document) => {
      initialDocument = document;
    });
  });

  it('preserves LEFT JOIN, edited Sort and Fetch through save, reopen, data and publication', () => {
    let sortId = '';
    let fetchId = '';
    let beforeEdit: DvtSubstraitSemanticDocumentV1;
    let persisted: DvtSubstraitSemanticDocumentV1;
    let sampleRequests = 0;
    let runRequests = 0;
    cy.intercept('GET', `**/transforms/${modelId}/data-sample?*`, (request) => {
      sampleRequests += 1;
      request.continue();
    }).as('liveRows');
    cy.intercept('POST', '**/runs/start', (request) => {
      runRequests += 1;
      request.continue();
    });
    cy.then(() => importSemanticModel(initialDocument));
    openWorkbenchModel(modelId);
    workbenchOperation('sort').click();
    cy.get('[role="dialog"] button[type="submit"]').click();
    workbenchOperation('fetch').click();
    cy.contains('[role="dialog"] label', 'LIMIT').find('input').clear().type('2');
    cy.get('[role="dialog"] button[type="submit"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.then(() => readPersistedDocument(initialDocument.semanticPlan.sha256)).then((document) => {
      beforeEdit = document;
    });
    cy.get('[data-operator="fetch"]').then(($card) => {
      fetchId = $card.attr('data-relation-id')!;
    });
    cy.get('[data-operator="sort"]')
      .then(($card) => {
        sortId = $card.attr('data-relation-id')!;
      })
      .click();
    cy.get(
      '[data-slot="canvas-relational-tree-inline-editor"]:visible select[aria-label="Direction and nulls 1"]'
    ).select('DESC · NULLS LAST');
    cy.get(
      '[data-slot="canvas-relational-tree-inline-editor"]:visible button[type="submit"]'
    ).click();
    cy.get('[data-slot="canvas-model-view-tab"][data-view="data"]').click();
    cy.contains('[role="alertdialog"] button', 'Apply and continue').click();
    cy.get('[role="alertdialog"]').should('not.exist');
    cy.then(() => readPersistedDocument(beforeEdit.semanticPlan.sha256)).then((document) => {
      persisted = document;
      expectCanonicalOrdering(document, sortId, fetchId);
      expect(document.semanticPlan.sha256).not.to.equal(beforeEdit.semanticPlan.sha256);
      expect(document.sidecar.relations).to.deep.equal(beforeEdit.sidecar.relations);
      expect(document.sidecar.fields).to.deep.equal(beforeEdit.sidecar.fields);
    });
    cy.then(() => {
      expect(sampleRequests).to.equal(0);
      expect(runRequests).to.equal(0);
    });

    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitSemanticCanvas();
    openWorkbenchModel(modelId);
    readPersistedDocument().then((document) => {
      expect(document).to.deep.equal(persisted);
    });
    cy.get('[data-operator="fetch"]').should('contain.text', 'LIMIT 2');
    cy.get('[data-operator="sort"]').should('contain.text', 'DESC NULLS LAST').click();
    cy.then(() => {
      expect(sampleRequests).to.equal(0);
    });
    cy.get('[data-operator="sort"]')
      .parent()
      .find('[data-slot="canvas-node-execute"]')
      .focus()
      .click();
    cy.wait('@liveRows', { timeout: 30_000 }).then(({ request, response }) => {
      const query = new URL(request.url).searchParams;
      expect(query.get('relationId')).to.equal(sortId);
      expect(query.get('semanticPlanSha256')).to.equal(persisted.semanticPlan.sha256);
      expect(response?.statusCode).to.equal(200);
      expect(response!.body.semanticPlanSha256).to.equal(persisted.semanticPlan.sha256);
      expect(response!.body.columns.map((column: { name: string }) => column.name)).to.deep.equal(
        expectedColumns
      );
      expect(response!.body.rows.map((row: { values: unknown[] }) => row.values)).to.deep.equal(
        expectedSortedRows
      );
    });
    cy.get('[data-slot="canvas-operation-data-preview"] table').should('contain.text', 'C-014');
    cy.screenshot('semantic-live-reopened-operation-data');
    cy.get('[data-slot="canvas-model-view-tab"][data-view="data"]').click();
    cy.get('[data-slot="canvas-model-data"]:visible [data-slot="canvas-model-preview"]').click();
    cy.wait('@liveRows', { timeout: 30_000 }).then(({ request, response }) => {
      expect(new URL(request.url).searchParams.get('relationId')).to.equal(null);
      expect(response?.statusCode).to.equal(200);
      expect(response!.body.semanticPlanSha256).to.equal(persisted.semanticPlan.sha256);
      expect(response!.body.rows.map((row: { values: unknown[] }) => row.values)).to.deep.equal(
        expectedRows
      );
    });
    cy.then(() => {
      expect(runRequests).to.equal(0);
    });
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.then(() => {
      executePersistedModel(persisted.semanticPlan.sha256);
    });
  });
});
