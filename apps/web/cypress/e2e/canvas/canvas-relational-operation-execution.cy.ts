/** Own the real card gesture boundary: Properties on click, data only on explicit Play. */
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  openWorkbenchModel,
  revisitWorkbenchCanvas,
  visitWorkbenchCanvas,
  connectWorkbenchProducer,
  dragWorkbenchSource,
  stageWorkbenchUnary,
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
  it('explains why a saved detached operation cannot preview without changing the output', () => {
    stubWorkbenchScenario('saved-join');
    cy.viewport(1440, 900);
    visitWorkbenchCanvas();
    openWorkbenchModel();
    dragWorkbenchSource('customers');
    stageWorkbenchUnary('fetch', '[data-pending="true"][data-operator="read"]');
    cy.get('[data-slot="canvas-staged-operation-inspector"] button[type="submit"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
    cy.wrap(null).should(() => expect(semanticWrites('join-transform')).not.to.have.length(0));
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    revisitWorkbenchCanvas();
    openWorkbenchModel();
    const detached = '[data-slot="canvas-relational-tree-node"][data-operator="fetch"]';
    hoverWorkbenchCard(detached);
    cy.get(detached)
      .closest('li')
      .within(() => {
        cy.get('[data-slot="canvas-node-execute"]').should('be.disabled');
        cy.get('[data-slot="canvas-operation-preview-reason"]')
          .should('be.visible')
          .and('contain.text', 'not part of the model’s output plan');
      });
    cy.get(detached).rightclick();
    cy.get('[data-slot="canvas-relational-execute-operation"]').should(
      'have.attr',
      'data-disabled'
    );
    cy.get('body').type('{esc}');
    cy.get(card).closest('li').find('[data-slot="canvas-node-execute"]').should('be.enabled');
    cy.get(detached)
      .invoke('attr', 'data-relation-id')
      .then((relationId) => {
        const write = semanticWrites('join-transform').at(-1);
        if (write === undefined) throw new Error('The saved semantic document is unavailable.');
        const document = decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(write));
        expect(
          document.sidecar.relations.some((relation) => relation.relationId === relationId)
        ).to.equal(false);
        expect(getE2eApiCalls(/\/data-sample/, 'GET')).to.have.length(0);
        expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
      });
  });
  for (const wrapped of [false, true]) {
    it(`opens JOIN properties and explicitly retrieves its own rows (wrapped: ${wrapped})`, () => {
      const draft = stubWorkbenchScenario('saved-join');
      const original = decodeDvtSubstraitSemanticDocument(
        (
          draft.nodes.find((node) => node.id === 'join-transform')!.metadata!
            .transformAuthoring as {
            semanticDocument: unknown;
          }
        ).semanticDocument
      );
      const { index } = deriveSubstraitSchemas(original);
      const originalJoin = index.relations.get(index.rootId)!;
      if (originalJoin.relation.relType.case !== 'join') throw new Error('Expected saved JOIN');
      const originalCondition = originalJoin.relation.relType.value.expression;
      const originalReads = [...index.relations.values()]
        .filter((relation) => relation.relation.relType.case === 'read')
        .map(({ binding, relation }) => ({ relationId: binding.relationId, relation }));
      const originalOutputs = original.sidecar.fields
        .filter((field) => field.relationId === index.rootId && field.parentFieldId == null)
        .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
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
      let writeCount = 0;
      cy.then(() => {
        writeCount = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
      });
      cy.get(card)
        .invoke('attr', 'data-relation-id')
        .then((id) => {
          relationId = id!;
          expect(relationId).to.equal(index.rootId);
        });
      cy.get(card).click();
      cy.get(`${properties} [data-slot="canvas-operation-properties-tab"]`).should(
        'have.attr',
        'data-state',
        'active'
      );
      cy.get(properties).should('not.have.descendants', 'input, select, textarea');
      cy.get(`${properties} [data-slot="canvas-relational-edit"]`)
        .should('be.visible')
        .and('have.attr', 'aria-pressed', 'false');
      cy.get(`${properties} [data-slot="semantic-workbench-join-condition-row"]`).should(
        'be.visible'
      );
      const output = `${properties} [role="tabpanel"][data-value="output"][data-state="active"]`;
      cy.get(`${properties} [data-slot="canvas-operation-output-tab"]`)
        .click()
        .should('have.attr', 'aria-selected', 'true');
      cy.get(output)
        .should('be.visible')
        .and('not.have.descendants', 'input, select, textarea, button, [draggable="true"]');
      cy.get(`${output} [data-slot="canvas-relation-fields"] [data-field-id]`).should((rows) => {
        expect([...rows].map((row) => row.getAttribute('data-field-id'))).to.deep.equal(
          originalOutputs.map((field) => field.fieldId)
        );
        expect([...rows].map((row) => row.querySelector('dt')?.textContent)).to.deep.equal(
          originalOutputs.map((field) => field.displayName)
        );
      });
      cy.then(() => {
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writeCount);
        expect(getE2eApiCalls(/\/data-sample/, 'GET')).to.have.length(0);
        expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
      });
      cy.get(properties)
        .should('have.length', 1)
        .find('[data-slot="canvas-relational-edit"]')
        .should('have.length', 1)
        .and('have.attr', 'aria-pressed', 'false')
        .and('be.visible')
        .and('be.enabled')
        .click();
      cy.get(`${properties} [data-slot="canvas-operation-output-tab"]`).should(
        'have.attr',
        'aria-selected',
        'true'
      );
      const selectedRows = `${output} [data-slot="relation-output-field"]:has([data-slot="relation-output-toggle"][data-included="true"])`;
      cy.get(selectedRows).then((fields) => {
        const ids = [...fields].map((field) => field.getAttribute('data-field-id'));
        expect(ids).to.deep.equal(originalOutputs.map((field) => field.fieldId));
        const expected = [ids[1], ids[0], ...ids.slice(2)];
        cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.visible');
        cy.get(selectedRows)
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
        cy.get(selectedRows).should((ordered) => {
          expect([...ordered].map((field) => field.getAttribute('data-field-id'))).to.deep.equal(
            expected
          );
        });
        cy.then(() =>
          expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writeCount)
        );
        cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
        cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
        cy.wrap(null).should(() =>
          expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writeCount + 1)
        );
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
          const saved = deriveSubstraitSchemas(document).index;
          const savedJoin = saved.relations.get(relationId)!;
          expect(savedJoin.inputs).to.deep.equal(originalJoin.inputs);
          expect(savedJoin.relation.relType.case).to.equal('join');
          if (savedJoin.relation.relType.case !== 'join') throw new Error('Expected saved JOIN');
          expect(savedJoin.relation.relType.value.expression).to.deep.equal(originalCondition);
          expect(
            [...saved.relations.values()]
              .filter((relation) => relation.relation.relType.case === 'read')
              .map(({ binding, relation }) => ({ relationId: binding.relationId, relation }))
          ).to.deep.equal(originalReads);
        });
        cy.get(`${properties} [data-slot="canvas-relational-edit"]`).should(
          'have.attr',
          'aria-pressed',
          'false'
        );
        cy.get(output).should(
          'not.have.descendants',
          'input, select, textarea, button, [draggable="true"]'
        );
        cy.get(`${output} [data-slot="canvas-relation-fields"] [data-field-id]`).should((rows) => {
          expect([...rows].map((row) => row.getAttribute('data-field-id'))).to.deep.equal(expected);
        });
      });
      cy.then(() => {
        expect(getE2eApiCalls(/\/data-sample/, 'GET')).to.have.length(0);
        expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
      });
      cy.get(`${properties} [data-slot="canvas-relational-collapse"]`).click();
      hoverWorkbenchCard(card);
      cy.get(card)
        .parent()
        .find('[data-slot="canvas-node-execute"]')
        .focus()
        .should('be.visible')
        .click();
      cy.get(`${data} table`).should('contain.text', 'C-001');
      cy.get(data).should('not.have.descendants', 'header, h2');
      cy.get(`${data} [data-slot="data-grid-toolbar"] [data-slot="canvas-model-preview"]`).should(
        'be.visible'
      );
      cy.get(`${data} [data-slot="data-sample-summary"]`)
        .parent()
        .find('[data-slot="live-preview-facts"]')
        .should('be.visible');
      cy.get(data)
        .should('have.css', 'min-height', '0px')
        .and('have.css', 'min-width', '0px')
        .and('have.css', 'overflow', 'hidden');
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
