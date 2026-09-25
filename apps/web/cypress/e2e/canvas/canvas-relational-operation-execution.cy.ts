/** Own the real card gesture boundary: Properties on click, data only on explicit Play. */
import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  openWorkbenchModel,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import {
  semanticWrites,
  semanticDocumentFromWrite,
  stubSavedWorkbenchSample,
} from '../../support/relationalWorkbench/persistence';
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
      waitForE2eApiCall('/workspace/graph/draft', 'PUT');
      if (wrapped) {
        workbenchOperation('fetch').click();
        cy.get('[role="dialog"] button[type="submit"]').click();
        cy.get('[data-slot="canvas-relational-tree-apply"]').click();
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
      cy.get(`${outputs} h3`).should('have.text', 'Output');
      cy.get(`${outputs} [data-field-id]`).then((fields) => {
        const ids = [...fields].map((field) => field.getAttribute('data-field-id'));
        const expected = [ids[1], ids[0], ...ids.slice(2)];
        const count = semanticWrites('join-transform').length;
        cy.get(`${outputs} [data-field-id]`).first().find('button').last().click();
        cy.wrap(null).should(() =>
          expect(semanticWrites('join-transform')).to.have.length(count + 1)
        );
        cy.get(`${outputs} [data-field-id]`).should((ordered) => {
          expect([...ordered].map((field) => field.getAttribute('data-field-id'))).to.deep.equal(
            expected
          );
        });
        cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
        cy.then(() => {
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
