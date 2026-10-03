/** Owned concern: apply edited ordering before explicit data queries without crashing inspection. */
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  openWorkbenchModel,
  previewWorkbenchModel,
  visitWorkbenchCanvas,
  connectWorkbenchProducer,
} from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import {
  semanticDocumentFromWrite,
  semanticWrites,
  stubSavedWorkbenchSample,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Sort/Fetch data navigation (controlled API boundary)', () => {
  for (const ordering of [
    ['fetch', 'sort'],
    ['sort', 'fetch'],
  ] as const) {
    it(`preserves the selected Sort in ${ordering.join(' then ')} after Apply and reopen`, () => {
      stubWorkbenchScenario('saved-join');
      stubSavedWorkbenchSample();
      cy.viewport(1440, 1000);
      visitWorkbenchCanvas();
      openWorkbenchModel();
      cy.get('[data-operator="join"]').closest('li').as('producer', { type: 'static' });
      for (const [index, operation] of ordering.entries()) {
        workbenchOperation(operation).click();
        cy.get('[data-pending-operation="true"]').last().as(`unary${index}`, { type: 'static' });
        connectWorkbenchProducer(index === 0 ? '@producer' : '@unary0', `@unary${index}`);
        const editor = '[data-slot="canvas-staged-operation-inspector"]';
        if (operation === 'fetch')
          cy.contains(`${editor} label`, 'LIMIT').find('input').clear().type('100');
        cy.get(`${editor} button[type="submit"]`).click();
      }
      connectWorkbenchProducer(
        '@unary1',
        '[data-slot="canvas-relational-output-input-port"]',
        null
      );
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      cy.wrap(null).should(() => expect(semanticWrites('join-transform')).not.to.have.length(0));

      let sortId = '';
      let fetchId = '';
      let originalDigest = '';
      let savedDigest = '';
      let selectedDirection = '';
      cy.get('[data-operator="fetch"]').then(($card) => {
        fetchId = $card.attr('data-relation-id')!;
      });
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
      cy.get('[data-slot="canvas-relational-edit"]').click();
      cy.get(
        '[data-slot="canvas-relational-tree-inline-editor"]:visible select[aria-label="Direction and nulls 1"]'
      )
        .select('DESC · NULLS LAST')
        .invoke('val')
        .then((value) => {
          selectedDirection = String(value);
        });
      cy.get(
        '[data-slot="canvas-relational-tree-inline-editor"]:visible button[type="submit"]'
      ).click();
      cy.get('[role="alertdialog"]').should('not.exist');
      cy.then(() => expect(getE2eApiCalls(/\/data-sample/, 'GET')).to.have.length(0));
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      cy.get('[role="alertdialog"]').should('not.exist');
      cy.wrap(null).should(() => {
        const document = semanticDocumentFromWrite(semanticWrites('join-transform').at(-1)!) as {
          semanticPlan: { sha256: string };
        };
        expect(document.semanticPlan.sha256).not.to.equal(originalDigest);
        savedDigest = document.semanticPlan.sha256;
        const draft = decodeDvtSubstraitSemanticDocument(document);
        const indexed = indexSubstraitRelations(draft);
        if (!indexed.ok) throw indexed.error;
        const sort = indexed.index.relations.get(sortId)?.relation.relType;
        if (sort?.case !== 'sort') throw new Error('Expected saved Sort');
        expect(sort.value.sorts.map((key) => key.sortKind)).to.deep.equal([
          { case: 'direction', value: Number(selectedDirection) },
        ]);
        const fetch = indexed.index.relations.get(fetchId)?.relation.relType;
        if (fetch?.case !== 'fetch') throw new Error('Expected preserved Fetch');
        const count = fetch.value.countExpr?.rexType;
        if (count?.case !== 'literal') throw new Error('Expected literal Fetch count');
        expect(count.value.literalType).to.deep.equal({ case: 'i64', value: 100n });
      });
      cy.then(() => expect(getE2eApiCalls(/\/data-sample/, 'GET')).to.have.length(0));
      previewWorkbenchModel();
      cy.get('[data-slot="bottom-operational-drawer-data"] table').should('contain.text', 'C-001');
      cy.then(() => {
        const call = getE2eApiCalls(/\/data-sample/, 'GET').at(-1)!;
        expect(call.url.searchParams.get('relationId')).to.equal(null);
        expect(call.url.searchParams.get('semanticPlanSha256')).to.equal(savedDigest);
      });
      cy.get('[data-slot="canvas-model-main-tab"]').click();
      cy.get('[data-slot="canvas-relational-tree-node"][aria-selected="true"]').should(
        'have.attr',
        'data-operator',
        'sort'
      );
      cy.get('[data-slot="canvas-relational-tree-node"][data-operator="sort"]')
        .parent()
        .find('[data-slot="canvas-node-execute"]')
        .focus()
        .click();
      cy.get('[data-slot="canvas-operation-data-preview"] table').should('contain.text', 'C-001');
      cy.then(() => {
        const call = getE2eApiCalls(/\/data-sample/, 'GET').at(-1)!;
        expect(call.url.searchParams.get('relationId')).to.equal(sortId);
        expect(call.url.searchParams.get('semanticPlanSha256')).to.equal(savedDigest);
      });

      cy.get('[data-slot="canvas-model-tab-close"]').click();
      visitWorkbenchCanvas();
      openWorkbenchModel();
      cy.get('[data-operator="sort"]').should('contain.text', 'DESC NULLS LAST').click();
      cy.get('[data-slot="canvas-relational-edit"]').click();
      cy.get(
        '[data-slot="canvas-relational-tree-inline-editor"]:visible select[aria-label="Direction and nulls 1"]'
      ).should(($select) => expect($select.val()).to.equal(selectedDirection));
      cy.get('[data-operator="fetch"]').should('contain.text', 'LIMIT 100');
      cy.get('[data-slot="canvas-relational-tree-node"][data-operator="sort"]')
        .parent()
        .find('[data-slot="canvas-node-execute"]')
        .focus()
        .click();
      cy.get('[data-slot="canvas-operation-data-preview"] table').should('contain.text', 'C-001');
      cy.then(() => {
        const call = getE2eApiCalls(/\/data-sample/, 'GET').at(-1)!;
        expect(call.url.searchParams.get('relationId')).to.equal(sortId);
        expect(call.url.searchParams.get('semanticPlanSha256')).to.equal(savedDigest);
      });
    });
  }
});
