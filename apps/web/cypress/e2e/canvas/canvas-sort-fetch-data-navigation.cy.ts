/** Owned concern: apply edited ordering before explicit data queries without crashing inspection. */
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  inspectDvtSubstraitSortFetchRoot,
  selectDvtSubstraitRelation,
} from '@dvt/postgres-projection';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  openWorkbenchModel,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import {
  semanticDocumentFromWrite,
  semanticWrites,
  stubSavedWorkbenchSample,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Sort/Fetch data navigation (controlled API boundary)', () => {
  it('applies the changed direction, preserves Fetch and queries the saved revision after navigation and reopen', () => {
    stubWorkbenchScenario('saved-join');
    stubSavedWorkbenchSample();
    cy.viewport(1440, 1000);
    visitWorkbenchCanvas();
    openWorkbenchModel();
    workbenchOperation('fetch').click();
    cy.contains('[role="dialog"] label', 'LIMIT').find('input').clear().type('100');
    cy.get('[role="dialog"] button[type="submit"]').click();
    workbenchOperation('sort').click();
    cy.get('[role="dialog"] button[type="submit"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.wrap(null).should(() => expect(semanticWrites('join-transform')).not.to.have.length(0));

    let sortId = '';
    let originalDigest = '';
    let savedDigest = '';
    cy.then(() => {
      const document = semanticDocumentFromWrite(semanticWrites('join-transform').at(-1)!) as {
        semanticPlan: { sha256: string };
      };
      originalDigest = document.semanticPlan.sha256;
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
    cy.get('[role="alertdialog"]').should('be.visible');
    cy.then(() => expect(getE2eApiCalls(/\/data-sample/, 'GET')).to.have.length(0));
    cy.contains('[role="alertdialog"] button', 'Apply and continue').click();
    cy.get('[role="alertdialog"]').should('not.exist');
    cy.get('[data-slot="canvas-model-view-tab"][data-view="data"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.wrap(null).should(() => {
      const document = semanticDocumentFromWrite(semanticWrites('join-transform').at(-1)!) as {
        semanticPlan: { sha256: string };
      };
      expect(document.semanticPlan.sha256).not.to.equal(originalDigest);
      savedDigest = document.semanticPlan.sha256;
      const draft = decodeDvtSubstraitSemanticDocument(document);
      const sort = inspectDvtSubstraitSortFetchRoot(selectDvtSubstraitRelation(draft, sortId));
      expect(sort.ok && sort.operation).to.equal('sort');
      if (!sort.ok || sort.operation !== 'sort') throw new Error('Expected saved Sort');
      expect(sort.keys.map((key) => key.direction)).to.deep.equal([
        SortField_SortDirection.DESC_NULLS_LAST,
      ]);
      const fetch = inspectDvtSubstraitSortFetchRoot(
        selectDvtSubstraitRelation(draft, sort.inputRelationId)
      );
      expect(fetch.ok && fetch.operation).to.equal('fetch');
      if (!fetch.ok || fetch.operation !== 'fetch') throw new Error('Expected preserved Fetch');
      expect(fetch.count).to.equal(100n);
    });
    cy.then(() => expect(getE2eApiCalls(/\/data-sample/, 'GET')).to.have.length(0));
    cy.get('[data-slot="canvas-model-data"]:visible [data-slot="canvas-model-preview"]').click();
    cy.get('[data-slot="canvas-model-data"]:visible table').should('contain.text', 'C-001');
    cy.then(() => {
      const call = getE2eApiCalls(/\/data-sample/, 'GET').at(-1)!;
      expect(call.url.searchParams.get('relationId')).to.equal(null);
      cy.get(`[data-slot="canvas-model-data"]:visible [title="${savedDigest}"]`).should('exist');
    });

    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitWorkbenchCanvas();
    openWorkbenchModel();
    cy.get('[data-operator="sort"]').should('contain.text', 'DESC NULLS LAST').click();
    cy.get(
      '[data-slot="canvas-relational-tree-inline-editor"]:visible select[aria-label="Direction and nulls 1"]'
    ).should('have.value', String(SortField_SortDirection.DESC_NULLS_LAST));
    cy.get('[data-operator="fetch"]').should('contain.text', 'LIMIT 100');
    cy.get(
      '[data-slot="canvas-operation-data-preview"] [data-slot="canvas-model-preview"]'
    ).click();
    cy.get('[data-slot="canvas-operation-data-preview"] table').should('contain.text', 'C-001');
    cy.then(() => {
      const call = getE2eApiCalls(/\/data-sample/, 'GET').at(-1)!;
      expect(call.url.searchParams.get('relationId')).to.equal(sortId);
      expect(call.url.searchParams.get('semanticPlanSha256')).to.equal(savedDigest);
    });
  });
});
