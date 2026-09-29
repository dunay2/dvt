/** Progressively harder real PostgreSQL verticals; no API or row stubs. */
import type { DvtSubstraitSemanticDocumentV1 } from '@dvt/contracts';

import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  seedLiveSelectedClosureDraft,
  readLiveGraphDraft,
} from '../../support/liveProtectedRuntime';
import {
  openWorkbenchModel,
  previewWorkbenchModel,
} from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import { readPersistedDocument } from '../../support/semanticLive/canonicalAssertions';
import { executePersistedModel } from '../../support/semanticLive/execution';
import {
  importSemanticModel,
  modelId,
  visitSemanticCanvas,
} from '../../support/semanticLive/fixture';
import {
  progressiveDocument,
  addLiveFormula,
  progressiveScenarios,
} from '../../support/semanticLive/progressive';

function stageUnary(operation: string, producer: string, disconnectOutput = false): void {
  workbenchOperation(operation).should('have.attr', 'aria-disabled', 'false').click();
  cy.get(`[data-pending-operation="true"] [data-operator="${operation}"]`).should('exist');
  if (disconnectOutput) {
    cy.get('[data-slot="canvas-relational-output-input-port"]').focus().type('{del}');
    cy.get('[data-slot="canvas-relational-output-input-port"]').should(
      'not.have.attr',
      'data-connected'
    );
  }
  cy.window().then((window) => {
    const dataTransfer = new window.DataTransfer();
    cy.get(producer)
      .last()
      .closest('li')
      .find('[data-slot="canvas-relational-output-port"]')
      .trigger('dragstart', { dataTransfer });
    cy.get(`[data-pending-operation="true"] [data-operator="${operation}"]`)
      .closest('li')
      .find('[data-slot="canvas-relational-input-port"]')
      .trigger('dragover', { dataTransfer })
      .trigger('drop', { dataTransfer });
  });
  cy.get(`[data-pending-operation="true"] [data-operator="${operation}"]`)
    .closest('li')
    .find('[data-slot="canvas-relational-input-port"]')
    .should('have.attr', 'data-connected', 'true');
}

describe('Progressive SQL verticals', () => {
  beforeEach(function () {
    if (Cypress.env('apiBaseUrl') == null && Cypress.env('apiBearerToken') == null) this.skip();
    expect(hasLiveProtectedRuntimeEnv(), 'Requires the live protected runner').to.equal(true);
    resetE2eApiStubs();
    cy.viewport(1600, 1100);
    seedLiveSelectedClosureDraft({ emptyCanvas: true });
    visitSemanticCanvas();
  });
  for (const scenario of progressiveScenarios) {
    it(`authors, persists, previews and publishes vertical ${scenario.level}`, () => {
      let initial: DvtSubstraitSemanticDocumentV1;
      let persisted: DvtSubstraitSemanticDocumentV1;
      let requests = 0;
      cy.intercept('GET', `**/transforms/${modelId}/data-sample?*`, (request) => {
        requests += 1;
        request.continue();
      }).as('rows');
      const resultRelation = `sql_vertical_${scenario.level}`;
      cy.then(() => progressiveDocument(scenario.level)).then((document) => {
        initial = document;
        importSemanticModel(document, { name: `SQL vertical ${scenario.level}`, resultRelation });
      });
      openWorkbenchModel(modelId);
      cy.get('[data-operator="project"]').click();
      cy.intercept('PUT', '**/workspace/graph/draft').as('saveDraft');
      for (const [alias, formula] of scenario.formulas) addLiveFormula(alias, formula);
      if (scenario.level === 3) {
        cy.get('[data-slot="canvas-model-tab-close"]').click();
        visitSemanticCanvas();
        openWorkbenchModel(modelId);
        stageUnary('aggregate', '[data-operator="project"]', true);
        cy.get('[data-slot="canvas-staged-operation-inspector"] form').within(() => {
          cy.contains('label', 'GROUP BY').find('select').select('region');
          cy.contains('label', 'Aggregate function').find('select').select('SUM');
          cy.contains('label', 'Measure field').find('select').select('line_total');
          cy.contains('label', 'Result name').find('input').clear().type('revenue');
          cy.get('button[type="submit"]').click();
        });
        cy.get('[data-operator="aggregate"]').click();
        stageUnary('window', '[data-operator="aggregate"]');
        cy.get('[data-slot="canvas-staged-operation-inspector"] form').within(() => {
          cy.contains('label', 'ORDER BY').find('select').select('revenue');
          cy.contains('label', 'Result name').find('input').clear().type('rank');
          cy.get('button[type="submit"]').click();
        });
        stageUnary('sort', '[data-operator="window"]');
        cy.get('[data-slot="canvas-staged-operation-inspector"] form').within(() => {
          cy.get('select').first().select('revenue');
          cy.get('select[aria-label="Direction and nulls 1"]').select('DESC · NULLS LAST');
          cy.get('button[type="submit"]').click();
        });
        cy.get('[data-operator="sort"]').click();
        stageUnary('fetch', '[data-operator="sort"]');
        cy.contains('[data-slot="canvas-staged-operation-inspector"] label', 'LIMIT')
          .find('input')
          .type('1');
        cy.get('[data-slot="canvas-staged-operation-inspector"] button[type="submit"]').click();
        cy.window().then((window) => {
          const dataTransfer = new window.DataTransfer();
          cy.get('[data-operator="fetch"]')
            .closest('li')
            .find('[data-slot="canvas-relational-output-port"]')
            .trigger('dragstart', { dataTransfer });
          cy.get('[data-slot="canvas-relational-output-input-port"]')
            .trigger('dragover', { dataTransfer })
            .trigger('drop', { dataTransfer });
        });
        cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
        cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
        cy.wait('@saveDraft').its('response.statusCode').should('eq', 200);
        cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
      }
      cy.then(() => {
        expect(requests, 'Editing does not run data queries').to.equal(0);
      });
      cy.then(() => readPersistedDocument(initial.semanticPlan.sha256)).then((document) => {
        persisted = document;
      });
      cy.get('[data-slot="canvas-model-tab-close"]').click();
      visitSemanticCanvas();
      openWorkbenchModel(modelId);
      readPersistedDocument().then((document) => {
        expect(document).to.deep.equal(persisted);
      });
      cy.screenshot(`sql-vertical-${scenario.level}-reopened`);
      previewWorkbenchModel(modelId);
      cy.wait('@rows', { timeout: 30_000 }).then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
        expect(response!.body.semanticPlanSha256).to.equal(persisted.semanticPlan.sha256);
        expect(response!.body.columns.map((field: { name: string }) => field.name)).to.deep.equal(
          scenario.columns
        );
        expect(
          response!.body.rows.map((row: { values: unknown[] }) => row.values).sort()
        ).to.deep.equal([...scenario.rows].sort());
      });
      cy.screenshot(`sql-vertical-${scenario.level}-preview`);
      readLiveGraphDraft().then(({ body }) => {
        cy.writeFile(`../../tmp/sql-vertical-3456/level-${scenario.level}-draft.json`, body);
      });
      cy.get('[data-slot="canvas-model-tab-close"]').click();
      cy.then(() =>
        executePersistedModel(persisted.semanticPlan.sha256, {
          columns: scenario.columns,
          rows: scenario.rows,
          screenshot: `sql-vertical-${scenario.level}-published`,
          resultRelation,
        })
      );
    });
  }
});
