/** Real browser -> composed input operations -> saved Substrait -> protected PostgreSQL sample. */
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { DvtSubstraitSemanticDocumentV1 } from '@dvt/contracts';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  seedLiveSelectedClosureDraft,
} from '../../support/liveProtectedRuntime';
import { exteriorOutputColumns } from '../../support/relationalWorkbench/columns';
import { openWorkbenchModel } from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import { readPersistedDocument } from '../../support/semanticLive/canonicalAssertions';
import {
  expectedColumns,
  importSemanticModel,
  leftJoinDocument,
  modelId,
  visitSemanticCanvas,
} from '../../support/semanticLive/fixture';

describe('Selected input transformations through real PostgreSQL', () => {
  let initial: DvtSubstraitSemanticDocumentV1;
  beforeEach(function () {
    if (Cypress.env('apiBaseUrl') == null && Cypress.env('apiBearerToken') == null) this.skip();
    expect(hasLiveProtectedRuntimeEnv(), 'Requires the protected live runner').to.equal(true);
    resetE2eApiStubs();
    cy.viewport(1440, 1000);
    seedLiveSelectedClosureDraft({ emptyCanvas: true });
    visitSemanticCanvas();
    cy.then(leftJoinDocument).then((document) => {
      initial = document;
    });
  });
  it('filters, sorts and limits both operands while preserving LEFT JOIN unmatched rows', () => {
    let persisted: DvtSubstraitSemanticDocumentV1;
    let samples = 0;
    let joinId = '';
    cy.intercept('GET', `**/transforms/${modelId}/data-sample?*`, (request) => {
      samples += 1;
      request.continue();
    }).as('rows');
    cy.then(() => importSemanticModel(initial));
    exteriorOutputColumns(modelId).should('deep.equal', expectedColumns);
    openWorkbenchModel(modelId);
    for (const [source, field, value] of [
      ['orders', 'client_id', 'C-001'],
      ['client', 'country', 'US'],
    ]) {
      cy.then(() => {
        const id = initial.sidecar.relations.find(
          (relation) => relation.sourceRef != null && relation.displayName === source
        )!.relationId;
        cy.get(`[data-operator="read"][data-relation-id="${id}"]`).click();
      });
      workbenchOperation('filter').click();
      cy.get('[role="dialog"] form select').first().select(field!);
      cy.get('[role="dialog"] form input').type(value!);
      cy.get('[role="dialog"] button[type="submit"]').click();
      cy.get('[data-operator="filter"]').last().click();
      workbenchOperation('sort').click();
      cy.get('[role="dialog"] form select')
        .first()
        .select(source === 'orders' ? 'order_id' : 'client_id');
      cy.get('[role="dialog"] form select')
        .eq(1)
        .select(String(SortField_SortDirection.DESC_NULLS_LAST));
      cy.get('[role="dialog"] button[type="submit"]').click();
      cy.get('[data-operator="sort"]').last().click();
      workbenchOperation('fetch').click();
      cy.contains('[role="dialog"] label', /^LIMIT$/)
        .find('input')
        .type('1');
      cy.get('[role="dialog"] button[type="submit"]').click();
    }
    cy.get('[data-operator="filter"]').should('have.length', 2);
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.then(() => readPersistedDocument(initial.semanticPlan.sha256)).then((document) => {
      persisted = document;
      const indexed = indexSubstraitRelations(decodeDvtSubstraitSemanticDocument(document));
      if (!indexed.ok) throw indexed.error;
      const join = [...indexed.index.relations.values()].find(
        (entry) => entry.relation.relType.case === 'join'
      )!;
      joinId = join.binding.relationId;
      for (const input of join.inputs) {
        let relation = indexed.index.relations.get(input)!;
        for (const operator of ['fetch', 'sort', 'filter', 'read']) {
          expect(relation.relation.relType.case).to.equal(operator);
          if (relation.inputs.length > 0)
            relation = indexed.index.relations.get(relation.inputs[0]!)!;
        }
      }
    });
    cy.then(() => expect(samples).to.equal(0));
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitSemanticCanvas();
    exteriorOutputColumns(modelId).should('deep.equal', expectedColumns);
    openWorkbenchModel(modelId);
    cy.get('[data-operator="filter"]').should('have.length', 2);
    cy.get('[data-operator="join"]')
      .parent()
      .find('[data-slot="canvas-node-execute"]')
      .focus()
      .click();
    cy.wait('@rows', { timeout: 30_000 }).then(({ request, response }) => {
      expect(response?.statusCode).to.equal(200);
      const query = new URL(request.url).searchParams;
      expect(query.get('relationId')).to.equal(joinId);
      expect(query.get('semanticPlanSha256')).to.equal(persisted.semanticPlan.sha256);
      expect(response!.body.semanticPlanSha256).to.equal(persisted.semanticPlan.sha256);
      expect(response!.body.columns.map((column: { name: string }) => column.name)).to.deep.equal(
        expectedColumns
      );
      expect(
        response!.body.rows.map((row: { values: unknown[] }) => row.values).sort()
      ).to.deep.equal([['3', 'C-001', null, null]]);
    });
    cy.get('[data-slot="canvas-operation-data-preview"] table').should('contain.text', 'C-001');
  });
});
