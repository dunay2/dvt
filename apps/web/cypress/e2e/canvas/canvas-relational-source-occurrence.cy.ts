/** Owned concern: repeat and rename a Read through the screen, save, selected query and reopen. */
import {
  decodeDvtSubstraitJoinDocument,
  inspectDvtSubstraitJoinDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitJoinComposition';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  openWorkbenchModel,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import {
  semanticDocumentFromWrite,
  semanticWrites,
  stubSavedWorkbenchSample,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Explicit source occurrences (controlled API boundary)', () => {
  it('persists an independently named Read without duplicating the physical source or querying implicitly', () => {
    stubWorkbenchScenario('saved-join');
    stubSavedWorkbenchSample();
    cy.viewport(1440, 1000);
    visitWorkbenchCanvas();
    openWorkbenchModel();
    let originalReads: string[] = [];
    let selectedFields: string[] = [];
    cy.get('[data-operator="read"]')
      .should('have.length', 2)
      .then(($reads) => {
        originalReads = Array.from($reads, (read) => read.getAttribute('data-relation-id')!);
      });
    cy.get('[data-slot="source-occurrence-add"]').first().click();
    cy.get('[data-slot="canvas-relational-tree-append-input"]').should('be.visible').click();
    cy.get('[data-operator="read"]').should('have.length', 3).last().click();
    cy.get('[data-slot="source-occurrence-alias"]').clear().type('Regional customers');
    cy.get('[data-slot="source-occurrence-update"]').click();
    cy.get('[data-operator="read"]').last().should('contain.text', 'Regional customers');
    cy.get('[data-slot="canvas-relation-fields"] [data-field-id]')
      .should('have.length.greaterThan', 0)
      .then(($fields) => {
        selectedFields = Array.from($fields, (field) => field.getAttribute('data-field-id')!);
        expect(new Set(selectedFields).size).to.equal(selectedFields.length);
      });
    cy.get('[data-slot="canvas-relational-tree-source"]').should('have.length', 2);
    cy.then(() => expect(getE2eApiCalls(/\/data-sample/, 'GET')).to.have.length(0));
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    let appendedId = '';
    cy.wrap(null).should(() => {
      const write = semanticWrites('join-transform').at(-1);
      expect(write).not.to.equal(undefined);
      const draft = decodeDvtSubstraitJoinDocument(semanticDocumentFromWrite(write!));
      const inspection = inspectDvtSubstraitJoinDraft(draft);
      expect(inspection.ok).to.equal(true);
      if (!inspection.ok) throw new Error('Saved occurrence JOIN rejected');
      const inputs = inspection.projection.inputs;
      expect(inputs).to.have.length(3);
      expect(inputs.slice(0, 2).map((input) => input.relationId)).to.deep.equal(originalReads);
      expect(new Set(inputs.map((input) => input.relationId)).size).to.equal(3);
      expect(inputs[2]!.sourceRef).to.deep.equal(inputs[0]!.sourceRef);
      appendedId = inputs[2]!.relationId;
      expect(
        draft.sidecar.fields
          .filter((field) => field.relationId === appendedId && field.parentFieldId == null)
          .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
          .map((field) => field.fieldId)
      ).to.deep.equal(selectedFields);
      expect(
        draft.sidecar.relations.find((binding) => binding.relationId === appendedId)?.displayName
      ).to.equal('Regional customers');
      const { draft: savedGraph } = write!.body as { draft: { edges: { targetId: string }[] } };
      expect(savedGraph.edges.filter((edge) => edge.targetId === 'join-transform')).to.have.length(
        2
      );
    });
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitWorkbenchCanvas();
    openWorkbenchModel();
    cy.get('[data-operator="read"]').should('have.length', 3).last().click();
    cy.get('[data-slot="source-occurrence-alias"]').should('have.value', 'Regional customers');
    cy.get('[data-slot="canvas-relation-fields"] [data-field-id]').should(($fields) => {
      expect(Array.from($fields, (field) => field.getAttribute('data-field-id'))).to.deep.equal(
        selectedFields
      );
    });
    cy.get(
      '[data-slot="canvas-relational-tree-inline-editor"]:visible [data-slot="canvas-relational-collapse"]'
    ).click();
    cy.get('[data-operator="read"]')
      .last()
      .parent()
      .find('[data-slot="canvas-node-execute"]')
      .focus()
      .should('be.visible')
      .click();
    cy.wrap(null).should(() => {
      const sample = getE2eApiCalls(/\/data-sample/, 'GET').at(-1);
      expect(sample).not.to.equal(undefined);
      expect(sample!.url.searchParams.get('relationId')).to.equal(appendedId);
    });
    cy.get('[data-slot="canvas-operation-data-preview"] table').should('contain.text', 'C-001');
  });
});
