/** Own the real card gesture boundary: Properties on click, data only on explicit Play. */
import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  openWorkbenchModel,
  visitWorkbenchCanvas,
  connectWorkbenchProducer,
} from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import {
  semanticWrites,
  semanticDocumentFromWrite,
  stubSavedWorkbenchSample,
} from '../../support/relationalWorkbench/persistence';
import { hoverWorkbenchCard } from '../../support/relationalWorkbench/pointer';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const card = '[data-slot="canvas-relational-tree-node"][data-operator="join"]';
const properties = '[data-slot="canvas-relational-tree-inline-editor"]:visible';
const data = '[data-slot="canvas-operation-data-preview"]';

describe('Internal operation card execution', () => {
  for (const wrapped of [false, true]) {
    it(`opens JOIN properties and explicitly retrieves its own rows (wrapped: ${wrapped})`, () => {
      stubWorkbenchScenario('saved-join');
      stubSavedWorkbenchSample();
      cy.viewport(1440, 900);
      visitWorkbenchCanvas();
      openWorkbenchModel();
      cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
      cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
      if (wrapped) {
        cy.get(card).closest('li').as('joinInput');
        workbenchOperation('fetch').click();
        cy.get('[data-pending-operation="true"]').last().as('fetch', { type: 'static' });
        cy.get('[data-slot="canvas-relational-output-input-port"]').focus().trigger('keydown', {
          eventConstructor: 'KeyboardEvent',
          key: 'Delete',
        });
        cy.get('[data-slot="canvas-relational-output-input-port"]').should(
          'not.have.attr',
          'data-connected'
        );
        connectWorkbenchProducer('@joinInput', '@fetch');
        cy.get('[data-slot="canvas-staged-operation-inspector"] button[type="submit"]').click();
        connectWorkbenchProducer(
          '@fetch',
          '[data-slot="canvas-relational-output-input-port"]',
          null
        );
        cy.get('[data-slot="canvas-relational-tree-apply"]').click();
        cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
      }
      let relationId = '';
      cy.get(card)
        .invoke('attr', 'data-relation-id')
        .then((id) => {
          relationId = id!;
        });
      cy.get(card).click();
      cy.get(`${properties} [data-slot="canvas-operation-properties-tab"]`).should(
        'have.attr',
        'data-state',
        'active'
      );
      cy.get(properties).should('not.have.descendants', 'input, select, textarea');
      cy.get(`${properties} [data-slot="canvas-relational-edit"]`).should('be.visible');
      cy.get(`${properties} [data-slot="semantic-workbench-join-condition-row"]`).should(
        'be.visible'
      );
      const outputs = `${properties} [data-slot="canvas-relation-outputs"]`;
      cy.get(`${properties} [data-slot="canvas-operation-output-tab"]`).click();
      cy.get(outputs).should('be.visible');
      cy.get(`${outputs} [data-field-id]`).then((fields) => {
        const ids = [...fields].map((field) => field.getAttribute('data-field-id'));
        const expected = [ids[1], ids[0], ...ids.slice(2)];
        cy.get(`${outputs} [data-field-id]`)
          .first()
          .should('have.attr', 'draggable', 'true')
          .focus()
          .then(($row) => {
            const row = $row[0]!;
            const event = new row.ownerDocument.defaultView!.KeyboardEvent('keydown', {
              key: 'ArrowDown',
              code: 'ArrowDown',
              altKey: true,
              bubbles: true,
              cancelable: true,
            });
            row.dispatchEvent(event);
            expect(event.defaultPrevented, 'output reorder handles Alt+ArrowDown').to.equal(true);
          });
        cy.get(`${outputs} [data-field-id]`).should((ordered) => {
          expect([...ordered].map((field) => field.getAttribute('data-field-id'))).to.deep.equal(
            expected
          );
        });
        cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
        cy.wrap(null).should(() => {
          const document = decodeDvtSubstraitSemanticDocument(
            semanticDocumentFromWrite(semanticWrites('join-transform').at(-1)!)
          );
          expect(
            document.sidecar.fields
              .filter((field) => field.relationId === relationId && field.parentFieldId == null)
              .sort((a, b) => a.outputOrdinal - b.outputOrdinal)
              .map((field) => field.fieldId)
          ).to.deep.equal(expected);
        });
      });
      cy.then(() => expect(getE2eApiCalls(/\/data-sample/, 'GET')).to.have.length(0));
      cy.get(`${properties} [data-slot="canvas-relational-collapse"]`).click();
      hoverWorkbenchCard(card);
      cy.get(card)
        .parent()
        .find('[data-slot="canvas-node-execute"]')
        .focus()
        .should('be.visible')
        .click();
      cy.get(`${data} table`).should('contain.text', 'C-001');
      cy.get(data).should(
        'not.have.descendants',
        '[data-slot="canvas-relational-tree-inline-editor"]'
      );
      cy.then(() => {
        const calls = getE2eApiCalls(/\/data-sample/, 'GET');
        expect(calls).to.have.length(1);
        expect(calls[0]!.url.searchParams.get('relationId')).to.equal(relationId);
        expect(calls[0]!.url.searchParams.get('limit')).to.equal('20');
        expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
      });
      cy.get(card).click();
      cy.get(`${properties} [data-slot="canvas-operation-properties-tab"]`).click();
      cy.get(properties).should('not.have.descendants', 'input, select, textarea');
      cy.get(`${data} table`).should('contain.text', 'C-001');
      cy.then(() => expect(getE2eApiCalls(/\/data-sample/, 'GET')).to.have.length(1));
      cy.get(card).rightclick();
      cy.get('[data-slot="canvas-relational-execute-operation"]').click();
      cy.wrap(null).should(() => expect(getE2eApiCalls(/\/data-sample/, 'GET')).to.have.length(2));
      cy.then(() => expect(semanticWrites('join-transform')).not.to.have.length(0));
    });
  }
});
