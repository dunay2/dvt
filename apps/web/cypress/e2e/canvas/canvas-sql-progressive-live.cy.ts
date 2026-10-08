/**
 * Owned concern: prove progressively harder SQL verticals against real protected PostgreSQL.
 * @baseline GH-2524-LIVE-V1-CONSUMERS: one workload V1 from authoring to publication.
 * @decision Reuse shared user gestures; keep exact semantic revision and rows in each scenario.
 * @consequence No duplicated drag engine, mocked query or alternative acceptance path.
 * @version 1.0.0
 */
import type { DvtSubstraitSemanticDocumentV1 } from '@dvt/contracts';

import { resetE2eApiStubs } from '../../support/e2eApiStub';
import { seedLiveSelectedClosureDraft } from '../../support/liveCanvasDraftAuthoring';
import { hasLiveProtectedRuntimeEnv, readLiveGraphDraft } from '../../support/liveProtectedRuntime';
import {
  openWorkbenchModel,
  previewWorkbenchModel,
  connectWorkbenchProducer,
  stageWorkbenchUnary,
} from '../../support/relationalWorkbench/navigation';
import { connectStagedTransformChain } from '../../support/relationalWorkbench/transformChainJourney';
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

describe('Progressive SQL verticals', () => {
  beforeEach(function () {
    if (Cypress.env('apiBaseUrl') == null && Cypress.env('apiBearerToken') == null) this.skip();
    expect(hasLiveProtectedRuntimeEnv(), 'Requires the live protected runner').to.equal(true);
    resetE2eApiStubs();
    cy.viewport(1600, 1100);
    Cypress.Screenshot.defaults({ scale: true });
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
      if (scenario.level === 1) {
        connectStagedTransformChain(
          '[data-operator="read"]',
          'client_id',
          'CAMPO_PRUEBA',
          'COALESCE(UPPER(TRIM("client_id")), NULL)'
        );
        cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
        cy.get('[data-pending-operation="true"]').should('not.exist');
        cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
        cy.get('[data-operator="project"]').should('have.length', 2);
        cy.get('[data-slot="canvas-relational-tree-fit"]').click();
      }
      cy.get('[data-operator="project"]').first().click();
      for (const [alias, formula] of scenario.formulas) addLiveFormula(alias, formula);
      if (scenario.level === 3) {
        cy.get('[data-slot="canvas-model-tab-close"]').click();
        visitSemanticCanvas();
        openWorkbenchModel(modelId);
        stageWorkbenchUnary('aggregate', '[data-operator="project"]', true);
        cy.get('[data-slot="canvas-staged-operation-inspector"] form').within(() => {
          cy.contains('label', 'GROUP BY').find('select').select('region');
          cy.contains('label', 'Aggregate function').find('select').select('SUM');
          cy.contains('label', 'Measure field').find('select').select('line_total');
          cy.contains('label', 'Result name').find('input').clear().type('revenue');
          cy.get('button[type="submit"]').click();
        });
        cy.get('[data-operator="aggregate"]').click();
        stageWorkbenchUnary('window', '[data-operator="aggregate"]');
        cy.get('[data-slot="canvas-relational-tree-node"][data-presentation="window"]')
          .invoke('attr', 'data-relation-id')
          .should('be.a', 'string')
          .as('windowRelationId', { type: 'static' });
        cy.get('[data-slot="canvas-staged-operation-inspector"] form').within(() => {
          cy.contains('label', 'ORDER BY').find('select').select('revenue');
          cy.contains('label', 'Result name').find('input').clear().type('rank');
          cy.get('button[type="submit"]').click();
        });
        cy.get<string>('@windowRelationId').then((relationId) => {
          stageWorkbenchUnary(
            'sort',
            `[data-slot="canvas-relational-tree-node"][data-relation-id="${relationId}"]`
          );
        });
        cy.get('[data-slot="canvas-staged-operation-inspector"] form').within(() => {
          cy.get('select').first().select('revenue');
          cy.get('select[aria-label="Direction and nulls 1"]').select('DESC · NULLS LAST');
          cy.get('button[type="submit"]').click();
        });
        cy.get('[data-operator="sort"]').click();
        stageWorkbenchUnary('fetch', '[data-operator="sort"]');
        cy.contains('[data-slot="canvas-staged-operation-inspector"] label', 'LIMIT')
          .find('input')
          .type('1');
        cy.get('[data-slot="canvas-staged-operation-inspector"] button[type="submit"]').click();
        cy.get('[data-operator="fetch"]').closest('li').as('fetchOutput');
        connectWorkbenchProducer(
          '@fetchOutput',
          '[data-slot="canvas-relational-output-input-port"]',
          null
        );
        cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
        cy.get('[data-pending-operation="true"]').should('not.exist');
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
      cy.get('[data-slot="bottom-operational-data-table"]')
        .should('be.visible')
        .within(() => {
          cy.get('thead [data-column-id]').should(($columns) => {
            expect([...$columns].map((column) => column.textContent)).to.deep.equal(
              scenario.columns
            );
          });
          cy.get('tbody tr').should(($rows) => {
            const rows = [...$rows].map((row) =>
              [...row.querySelectorAll('td')].map((cell) => cell.textContent)
            );
            expect(rows.sort()).to.deep.equal(
              scenario.rows.map((row) => row.map((value) => String(value ?? 'NULL'))).sort()
            );
          });
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
